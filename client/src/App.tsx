import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnswerResult, GameState } from '@crossword/shared';
import { socket } from './socket.js';
import { Home } from './screens/Home.js';
import { Lobby } from './screens/Lobby.js';
import { Game } from './screens/Game.js';
import { Results } from './screens/Results.js';

export function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AnswerResult | null>(null);
  const playerIdRef = useRef<string | null>(null);

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

  if (!state || !playerId) {
    return <Home onCreate={handleCreate} onJoin={handleJoin} error={error} />;
  }
  if (state.status === 'lobby') {
    return <Lobby state={state} playerId={playerId} onStart={handleStart} onLeave={handleLeave} error={error} />;
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
