// クロスワード自動生成（貪欲法）
// 単語＋カギのリストから、交差して連結した盤面を構築する。
import type { Cell, Direction, Language, PlacedWord, Puzzle, WordEntry } from './types.js';
import { normalizeWord } from './normalize.js';

interface Placement {
  chars: string[];
  clue: string;
  row: number;
  col: number;
  direction: Direction;
}

const key = (r: number, c: number) => `${r},${c}`;

/** 乱数（シード対応）。テストで決定的に動かすため受け取る */
function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 配置可能か判定する。
 * - 既存マスと重なる位置は文字が一致していなければ不可
 * - 単語の前後（同方向）の隣接マスは空でなければならない（語の独立性）
 * - 新規（交差でない）マスの直交隣接が埋まっていると偶発語ができるため不可
 */
function canPlace(
  grid: Map<string, string>,
  chars: string[],
  row: number,
  col: number,
  dir: Direction
): { ok: boolean; intersections: number } {
  const dr = dir === 'down' ? 1 : 0;
  const dc = dir === 'across' ? 1 : 0;
  let intersections = 0;

  // 単語の直前・直後は空であること
  const beforeK = key(row - dr, col - dc);
  const afterK = key(row + dr * chars.length, col + dc * chars.length);
  if (grid.has(beforeK) || grid.has(afterK)) return { ok: false, intersections: 0 };

  for (let i = 0; i < chars.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const existing = grid.get(key(r, c));
    if (existing !== undefined) {
      if (existing !== chars[i]) return { ok: false, intersections: 0 };
      intersections++;
    } else {
      // 交差でない新規マス：直交方向の隣接が埋まっていたら不可
      const sideA = dir === 'across' ? key(r - 1, c) : key(r, c - 1);
      const sideB = dir === 'across' ? key(r + 1, c) : key(r, c + 1);
      if (grid.has(sideA) || grid.has(sideB)) return { ok: false, intersections: 0 };
    }
  }
  return { ok: true, intersections };
}

function commit(grid: Map<string, string>, p: Placement): void {
  const dr = p.direction === 'down' ? 1 : 0;
  const dc = p.direction === 'across' ? 1 : 0;
  for (let i = 0; i < p.chars.length; i++) {
    grid.set(key(p.row + dr * i, p.col + dc * i), p.chars[i]);
  }
}

/** 配置済み集合から1つの盤面を組む試行 */
function tryBuild(
  entries: { chars: string[]; clue: string }[],
  rnd: () => number
): Placement[] {
  const grid = new Map<string, string>();
  const placed: Placement[] = [];

  // 最初の単語を原点に横向き配置
  const first = entries[0];
  const firstPlacement: Placement = {
    chars: first.chars,
    clue: first.clue,
    row: 0,
    col: 0,
    direction: 'across',
  };
  commit(grid, firstPlacement);
  placed.push(firstPlacement);

  for (let e = 1; e < entries.length; e++) {
    const { chars, clue } = entries[e];
    let best: { placement: Placement; intersections: number } | null = null;

    // 既存マスの文字と一致する位置を交差点候補として探索
    for (let i = 0; i < chars.length; i++) {
      for (const [posKey, ch] of grid) {
        if (ch !== chars[i]) continue;
        const [gr, gc] = posKey.split(',').map(Number);
        // この文字を交差点にして縦・横両方向を試す
        for (const dir of ['across', 'down'] as Direction[]) {
          const row = dir === 'down' ? gr - i : gr;
          const col = dir === 'across' ? gc - i : gc;
          const { ok, intersections } = canPlace(grid, chars, row, col, dir);
          if (ok && intersections > 0) {
            if (!best || intersections > best.intersections) {
              best = { placement: { chars, clue, row, col, direction: dir }, intersections };
            }
          }
        }
      }
    }

    if (best) {
      commit(grid, best.placement);
      placed.push(best.placement);
    }
    // 置けなければスキップ
  }

  return placed;
}

export interface GenerateOptions {
  /** 盤面に使う単語数の目標 */
  targetWords?: number;
  /** 試行回数 */
  attempts?: number;
  rnd?: () => number;
}

