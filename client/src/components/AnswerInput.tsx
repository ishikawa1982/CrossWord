import { useEffect, useRef, useState } from 'react';
import type { AnswerResult, PlacedWord } from '@crossword/shared';

interface Props {
  word: PlacedWord | null;
  lastResult: AnswerResult | null;
  onSubmit: (guess: string) => void;
}

export function AnswerInput({ word, lastResult, onSubmit }: Props) {
  const [guess, setGuess] = useState('');
  const [now, setNow] = useState(Date.now());
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // クールダウン期限（誤答時にサーバから受信）
  const cooldownUntil = lastResult && !lastResult.correct ? lastResult.cooldownUntil ?? 0 : 0;
  const remaining = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const onCooldown = remaining > 0;

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  // 結果フィードバック表示
  useEffect(() => {
    if (!lastResult) return;
    if (lastResult.correct) {
      setFeedback('correct');
      setGuess('');
    } else {
      setFeedback('wrong');
    }
    const id = setTimeout(() => setFeedback(null), 1200);
    return () => clearTimeout(id);
  }, [lastResult]);

  // 選択単語が変わったら入力にフォーカス
  useEffect(() => {
    if (word) inputRef.current?.focus();
  }, [word]);

  const submit = () => {
    if (!word || onCooldown || !guess.trim()) return;
    onSubmit(guess.trim());
  };

  if (!word) {
    return <div className="answer-input empty">マスまたはカギを選んでください</div>;
  }

  return (
    <div className={`answer-input${feedback ? ' ' + feedback : ''}`}>
      <div className="selected-clue">
        <strong>
          {word.number}. {word.direction === 'across' ? 'ヨコ' : 'タテ'}
        </strong>
        <span>{word.clue}（{word.length}文字）</span>
      </div>
      <div className="input-row">
        <input
          ref={inputRef}
          value={guess}
          placeholder="答えを入力"
          disabled={onCooldown}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
        <button className="primary" disabled={onCooldown || !guess.trim()} onClick={submit}>
          回答
        </button>
      </div>
      {onCooldown && <p className="cooldown">不正解！ {remaining} 秒待ってください</p>}
      {!onCooldown && lastResult?.alreadySolved && lastResult.wordId === word?.id && (
        <p className="cooldown">この問題はすでに解答済みです</p>
      )}
      {feedback === 'correct' && <p className="ok">正解！マスを獲得しました</p>}
    </div>
  );
}
