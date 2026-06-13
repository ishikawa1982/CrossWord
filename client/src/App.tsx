import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnswerResult, GameState, Genre, Language } from '@crossword/shared';
import { socket } from './socket.js';
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
    const onOver = (s: GameState) => setState(s);
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
  }, []);

  // 一人用モード（クライアント完結。オンライン状態より優先）
  if (solo.state) {
    if (solo.state.status === 'finished' && solo.stats) {
      return (
        <SoloResults
          stats={solo.stats}
          totalWords={solo.state.puzzle?.words.length ?? 0}
          onPlayAgain={handleSoloPlayAgain}
          onExit={solo.exit}
        />
      );
    }
    return (
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

  if (!state || !playerId) {
    return (
      <Home
        onCreate={handleCreate}
        onJoin={handleJoin}
        onSolo={handleSolo}
        error={error}
        connected={connected}
      />
    );
  }
  if (state.status === 'lobby') {
    return (
      <Lobby
        state={state}
        playerId={playerId}
        onStart={handleStart}
        onSetGenre={handleSetGenre}
        onLeave={handleLeave}
        error={error}
      />
    );
  }
  if (state.status === 'finished') {
    return <Results state={state} playerId={playerId} onLeave={handleLeave} />;
  }
  return (
    <Game
      state={state}
      playerId={playerId}
      lastResult={lastResult}
      onSubmit={handleSubmit}
      onLeave={handleLeave}
    />
  );
}
