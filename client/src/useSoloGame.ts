// 一人用モードのロジック（クライアント完結・オフライン）
// サーバを介さず、ブラウザ内で盤面を生成・採点する。GitHub Pages 等の静的配信でも動く。
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyOwnership,
  computeScores,
  generatePuzzle,
  getWords,
  isComplete,
  stripSolution,
  validateAnswer,
  type AnswerResult,
  type GameState,
  type Language,
  type Player,
  type Puzzle,
} from '@crossword/shared';

export type SoloDifficulty = 'easy' | 'normal' | 'hard';

/** 難易度ごとの目標単語数 */
const TARGET_WORDS: Record<SoloDifficulty, number> = {
  easy: 6,
  normal: 10,
  hard: 14,
};

const SOLO_PLAYER_ID = 'solo';
const SOLO_COLOR = '#3b82f6';

export interface SoloStats {
  /** 開始時刻（epoch ms） */
  startedAt: number;
  /** 終了時刻（クリア時のみ） */
  finishedAt: number | null;
  /** 誤答回数 */
  mistakes: number;
  /** 正解した単語数 */
  solvedWords: number;
}

export interface SoloGame {
  state: GameState | null;
  lastResult: AnswerResult | null;
  stats: SoloStats | null;
  /** 新しい盤面を生成して開始。失敗時は false */
  start: (language: Language, difficulty: SoloDifficulty) => boolean;
  /** カギに解答。正誤を採点し盤面・統計を更新 */
  submit: (wordId: string, guess: string) => void;
  /** ホームへ戻る（状態をクリア） */
  exit: () => void;
}

function makeSoloPlayer(): Player {
  return {
    id: SOLO_PLAYER_ID,
    name: 'あなた',
    color: SOLO_COLOR,
    score: 0,
    isHost: true,
    connected: true,
  };
}

export function useSoloGame(): SoloGame {
  const [state, setState] = useState<GameState | null>(null);
  const [lastResult, setLastResult] = useState<AnswerResult | null>(null);
  const [stats, setStats] = useState<SoloStats | null>(null);
  // 解答付きの内部盤面（UI には stripSolution したものを渡す）
  const solutionRef = useRef<Puzzle | null>(null);
  const langRef = useRef<Language>('ja');
  const solvedWordIdsRef = useRef<Set<string>>(new Set());
  const hintedCellsRef = useRef<Set<string>>(new Set());

  const start = useCallback((language: Language, difficulty: SoloDifficulty): boolean => {
    const source = getWords(language);
    let puzzle: Puzzle | null = null;
    // ごく稀に生成が振るわないため数回試行する
    for (let i = 0; i < 5; i++) {
      const candidate = generatePuzzle(source, language, { targetWords: TARGET_WORDS[difficulty] });
      if (candidate.words.length >= 2) {
        puzzle = candidate;
        break;
      }
    }
    if (!puzzle) return false;

    const player = makeSoloPlayer();
    computeScores(puzzle, [player]);
    solutionRef.current = puzzle;
    langRef.current = language;
    solvedWordIdsRef.current = new Set();
    hintedCellsRef.current = new Set();
    setLastResult(null);
    setStats({ startedAt: Date.now(), finishedAt: null, mistakes: 0, solvedWords: 0 });
    setState({
      roomCode: 'SOLO',
      status: 'playing',
      language,
      genre: 'random',
      players: [player],
      puzzle: stripSolution(puzzle, new Set()),
      winnerIds: [],
      solvedWordIds: [],
      wordSolvers: {},
    });
    return true;
  }, []);

  const submit = useCallback((wordId: string, guess: string) => {
    const puzzle = solutionRef.current;
    if (!puzzle) return;

    // 解答済みの単語はスキップ
    if (solvedWordIdsRef.current.has(wordId)) {
      setLastResult({ wordId, correct: false, alreadySolved: true });
      return;
    }

    const correct = validateAnswer(puzzle, wordId, guess, langRef.current);
    if (!correct) {
      setStats((s) => (s ? { ...s, mistakes: s.mistakes + 1 } : s));
      setLastResult({ wordId, correct: false });
      return;
    }

    // 正解：単語の全マスを自分の色に塗り、スコアと進捗を更新
    solvedWordIdsRef.current.add(wordId);
    applyOwnership(puzzle, wordId, SOLO_PLAYER_ID);
    const player = makeSoloPlayer();
    computeScores(puzzle, [player]);
    const done = isComplete(puzzle);
    const finishedAt = done ? Date.now() : null;

    setStats((s) => (s ? { ...s, solvedWords: s.solvedWords + 1, finishedAt } : s));
    setLastResult({ wordId, correct: true });
    setState((prev) =>
      prev
        ? {
            ...prev,
            status: done ? 'finished' : 'playing',
            players: [player],
            puzzle: stripSolution(puzzle, hintedCellsRef.current),
            winnerIds: done ? [SOLO_PLAYER_ID] : [],
            solvedWordIds: [...solvedWordIdsRef.current],
            wordSolvers: Object.fromEntries(
              [...solvedWordIdsRef.current].map((id) => [id, SOLO_PLAYER_ID])
            ),
          }
        : prev
    );
  }, []);

  // ヒントタイマー：ゲーム開始60秒後から10秒ごとに未解答マスを1つ開示
  useEffect(() => {
    if (!stats?.startedAt) return;
    let timerId: ReturnType<typeof setTimeout>;
    const reveal = () => {
      const puzzle = solutionRef.current;
      if (!puzzle) return;
      const candidates = puzzle.cells.filter(
        (c) => c.owner === null && !hintedCellsRef.current.has(`${c.row},${c.col}`)
      );
      if (candidates.length === 0) return;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      hintedCellsRef.current = new Set(hintedCellsRef.current);
      hintedCellsRef.current.add(`${pick.row},${pick.col}`);
      setState((prev) => {
        const puz = solutionRef.current;
        return prev && puz
          ? { ...prev, puzzle: stripSolution(puz, hintedCellsRef.current) }
          : prev;
      });
      timerId = setTimeout(reveal, 10_000);
    };
    timerId = setTimeout(reveal, 60_000);
    return () => clearTimeout(timerId);
  }, [stats?.startedAt]);

  const exit = useCallback(() => {
    solutionRef.current = null;
    setState(null);
    setLastResult(null);
    setStats(null);
  }, []);

  return { state, lastResult, stats, start, submit, exit };
}
