// エントリポイント：Express + Socket.IO サーバ
import { createServer } from 'http';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import {
  applyOwnership,
  computeScores,
  generatePuzzle,
  getWinners,
  getWords,
  isComplete,
  stripSolution,
  validateAnswer,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@crossword/shared';
import {
  addPlayer,
  createRoom,
  getRoom,
  handleDisconnect,
  toGameState,
  type Room,
} from './rooms.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT ?? 3001);
const COOLDOWN_MS = 5000; // 誤答時のクールダウン
const TARGET_WORDS = 10;

const app = express();
app.use(cors());
app.get('/health', (_req, res) => res.json({ ok: true }));

// ビルド済みクライアント（client/dist）があれば同一オリジンで配信する。
// これにより Render など1つのサービスで画面＋通信をまとめて動かせる。
const clientDist = join(__dirname, '..', '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA フォールバック（socket.io / health 以外は index.html を返す）
  app.get(/^(?!\/(socket\.io|health)).*/, (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
  console.log(`Serving client from ${clientDist}`);
}

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
});

let playerSeq = 0;
function nextPlayerId(): string {
  playerSeq += 1;
  return `p${playerSeq}_${Math.random().toString(36).slice(2, 8)}`;
}

/** ルームの全員へ最新状態を配信（解答を除いた盤面） */
function broadcastState(room: Room, event: 'roomUpdate' | 'gameUpdate' | 'gameOver') {
  const stripped = room.puzzle ? stripSolution(room.puzzle, room.hintedCells) : null;
  io.to(room.code).emit(event, toGameState(room, stripped));
}

/** 60秒後に開始し10秒ごとに未解答マスを1つずつヒント公開する */
function startHintTimer(room: Room): void {
  const reveal = () => {
    if (!room.puzzle || room.status !== 'playing') return;
    const candidates = room.puzzle.cells.filter(
      (c) => c.owner === null && !room.hintedCells.has(`${c.row},${c.col}`)
    );
    if (candidates.length === 0) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    room.hintedCells.add(`${pick.row},${pick.col}`);
    broadcastState(room, 'gameUpdate');
    room.hintTimer = setTimeout(reveal, 10_000);
  };
  room.hintTimer = setTimeout(reveal, 60_000);
}

function clearHintTimer(room: Room): void {
  if (room.hintTimer !== null) {
    clearTimeout(room.hintTimer);
    room.hintTimer = null;
  }
}

io.on('connection', (socket) => {
  socket.on('createRoom', (payload, ack) => {
    const lang = payload.language === 'ja' ? 'ja' : 'en';
    const room = createRoom(lang);
    const playerId = nextPlayerId();
    const result = addPlayer(room, socket.id, playerId, payload.name);
    if ('error' in result) {
      ack({ ok: false, message: result.error });
      return;
    }
    socket.join(room.code);
    ack({ ok: true, code: room.code, playerId });
    broadcastState(room, 'roomUpdate');
  });

  socket.on('joinRoom', (payload, ack) => {
    const room = getRoom(payload.code);
    if (!room) {
      ack({ ok: false, message: 'ルームが見つかりません' });
      return;
    }
    const playerId = nextPlayerId();
    const result = addPlayer(room, socket.id, playerId, payload.name);
    if ('error' in result) {
      ack({ ok: false, message: result.error });
      return;
    }
    socket.join(room.code);
    ack({ ok: true, playerId });
    broadcastState(room, 'roomUpdate');
  });

  socket.on('startGame', () => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;
    const playerId = room.socketToPlayer.get(socket.id);
    const host = room.players.find((p) => p.isHost);
    if (!host || host.id !== playerId) {
      socket.emit('errorMessage', { message: 'ホストのみ開始できます' });
      return;
    }
    if (room.status !== 'lobby' || room.countingDown) return;

    room.countingDown = true;

    // 5→1 カウントダウンを1秒ごとに全員へ配信、終了後にゲーム生成
    let count = 5;
    const tick = () => {
      io.to(room.code).emit('countdown', count);
      if (count > 1) {
        count--;
        setTimeout(tick, 1000);
      } else {
        // 最後の "1" から1秒後にゲームスタート
        setTimeout(() => {
          room.countingDown = false;
          const source = getWords(room.language, room.genre);
          room.puzzle = generatePuzzle(source, room.language, { targetWords: TARGET_WORDS });
          if (room.puzzle.words.length < 2) {
            socket.emit('errorMessage', { message: '盤面の生成に失敗しました。もう一度お試しください' });
            room.puzzle = null;
            return;
          }
          room.status = 'playing';
          room.winnerIds = [];
          room.cooldownUntil.clear();
          room.solvedWordIds.clear();
          room.hintedCells.clear();
          clearHintTimer(room);
          startHintTimer(room);
          computeScores(room.puzzle, room.players);
          broadcastState(room, 'gameUpdate');
        }, 1000);
      }
    };
    tick();
  });

  socket.on('submitAnswer', (payload) => {
    const room = findRoomBySocket(socket.id);
    if (!room || room.status !== 'playing' || !room.puzzle) return;
    const playerId = room.socketToPlayer.get(socket.id);
    if (!playerId) return;

    // 解答済みの単語は2回目以降の解答を拒否（クールダウンなし）
    if (room.solvedWordIds.has(payload.wordId)) {
      socket.emit('answerResult', { wordId: payload.wordId, correct: false, alreadySolved: true });
      return;
    }

    const now = Date.now();
    const until = room.cooldownUntil.get(playerId) ?? 0;
    if (now < until) {
      socket.emit('answerResult', { wordId: payload.wordId, correct: false, cooldownUntil: until });
      return;
    }

    const correct = validateAnswer(room.puzzle, payload.wordId, payload.guess, room.language);
    if (!correct) {
      const cooldownUntil = now + COOLDOWN_MS;
      room.cooldownUntil.set(playerId, cooldownUntil);
      socket.emit('answerResult', { wordId: payload.wordId, correct: false, cooldownUntil });
      return;
    }

    // 正解：単語を解答済みに登録し、全マスを自分の色に
    room.solvedWordIds.add(payload.wordId);
    applyOwnership(room.puzzle, payload.wordId, playerId);
    computeScores(room.puzzle, room.players);
    socket.emit('answerResult', { wordId: payload.wordId, correct: true });

    if (isComplete(room.puzzle)) {
      room.status = 'finished';
      room.winnerIds = getWinners(room.players);
      clearHintTimer(room);
      broadcastState(room, 'gameOver');
    } else {
      broadcastState(room, 'gameUpdate');
    }
  });

  socket.on('setGenre', (genre) => {
    const room = findRoomBySocket(socket.id);
    if (!room || room.status !== 'lobby') return;
    const playerId = room.socketToPlayer.get(socket.id);
    const host = room.players.find((p) => p.isHost);
    if (!host || host.id !== playerId) return; // ホストのみ変更可
    room.genre = genre;
    broadcastState(room, 'roomUpdate');
  });

  socket.on('leaveRoom', () => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;
    socket.leave(room.code);
    const { empty } = handleDisconnect(room, socket.id);
    if (empty) { clearHintTimer(room); return; }
    broadcastState(room, room.status === 'playing' ? 'gameUpdate' : 'roomUpdate');
  });

  socket.on('disconnect', () => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;
    const { empty } = handleDisconnect(room, socket.id);
    if (empty) { clearHintTimer(room); return; }
    broadcastState(room, room.status === 'playing' ? 'gameUpdate' : 'roomUpdate');
  });
});

/** socket.id からそのソケットが属するルームを探す */
function findRoomBySocket(socketId: string): Room | undefined {
  for (const roomCode of io.sockets.adapter.sids.get(socketId) ?? []) {
    const room = getRoom(roomCode);
    if (room) return room;
  }
  return undefined;
}

httpServer.listen(PORT, () => {
  console.log(`Crossword server listening on http://localhost:${PORT}`);
});
