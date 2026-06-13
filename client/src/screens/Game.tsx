import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnswerResult, GameState } from '@crossword/shared';
import { Grid } from '../components/Grid.js';
import { ClueList } from '../components/ClueList.js';
import { Scoreboard } from '../components/Scoreboard.js';
import { AnswerInput } from '../components/AnswerInput.js';
import { formatDuration } from './SoloResults.js';
import bgmUrl from '../assets/bgm.mp3';

interface SoloInfo {
  startedAt: number;
  mistakes: number;
}

interface Props {
  state: GameState;
  playerId: string;
  lastResult: AnswerResult | null;
  onSubmit: (wordId: string, guess: string) => void;
  onLeave: () => void;
  /** 一人用モードの統計（指定時はヘッダーをソロ表示に切替） */
  solo?: SoloInfo;
}

const keyOf = (r: number, c: number) => `${r},${c}`;

export function Game({ state, playerId, lastResult, onSubmit, onLeave, solo }: Props) {
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const puzzle = state.puzzle!;

  // ゲーム中はBGMをループ再生。画面を離れる（終了・退出）と停止。
  // ブラウザの自動再生制限で弾かれた場合は、最初の操作で再生を試みる。
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const audio = new Audio(bgmUrl);
    audio.loop = true;
    audio.volume = 0.35;
    bgmRef.current = audio;
    const tryPlay = () => audio.play().catch(() => {});
    tryPlay();
    // 自動再生が拒否された場合に備え、最初のユーザー操作で再生
    const onInteract = () => {
      tryPlay();
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('keydown', onInteract);
    };
    window.addEventListener('pointerdown', onInteract);
    window.addEventListener('keydown', onInteract);
    return () => {
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('keydown', onInteract);
      audio.pause();
      audio.currentTime = 0;
      bgmRef.current = null;
    };
  }, []);

  // 一人用モードの経過時間を毎秒更新
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!solo) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [solo]);
  const remainingCells = useMemo(
    () => puzzle.cells.filter((cell) => cell.owner === null).length,
    [puzzle]
  );

  const selectedWord = useMemo(
    () => puzzle.words.find((w) => w.id === selectedWordId) ?? null,
    [puzzle, selectedWordId]
  );

  // 回答したら入力パネルを隠す（選択解除）。キーボードも閉じる。
  const handleSubmit = (guess: string) => {
    if (!selectedWord) return;
    onSubmit(selectedWord.id, guess);
    setSelectedWordId(null);
    (document.activeElement as HTMLElement | null)?.blur();
  };

  // マスをクリック：そのマスを通る単語を選択（選択中の単語の別方向があれば切替）
  const selectCell = (row: number, col: number) => {
    const through = puzzle.words.filter((w) => {
      const dr = w.direction === 'down' ? 1 : 0;
      const dc = w.direction === 'across' ? 1 : 0;
      for (let i = 0; i < w.length; i++) {
        if (keyOf(w.row + dr * i, w.col + dc * i) === keyOf(row, col)) return true;
      }
      return false;
    });
    if (through.length === 0) return;
    const currentIdx = through.findIndex((w) => w.id === selectedWordId);
    const next = through[(currentIdx + 1) % through.length];
    setSelectedWordId(next.id);
  };

  return (
    <div className="screen game">
      <header className="game-header">
        {solo ? (
          <span className="solo-stats">
            ⏱ {formatDuration(now - solo.startedAt)} ・ 残り {remainingCells} マス ・ ミス{' '}
            {solo.mistakes} 回
          </span>
        ) : (
          <span className="room-code small">ルーム {state.roomCode}</span>
        )}
        <button className="ghost" onClick={onLeave}>
          {solo ? 'やめる' : '退出'}
        </button>
      </header>

      <div className="game-body">
        <div className="board-row">
          <div className="board-area">
            <Grid
              puzzle={puzzle}
              players={state.players}
              selectedWordId={selectedWordId}
              onSelectCell={selectCell}
            />
          </div>
          <Scoreboard players={state.players} playerId={playerId} />
        </div>

        <ClueList
          puzzle={puzzle}
          players={state.players}
          selectedWordId={selectedWordId}
          onSelect={setSelectedWordId}
        />
      </div>

      {selectedWord && (
        <div className="answer-dock">
          <AnswerInput word={selectedWord} lastResult={lastResult} onSubmit={handleSubmit} />
        </div>
      )}
    </div>
  );
}
