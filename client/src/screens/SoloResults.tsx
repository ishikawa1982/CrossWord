import { useEffect, useState } from 'react';
import { Confetti } from '../components/Confetti.js';
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

  // クリアは必ず祝う場面。マウント時に紙吹雪を表示し、数秒で止める。
  const [showConfetti, setShowConfetti] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 4500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="screen results">
      {showConfetti && <Confetti />}
      <h1 className="clear-title">クリア！ 🎉</h1>
      <p className="winner-banner celebrate">すべてのマスを埋めました！</p>

      <ul className="solo-stat-list">
        <li style={{ animationDelay: '0.1s' }}>
          <span className="label">タイム</span>
          <span className="value">{formatDuration(elapsed)}</span>
        </li>
        <li style={{ animationDelay: '0.25s' }}>
          <span className="label">単語数</span>
          <span className="value">{totalWords} 語</span>
        </li>
        <li style={{ animationDelay: '0.4s' }}>
          <span className="label">ミス</span>
          <span className="value">{stats.mistakes} 回</span>
        </li>
        <li style={{ animationDelay: '0.55s' }}>
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
