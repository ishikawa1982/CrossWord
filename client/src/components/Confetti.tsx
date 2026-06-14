import { useMemo } from 'react';

interface Props {
  /** 紙吹雪の粒の数 */
  count?: number;
  /** 落下アニメーションの基準時間（ms） */
  durationMs?: number;
}

// お祝い感のある配色（プレイヤー色＋アクセント）
const COLORS = ['#e6194b', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#fde047'];

/**
 * 依存ライブラリなしの紙吹雪。粒ごとにランダムなパラメータを CSS 変数で渡し、
 * 落下・回転・横揺れは CSS アニメーション側で行う（JS は座標計算しない＝軽量）。
 * 表示・非表示は呼び出し側で制御する（一定時間後に unmount）。
 */
export function Confetti({ count = 60, durationMs = 4000 }: Props) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const left = Math.random() * 100; // vw
        const delay = Math.random() * 800; // ms
        const duration = durationMs * (0.7 + Math.random() * 0.6); // ばらつき
        const drift = (Math.random() * 2 - 1) * 80; // px 横揺れ
        const rotate = 360 * (1 + Math.floor(Math.random() * 3)); // 回転量
        const color = COLORS[i % COLORS.length];
        const size = 6 + Math.random() * 8; // px
        return { id: i, left, delay, duration, drift, rotate, color, size };
      }),
    [count, durationMs]
  );

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={
            {
              left: `${p.left}vw`,
              width: `${p.size}px`,
              height: `${p.size * 0.5}px`,
              background: p.color,
              animationDelay: `${p.delay}ms`,
              animationDuration: `${p.duration}ms`,
              '--drift': `${p.drift}px`,
              '--rotate': `${p.rotate}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
