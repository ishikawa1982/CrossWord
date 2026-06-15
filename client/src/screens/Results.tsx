import { useEffect, useState } from 'react';
import type { GameState } from '@crossword/shared';
import { Confetti } from '../components/Confetti.js';

interface Props {
  state: GameState;
  playerId: string;
  onRematch: () => void;
  onLeave: () => void;
}

const ROW_INTERVAL_MS = 650; // 1行ずつ発表する間隔

export function Results({ state, playerId, onRematch, onLeave }: Props) {
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const winners = state.players.filter((p) => state.winnerIds.includes(p.id));
  const iWon = state.winnerIds.includes(playerId);
  const isDraw = winners.length > 1;

  // 出題された問題と答えの一覧（ヨコ→タテ、番号順）。
  // 答えはマスの solution から再構成する（終了後の再配信で words.answer が消えても残るため）。
  const colorById = new Map(state.players.map((p) => [p.id, p.color]));
  const cellByKey = new Map((state.puzzle?.cells ?? []).map((c) => [`${c.row},${c.col}`, c]));
  const clues = state.puzzle
    ? [...state.puzzle.words]
        .sort(
          (a, b) =>
            (a.direction === b.direction ? 0 : a.direction === 'across' ? -1 : 1) ||
            a.number - b.number
        )
        .map((w) => {
          const dr = w.direction === 'down' ? 1 : 0;
          const dc = w.direction === 'across' ? 1 : 0;
          let answer = '';
          for (let i = 0; i < w.length; i++) {
            answer += cellByKey.get(`${w.row + dr * i},${w.col + dc * i}`)?.solution ?? '';
          }
          const solverId = state.wordSolvers[w.id];
          return { ...w, answer, color: solverId ? colorById.get(solverId) : undefined };
        })
    : [];

  // 下位から1行ずつ発表。revealedFrom はこのインデックス以降を表示する。
  const [revealedFrom, setRevealedFrom] = useState(sorted.length);
  // 1位（先頭）まで出たら祝う演出を解禁
  const [celebrate, setCelebrate] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    // 最下位（index = length-1）から先頭（0）へ向けて順に表示
    for (let step = 0; step < sorted.length; step++) {
      const idx = sorted.length - 1 - step;
      timers.push(setTimeout(() => setRevealedFrom(idx), step * ROW_INTERVAL_MS));
    }
    // 全行（1位含む）が出た直後に祝う
    timers.push(
      setTimeout(() => {
        setCelebrate(true);
        setShowConfetti(true);
      }, sorted.length * ROW_INTERVAL_MS)
    );
    // 紙吹雪は数秒で止める
    timers.push(
      setTimeout(() => setShowConfetti(false), sorted.length * ROW_INTERVAL_MS + 4500)
    );
    return () => timers.forEach(clearTimeout);
  }, [sorted.length]);

  return (
    <div className="screen results">
      {showConfetti && <Confetti />}

      <h1>{isDraw ? '引き分け！' : '結果発表'}</h1>
      <p className={`winner-banner${celebrate ? ' celebrate' : ''}`}>
        {celebrate ? (
          <>
            {isDraw
              ? `引き分け：${winners.map((w) => w.name).join('・')}`
              : winners.length === 1
                ? `勝者：${winners[0].name}`
                : '勝者なし'}
            {iWon && ' 🎉 あなたの勝ち！'}
          </>
        ) : (
          ' '
        )}
      </p>

      <ol className="final-scores">
        {sorted.map((p, i) => {
          const isWinner = state.winnerIds.includes(p.id);
          const revealed = i >= revealedFrom;
          return (
            <li
              key={p.id}
              className={[
                p.id === playerId ? 'me' : '',
                revealed ? 'revealed' : '',
                revealed && celebrate && isWinner ? 'winner' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="rank">{i + 1}</span>
              <span className="swatch" style={{ background: p.color }} />
              <span className="name">
                {p.name}
                {celebrate && isWinner && ' 👑'}
              </span>
              <span className="count">{p.score} マス</span>
            </li>
          );
        })}
      </ol>

      {clues.length > 0 && (
        <div className="result-answers">
          <h2>出題された問題</h2>
          <ul className="answer-list">
            {clues.map((w) => (
              <li key={w.id}>
                <span className="dir">{w.direction === 'across' ? 'ヨコ' : 'タテ'}{w.number}</span>
                <span className="clue">{w.clue}</span>
                <span className="answer" style={w.color ? { color: w.color } : undefined}>
                  {w.answer}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="result-actions">
        <button className="primary" onClick={onRematch}>
          再戦する
        </button>
        <button className="ghost" onClick={onLeave}>
          ホームに戻る
        </button>
      </div>
    </div>
  );
}