/**
 * 単語リストから Puzzle を生成する（解答付き＝サーバ用）。
 */
export function generatePuzzle(
  source: WordEntry[],
  language: Language,
  options: GenerateOptions = {}
): Puzzle {
  const targetWords = options.targetWords ?? Math.min(10, source.length);
  const attempts = options.attempts ?? 30;
  const rnd = options.rnd ?? Math.random;

  // 正規化して2文字以上の語のみ採用
  const normalized = source
    .map((w) => ({ entry: w, chars: normalizeWord(w.answer, language) }))
    .filter((w) => w.chars.length >= 2);

  let bestPlaced: Placement[] = [];

  for (let a = 0; a < attempts; a++) {
    const pick = shuffle(normalized, rnd)
      .slice(0, targetWords)
      // 長い順に並べると交差が成立しやすい
      .sort((x, y) => y.chars.length - x.chars.length)
      .map((w) => ({ chars: w.chars, clue: w.entry.clue }));
    if (pick.length === 0) continue;
    const placed = tryBuild(pick, rnd);
    if (placed.length > bestPlaced.length) bestPlaced = placed;
    if (bestPlaced.length >= targetWords) break;
  }

  return assemblePuzzle(bestPlaced, language);
}

/** 配置結果を正規化座標の Puzzle に変換し、カギ番号を振る */
function assemblePuzzle(placed: Placement[], _language: Language): Puzzle {
  if (placed.length === 0) {
    return { width: 0, height: 0, cells: [], words: [] };
  }
  let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
  for (const p of placed) {
    const dr = p.direction === 'down' ? 1 : 0;
    const dc = p.direction === 'across' ? 1 : 0;
    for (let i = 0; i < p.chars.length; i++) {
      const r = p.row + dr * i;
      const c = p.col + dc * i;
      minR = Math.min(minR, r); maxR = Math.max(maxR, r);
      minC = Math.min(minC, c); maxC = Math.max(maxC, c);
    }
  }
  const height = maxR - minR + 1;
  const width = maxC - minC + 1;

  // セル辞書を構築（解答文字を保持）
  const cellMap = new Map<string, Cell>();
  const norm = placed.map((p) => ({
    ...p,
    row: p.row - minR,
    col: p.col - minC,
  }));

  for (const p of norm) {
    const dr = p.direction === 'down' ? 1 : 0;
    const dc = p.direction === 'across' ? 1 : 0;
    for (let i = 0; i < p.chars.length; i++) {
      const r = p.row + dr * i;
      const c = p.col + dc * i;
      const k = key(r, c);
      if (!cellMap.has(k)) {
        cellMap.set(k, { row: r, col: c, owner: null, solution: p.chars[i] });
      }
    }
  }

  // カギ番号付与：左上から走査し、語の起点となるマスに番号
  const starts = new Set(norm.map((p) => key(p.row, p.col)));
  let number = 0;
  const startNumber = new Map<string, number>();
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const k = key(r, c);
      if (starts.has(k) && !startNumber.has(k)) {
        number++;
        startNumber.set(k, number);
        const cell = cellMap.get(k);
        if (cell) cell.number = number;
      }
    }
  }

  const words: PlacedWord[] = norm.map((p, idx) => ({
    id: `w${idx}`,
    clue: p.clue,
    row: p.row,
    col: p.col,
    direction: p.direction,
    number: startNumber.get(key(p.row, p.col)) ?? 0,
    length: p.chars.length,
    answer: p.chars.join(''),
  }));

  return { width, height, cells: [...cellMap.values()], words };
}

/**
 * クライアント配信用に解答情報を取り除く。
 * ただし、既に所有者が付いたマス（＝正解された単語のマス）は、
 * その文字を全員に公開するため solution を残す。未解答のマスは秘匿。
 */
export function stripSolution(puzzle: Puzzle): Puzzle {
  return {
    width: puzzle.width,
    height: puzzle.height,
    cells: puzzle.cells.map((cell) => {
      const { solution, ...rest } = cell;
      return cell.owner !== null ? { ...rest, solution } : rest;
    }),
    words: puzzle.words.map(({ answer, ...rest }) => rest),
  };
}
