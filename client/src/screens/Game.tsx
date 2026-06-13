import { useMemo, useState } from 'react';
import type { AnswerResult, GameState } from '@crossword/shared';
import { Grid } from '../components/Grid.js';
import { ClueList } from '../components/ClueList.js';
import { Scoreboard } from '../components/Scoreboard.js';
import { AnswerInput } from '../components/AnswerInput.js';

interface Props {
  state: GameState;
  playerId: string;
  lastResult: AnswerResult | null;
  onSubmit: (wordId: string, guess: string) => void;
  onLeave: () => void;
}

const keyOf = (r: number, c: number) => `${r},${c}`;

export function Game({ state, playerId, lastResult, onSubmit, onLeave }: Props) {
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const puzzle = state.puzzle!;

  const selectedWord = useMemo(
    () => puzzle.words.find((w) => w.id === selectedWordId) ?? null,
    [puzzle, selectedWordId]
  );

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
        <span className="room-code small">ルーム {state.roomCode}</span>
        <button className="ghost" onClick={onLeave}>
          退出
        </button>
      </header>

      <div className="game-body">
        <div className="board-area">
          <Grid
            puzzle={puzzle}
            players={state.players}
            selectedWordId={selectedWordId}
            onSelectCell={selectCell}
          />
          <AnswerInput
            word={selectedWord}
            lastResult={lastResult}
            onSubmit={(guess) => selectedWord && onSubmit(selectedWord.id, guess)}
          />
        </div>

        <aside className="side-panel">
          <Scoreboard players={state.players} playerId={playerId} />
          <ClueList
            puzzle={puzzle}
            players={state.players}
            selectedWordId={selectedWordId}
            onSelect={setSelectedWordId}
          />
        </aside>
      </div>
    </div>
  );
}
