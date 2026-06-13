import type { Player } from '@crossword/shared';

interface Props {
  players: Player[];
  playerId: string;
}

export function Scoreboard({ players, playerId }: Props) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <div className="scoreboard">
      <ul>
        {sorted.map((p) => (
          <li key={p.id} className={p.id === playerId ? 'me' : ''}>
            <span className="swatch" style={{ background: p.color }} />
            <span className="name">
              {p.name}
              {!p.connected && '（切断）'}
            </span>
            <span className="count">{p.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
