import { GENRES, type GameState, type Genre } from '@crossword/shared';

interface Props {
  state: GameState;
  playerId: string;
  onStart: () => void;
  onSetGenre: (genre: Genre) => void;
  onLeave: () => void;
  error: string | null;
}

export function Lobby({ state, playerId, onStart, onSetGenre, onLeave, error }: Props) {
  const me = state.players.find((p) => p.id === playerId);
  const isHost = me?.isHost ?? false;
  const currentGenre = GENRES.find((g) => g.id === state.genre);

  return (
    <div className="screen lobby">
      <h1>待機ルーム</h1>
      <div className="room-code">
        ルームコード： <strong>{state.roomCode}</strong>
        <button className="ghost" onClick={() => navigator.clipboard?.writeText(state.roomCode)}>
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

      {state.language === 'ja' && (
        <div className="genre-section">
          <h2>ジャンル</h2>
          {isHost ? (
            <div className="genre-grid">
              {GENRES.map((g) => (
                <button
                  key={g.id}
                  className={`genre-btn${state.genre === g.id ? ' selected' : ''}`}
                  onClick={() => onSetGenre(g.id)}
                >
                  <span className="genre-label">{g.label}</span>
                  <span className="genre-desc">{g.desc}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="hint">
              ジャンル：<strong>{currentGenre?.label}</strong>（ホストが選択します）
            </p>
          )}
        </div>
      )}

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
