import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnswerResult, GameState, Genre, Language } from '@crossword/shared';
import { socket } from './socket.js';
import React from 'react';
import { Home } from './screens/Home.js';
import { Lobby } from './screens/Lobby.js';
import { Game } from './screens/Game.js';
import { Results } from './screens/Results.js';
import { SoloResults } from './screens/SoloResults.js';
import { useSoloGame, type SoloDifficulty } from './useSoloGame.js';

export function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AnswerResult | null>(null);
  const [connected, setConnected] = useState(false);
  const playerIdRef = useRef<string | null>(null);
  // ゲーム終了後はリザルトを表示し続ける（再戦/ホームを押すまでサーバ状態に追従しない）
  const [showResults, setShowResults] = useState(false);
  const solo = useSoloGame();
  const [soloConfig, setSoloConfig] = useState<{ language: Language; difficulty: SoloDifficulty } | null>(null);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) setConnected(true);
    return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); };
  }, []);

  useEffect(() => {
    const onRoom = (s: GameState) => setState(s);
    const onGame = (s: GameState) => setState(s);
    const onOver = (s: GameState) => {
      setState(s);
      setShowResults(true);
    };
    const onAnswer = (r: AnswerResult) => setLastResult(r);
    const onError = (e: { message: string }) => setError(e.message);

    socket.on('roomUpdate', onRoom);
    socket.on('gameUpdate', onGame);
    socket.on('gameOver', onOver);
    socket.on('answerResult', onAnswer);
    socket.on('errorMessage', onError);
    return () => {
      socket.off('roomUpdate', onRoom);
      socket.off('gameUpdate', onGame);
      socket.off('gameOver', onOver);
      socket.off('answerResult', onAnswer);
      socket.off('errorMessage', onError);
    };
  }, []);

  const handleCreate = useCallback((name: string, language: 'ja' | 'en') => {
    setError(null);
    socket.emit('createRoom', { name, language }, (res) => {
      if (res.ok && res.playerId) {
        playerIdRef.current = res.playerId;
        setPlayerId(res.playerId);
      } else {
        setError(res.message ?? '部屋の作成に失敗しました');
      }
    });
  }, []);

  const handleJoin = useCallback((code: string, name: string) => {
    setError(null);
    socket.emit('joinRoom', { code, name }, (res) => {
      if (res.ok && res.playerId) {
        playerIdRef.current = res.playerId;
        setPlayerId(res.playerId);
      } else {
        setError(res.message ?? '参加に失敗しました');
      }
    });
  }, []);

  const handleSolo = useCallback(
    (language: Language, difficulty: SoloDifficulty) => {
      setError(null);
      if (solo.start(language, difficulty)) {
        setSoloConfig({ language, difficulty });
      } else {
        setError('盤面の生成に失敗しました。もう一度お試しください');
      }
    },
    [solo]
  );

  const handleSoloPlayAgain = useCallback(() => {
    if (soloConfig) solo.start(soloConfig.language, soloConfig.difficulty);
  }, [solo, soloConfig]);

  const handleSetGenre = useCallback((genre: Genre) => socket.emit('setGenre', genre), []);
  const handleStart = useCallback(() => socket.emit('startGame'), []);
  const handleSubmit = useCallback((wordId: string, guess: string) => {
    socket.emit('submitAnswer', { wordId, guess });
  }, []);
  const handleLeave = useCallback(() => {
    socket.emit('leaveRoom');
    setState(null);
    setPlayerId(null);
    playerIdRef.current = null;
    setShowResults(false);
  }, []);
  // 再戦：同じ部屋を待機状態に戻し、ロビーへ遷移する
  const handleRematch = useCallback(() => {
    socket.emit('rematch');
    setShowResults(false);
  }, []);

  // カウントダウン（全員に表示）
  const [countdown, setCountdown] = useState<number | null>(null);
  useEffect(() => {
    const onCountdown = (n: number) => setCountdown(n);
    socket.on('countdown', onCountdown);
    return () => { socket.off('countdown', onCountdown); };
  }, []);
  // ゲーム開始（gameUpdate）が来たらカウントダウンとリザルト表示をクリア
  useEffect(() => {
    if (state?.status === 'playing') {
      setCountdown(null);
      setShowResults(false);
    }
  }, [state?.status]);

  // 表示する画面を決定
  let screen: React.ReactNode;
  if (solo.state) {
    if (solo.state.status === 'finished' && solo.stats) {
      screen = (
        <SoloResults
          stats={solo.stats}
          totalWords={solo.state.puzzle?.words.length ?? 0}
          onPlayAgain={handleSoloPlayAgain}
          onExit={solo.exit}
        />
      );
    } else {
      screen = (
        <Game
          state={solo.state}
          playerId="solo"
          lastResult={solo.lastResult}
          onSubmit={solo.submit}
          onLeave={solo.exit}
          solo={solo.stats ? { startedAt: solo.stats.startedAt, mistakes: solo.stats.mistakes } : undefined}
        />
      );
    }
  } else if (!state || !playerId) {
    screen = (
      <Home
        onCreate={handleCreate}
        onJoin={handleJoin}
        onSolo={handleSolo}
        error={error}
        connected={connected}
      />
    );
  } else if (state.status === 'finished' || showResults) {
    // リザルト表示中は、サーバが待機状態に戻っても再戦/ホームを押すまで結果を見せ続ける
    screen = (
      <Results
        state={state}
        playerId={playerId}
        onRematch={handleRematch}
        onLeave={handleLeave}
      />
    );
  } else if (state.status === 'lobby') {
    screen = (
      <Lobby
        state={state}
        playerId={playerId}
        onStart={handleStart}
        onSetGenre={handleSetGenre}
        onLeave={handleLeave}
        error={error}
      />
    );
  } else {
    screen = (
      <Game
        state={state}
        playerId={playerId}
        lastResult={lastResult}
        onSubmit={handleSubmit}
        onLeave={handleLeave}
      />
    );
  }

  return (
    <>
      {screen}
      {countdown !== null && (
        <div className="countdown-overlay">
          <div className="countdown-number" key={countdown}>{countdown}</div>
        </div>
      )}
    </>
  );
}
