import { useMemo } from 'react';
import type { Player, Puzzle } from '@crossword/shared';

interface Props {
  puzzle: Puzzle;
  players: Player[];
  selectedWordId: string | null;
  onSelect: (wordId: string) => void;
}

const keyOf = (r: number, c: number) => `${r},${c}`;

export function ClueList({ puzzle, players, selectedWordId, onSelect }: Props) {
  const colorById = useMemo(() => new Map(players.map((p) => [p.id, p.color])), [players]);
  const cellByKey = useMemo(
    () => new Map(puzzle.cells.map((cell) => [keyOf(cell.row, cell.col), cell])),
    [puzzle]
  );

  // 単語が「全マス同一プレイヤー所有」なら、その色を表示（誰が取ったか目安）
  const wordOwnerColor = (wordId: string): string | undefined => {
    const w = puzzle.words.find((x) => x.id === wordId);
    if (!w) return undefined;
    const dr = w.direction === 'down' ? 1 : 0;
    const dc = w.direction === 'across' ? 1 : 0;
    let owner: string | null | undefined;
    for (let i = 0; i < w.length; i++) {
      const cell = cellByKey.get(keyOf(w.row + dr * i, w.col + dc * i));
      if (!cell || cell.owner === null) return undefined;
      if (owner === undefined) owner = cell.owner;
      else if (owner !== cell.owner) return undefined;
    }
    return owner ? colorById.get(owner) : undefined;
  };

  const across = puzzle.words.filter((w) => w.direction === 'across').sort((a, b) => a.number - b.number);
  const down = puzzle.words.filter((w) => w.direction === 'down').sort((a, b) => a.number - b.number);

  const renderGroup = (title: string, words: typeof across) => (
    <div className="clue-group">
      <h4>{title}</h4>
      <ul>
        {words.map((w) => {
          const c = wordOwnerColor(w.id);
          return (
            <li
              key={w.id}
              className={w.id === selectedWordId ? 'selected' : ''}
              onClick={() => onSelect(w.id)}
            >
              <span className="num">{w.number}.</span>
              <span className="text">{w.clue}（{w.length}文字）</span>
              {c && <span className="owner-dot" style={{ background: c }} />}
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div className="clue-list">
      {renderGroup('ヨコのカギ', across)}
      {renderGroup('タテのカギ', down)}
    </div>
  );
}
