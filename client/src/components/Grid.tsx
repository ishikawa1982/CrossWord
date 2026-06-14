import { useMemo } from 'react';
import type { Player, Puzzle } from '@crossword/shared';

interface Props {
  puzzle: Puzzle;
  players: Player[];
  selectedWordId: string | null;
  onSelectCell: (row: number, col: number) => void;
}

const keyOf = (r: number, c: number) => `${r},${c}`;

export function Grid({ puzzle, players, selectedWordId, onSelectCell }: Props) {
  const colorById = useMemo(
    () => new Map(players.map((p) => [p.id, p.color])),
    [players]
  );
  const cellByKey = useMemo(
    () => new Map(puzzle.cells.map((cell) => [keyOf(cell.row, cell.col), cell])),
    [puzzle]
  );

  // 選択中の単語が通るマス
  const highlighted = useMemo(() => {
    const set = new Set<string>();
    const word = puzzle.words.find((w) => w.id === selectedWordId);
    if (word) {
      const dr = word.direction === 'down' ? 1 : 0;
      const dc = word.direction === 'across' ? 1 : 0;
      for (let i = 0; i < word.length; i++) {
        set.add(keyOf(word.row + dr * i, word.col + dc * i));
      }
    }
    return set;
  }, [puzzle, selectedWordId]);

  const rows = [];
  for (let r = 0; r < puzzle.height; r++) {
    const cols = [];
    for (let c = 0; c < puzzle.width; c++) {
      const cell = cellByKey.get(keyOf(r, c));
      if (!cell) {
        cols.push(<div key={c} className="cell blank" />);
        continue;
      }
      const owner = cell.owner ? colorById.get(cell.owner) : undefined;
      const isHi = highlighted.has(keyOf(r, c));
      // owner なし・solution ありはヒント公開済みセル
      const isHint = !cell.owner && !!cell.solution;
      cols.push(
        <div
          key={c}
          className={`cell filled${isHi ? ' highlight' : ''}`}
          style={owner ? { background: owner, color: '#fff' } : undefined}
          onClick={() => onSelectCell(r, c)}
        >
          {cell.number && <span className="cell-number">{cell.number}</span>}
          {cell.solution && (
            <span className={`cell-letter${isHint ? ' hint' : ''}`}>
              {cell.solution}
            </span>
          )}
        </div>
      );
    }
    rows.push(
      <div key={r} className="grid-row">
        {cols}
      </div>
    );
  }

  return <div className="grid">{rows}</div>;
}
