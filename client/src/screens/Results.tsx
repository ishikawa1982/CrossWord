import type { GameState } from '@crossword/shared';

interface Props {
  state: GameState;
  playerId: string;
  onLeave: () => void;
}

export function Results({ state, playerId, onLeave }: Props) {
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const winners = state.players.filter((p) => state.winnerIds.includes(p.id));
  const iWon = state.winnerIds.includes(playerId);
  const isDraw = winners.length > 1;

  return (
    <div className="screen results">
      <h1>{isDraw ? '引き分け！' : '結果発表'}</h1>
      <p className="winner-banner">
        {isDraw
          ? `引き分け：${winners.map((w) => w.name).join('・')}`
          : winners.length === 1
            ? `勝者：${winners[0].name}`
            : '勝者なし'}
        {iWon && ' 🎉 あなたの勝ち！'}
      </p>

      <ol className="final-scores">
        {sorted.map((p, i) => (
          <li key={p.id} className={p.id === playerId ? 'me' : ''}>
            <span className="rank">{i + 1}</span>
            <span className="swatch" style={{ background: p.color }} />
            <span className="name">{p.name}</span>
            <span className="count">{p.score} マス</span>
          </li>
        ))}
      </ol>

      <button className="primary" onClick={onLeave}>
        ホームに戻る
      </button>
    </div>
  );
}
