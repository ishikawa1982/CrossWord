import type { GameState } from '@crossword/shared';

interface Props {
  state: GameState;
  playerId: string;
  onStart: () => void;
  onLeave: () => void;
  error: string | null;
}

export function Lobby({ state, playerId, onStart, onLeave, error }: Props) {
  const me = state.players.find((p) => p.id === playerId);
  const isHost = me?.isHost ?? false;

  return (
    <div className="screen lobby">
      <h1>待機ルーム</h1>
      <div className="room-code">
        ルームコード： <strong>{state.roomCode}</strong>
        <button
          className="ghost"
          onClick={() => navigator.clipboard?.writeText(state.roomCode)}
        >
          コピー
        </button>
      </div>
      <p className="hint">このコードを友達に共有して参加してもらいましょう（最大4人）。</p>

      <ul className="player-list">
        {state.players.map((p) => (
          <li key={p.id}>
            <span className="swatch" style={{ background: p.color }} />
            {p.name}
            {p.isHost && <span className="badge">ホスト</span>}
            {p.id === playerId && <span className="badge you">あなた</span>}
          </li>
        ))}
      </ul>

      <div className="actions">
        {isHost ? (
          <button className="primary" disabled={state.players.length < 1} onClick={onStart}>
            ゲーム開始
          </button>
        ) : (
          <p className="hint">ホストの開始を待っています…</p>
        )}
        <button className="ghost" onClick={onLeave}>
          退出
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
