// ルーム管理：インメモリでルーム状態を保持する（サーバ権威）
import {
  PLAYER_COLORS,
  type GameState,
  type Genre,
  type Language,
  type Player,
  type Puzzle,
} from '@crossword/shared';

const MAX_PLAYERS = 4;

export interface Room {
  code: string;
  language: Language;
  genre: Genre;
  status: 'lobby' | 'playing' | 'finished';
  players: Player[];
  /** 解答付きの内部 Puzzle（クライアントには配信しない） */
  puzzle: Puzzle | null;
  winnerIds: string[];
  /** playerId -> 誤答クールダウン期限（epoch ms） */
  cooldownUntil: Map<string, number>;
  /** socket.id -> playerId */
  socketToPlayer: Map<string, string>;
  /** 先着正解済みの単語 ID（2回目以降の解答を拒否するため） */
  solvedWordIds: Set<string>;
}

const rooms = new Map<string, Room>();

// ルームコード用の2文字ひらがな単語（意味のある組み合わせを作る）
const ROOM_CODE_WORDS = [
  'あさ', 'あめ', 'いぬ', 'いろ', 'うみ', 'うし', 'おり', 'かに', 'かぶ',
  'かみ', 'くま', 'こい', 'さる', 'しか', 'すい', 'そら', 'たい', 'たこ',
  'たぬ', 'ちい', 'つき', 'とり', 'なす', 'ねこ', 'ぬま', 'のり', 'はな',
  'へび', 'ほし', 'まぐ', 'ます', 'みず', 'むし', 'もも', 'やぎ', 'やま',
  'ゆり', 'よこ', 'よる', 'りす', 'ろば', 'わに', 'めだ', 'べに', 'ぶた'
];

// ルームコード用のひらがな（サーバの CODE_CHARS と一致させる）
const CODE_CHARS = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろ';

function generateCode(): string {
  let code: string;
  do {
    const w1 = ROOM_CODE_WORDS[Math.floor(Math.random() * ROOM_CODE_WORDS.length)];
    const w2 = ROOM_CODE_WORDS[Math.floor(Math.random() * ROOM_CODE_WORDS.length)];
    code = w1 + w2;
  } while (rooms.has(code));
  return code;
}

export function createRoom(language: Language): Room {
  const room: Room = {
    code: generateCode(),
    language,
    genre: 'random',
    status: 'lobby',
    players: [],
    puzzle: null,
    winnerIds: [],
    cooldownUntil: new Map(),
    socketToPlayer: new Map(),
    solvedWordIds: new Set(),
  };
  rooms.set(room.code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.trim());
}

export function addPlayer(
  room: Room,
  socketId: string,
  playerId: string,
  name: string
): Player | { error: string } {
  if (room.players.length >= MAX_PLAYERS) return { error: '満員です（最大4名）' };
  if (room.status !== 'lobby') return { error: 'ゲームは既に開始しています' };
  const color = PLAYER_COLORS[room.players.length];
  const player: Player = {
    id: playerId,
    name: name.trim().slice(0, 4) || `P${room.players.length + 1}`,
    color,
    score: 0,
    isHost: room.players.length === 0,
    connected: true,
  };
  room.players.push(player);
  room.socketToPlayer.set(socketId, playerId);
  return player;
}

/** socket 切断時の処理。空室になったら削除して true を返す */
export function handleDisconnect(room: Room, socketId: string): { removed: boolean; empty: boolean } {
  const playerId = room.socketToPlayer.get(socketId);
  if (!playerId) return { removed: false, empty: room.players.length === 0 };
  room.socketToPlayer.delete(socketId);

  if (room.status === 'lobby') {
    // ロビーでは離脱者を完全に除去
    room.players = room.players.filter((p) => p.id !== playerId);
    // ホストが抜けたら次の人へ移譲
    if (room.players.length > 0 && !room.players.some((p) => p.isHost)) {
      room.players[0].isHost = true;
    }
  } else {
    // 対戦中は接続フラグのみ落とす（マスの色は保持）
    const p = room.players.find((x) => x.id === playerId);
    if (p) p.connected = false;
  }

  const empty = room.players.length === 0 || room.players.every((p) => !p.connected);
  if (empty) rooms.delete(room.code);
  return { removed: true, empty };
}

export function deleteRoom(code: string): void {
  rooms.delete(code);
}

/** クライアント配信用の GameState を作る（解答情報を含めない） */
export function toGameState(room: Room, strippedPuzzle: Puzzle | null): GameState {
  return {
    roomCode: room.code,
    status: room.status,
    language: room.language,
    genre: room.genre,
    players: room.players,
    puzzle: strippedPuzzle,
    winnerIds: room.winnerIds,
    solvedWordIds: [...room.solvedWordIds],
  };
}
