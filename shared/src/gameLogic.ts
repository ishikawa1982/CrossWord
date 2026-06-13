// ゲームロジック：解答判定・所有権更新・スコア計算・終了判定
import type { Cell, Language, Player, Puzzle } from './types.js';
import { normalizeForCompare } from './normalize.js';

const key = (r: number, c: number) => `${r},${c}`;

/** 単語IDから配置済み単語を取得 */
function findWord(puzzle: Puzzle, wordId: string) {
  return puzzle.words.find((w) => w.id === wordId);
}

/** 解答が正しいか判定（正規化して比較）。解答はサーバの answer を用いる */
export function validateAnswer(
  puzzle: Puzzle,
  wordId: string,
  guess: string,
  language: Language
): boolean {
  const word = findWord(puzzle, wordId);
  if (!word || word.answer === undefined) return false;
  return normalizeForCompare(guess, language) === normalizeForCompare(word.answer, language);
}

/** 単語の全マスの所有者を playerId に上書きする（最新の正解者で上書き） */
export function applyOwnership(puzzle: Puzzle, wordId: string, playerId: string): void {
  const word = findWord(puzzle, wordId);
  if (!word) return;
  const dr = word.direction === 'down' ? 1 : 0;
  const dc = word.direction === 'across' ? 1 : 0;
  const cellByKey = new Map(puzzle.cells.map((cell) => [key(cell.row, cell.col), cell]));
  for (let i = 0; i < word.length; i++) {
    const cell = cellByKey.get(key(word.row + dr * i, word.col + dc * i));
    if (cell) cell.owner = playerId;
  }
}

/** 各プレイヤーの所有マス数を集計して players の score を更新する */
export function computeScores(puzzle: Puzzle, players: Player[]): void {
  const counts = new Map<string, number>();
  for (const cell of puzzle.cells) {
    if (cell.owner) counts.set(cell.owner, (counts.get(cell.owner) ?? 0) + 1);
  }
  for (const p of players) p.score = counts.get(p.id) ?? 0;
}

/** 全マスに所有者が付いたか */
export function isComplete(puzzle: Puzzle): boolean {
  return puzzle.cells.length > 0 && puzzle.cells.every((cell) => cell.owner !== null);
}

/** 最大スコアのプレイヤーID（同点は複数＝引き分け） */
export function getWinners(players: Player[]): string[] {
  if (players.length === 0) return [];
  const max = Math.max(...players.map((p) => p.score));
  if (max === 0) return [];
  return players.filter((p) => p.score === max).map((p) => p.id);
}

/** 未獲得マスが残っているか（補助） */
export function remainingCells(puzzle: Puzzle): Cell[] {
  return puzzle.cells.filter((cell) => cell.owner === null);
}
