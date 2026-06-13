import type { SoloStats } from '../useSoloGame.js';

interface Props {
  stats: SoloStats;
  /** 盤面の総単語数 */
  totalWords: number;
  onPlayAgain: () => void;
  onExit: () => void;
}

/** 経過時間を mm:ss 形式に整形 */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SoloResults({ stats, totalWords, onPlayAgain, onExit }: Props) {
  const elapsed = (stats.finishedAt ?? Date.now()) - stats.startedAt;
  const accuracy =
    stats.solvedWords + stats.mistakes > 0
      ? Math.round((stats.solvedWords / (stats.solvedWords + stats.mistakes)) * 100)
      : 100;

  return (
    <div className="screen results">
      <h1>クリア！ 🎉</h1>
      <p className="winner-banner">すべてのマスを埋めました！</p>

      <ul className="solo-stat-list">
        <li>
          <span className="label">タイム</span>
          <span className="value">{formatDuration(elapsed)}</span>
        </li>
        <li>
          <span className="label">単語数</span>
          <span className="value">{totalWords} 語</span>
        </li>
        <li>
          <span className="label">ミス</span>
          <span className="value">{stats.mistakes} 回</span>
        </li>
        <li>
          <span className="label">正答率</span>
          <span className="value">{accuracy}%</span>
        </li>
      </ul>

      <div className="actions">
        <button className="primary" onClick={onPlayAgain}>
          もう一度遊ぶ
        </button>
        <button className="ghost" onClick={onExit}>
          ホームに戻る
        </button>
      </div>
    </div>
  );
}
