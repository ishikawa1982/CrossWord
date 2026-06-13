import { describe, expect, it } from 'vitest';
import { generatePuzzle, stripSolution } from './generator.js';
import type { WordEntry } from './types.js';

// 決定的な乱数（線形合同法）
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const EN: WordEntry[] = [
  { answer: 'PLANET', clue: 'orbits a star' },
  { answer: 'EARTH', clue: 'our home' },
  { answer: 'MARS', clue: 'red planet' },
  { answer: 'STAR', clue: 'shines at night' },
  { answer: 'COMET', clue: 'icy body with a tail' },
  { answer: 'MOON', clue: 'orbits earth' },
  { answer: 'ORBIT', clue: 'path around a body' },
  { answer: 'SOLAR', clue: 'of the sun' },
];

const JA: WordEntry[] = [
  { answer: 'サクラ', clue: '春に咲く花' },
  { answer: 'クルマ', clue: '道を走る乗り物' },
  { answer: 'マクラ', clue: '寝るとき頭を乗せる' },
  { answer: 'カラス', clue: '黒い鳥' },
  { answer: 'スイカ', clue: '夏の果物' },
];

const key = (r: number, c: number) => `${r},${c}`;

describe('generatePuzzle', () => {
  it('英語：複数単語が交差して配置される', () => {
    const puzzle = generatePuzzle(EN, 'en', { rnd: seeded(42), targetWords: 6 });
    expect(puzzle.words.length).toBeGreaterThanOrEqual(3);
    expect(puzzle.cells.length).toBeGreaterThan(0);
  });

  it('交差マスの文字が両単語で一致する', () => {
    const puzzle = generatePuzzle(EN, 'en', { rnd: seeded(7), targetWords: 6 });
    const solutionByKey = new Map(
      puzzle.cells.map((c) => [key(c.row, c.col), c.solution])
    );
    for (const w of puzzle.words) {
      const chars = Array.from(w.answer!);
      const dr = w.direction === 'down' ? 1 : 0;
      const dc = w.direction === 'across' ? 1 : 0;
      for (let i = 0; i < chars.length; i++) {
        expect(solutionByKey.get(key(w.row + dr * i, w.col + dc * i))).toBe(chars[i]);
      }
    }
  });

  it('カギ番号が一意に振られる', () => {
    const puzzle = generatePuzzle(EN, 'en', { rnd: seeded(3), targetWords: 6 });
    const numbers = puzzle.cells.filter((c) => c.number).map((c) => c.number!);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('全単語が少なくとも1回は交差する（最初の語を除き連結）', () => {
    const puzzle = generatePuzzle(EN, 'en', { rnd: seeded(99), targetWords: 6 });
    // セルのキー集合
    const cellKeys = new Set(puzzle.cells.map((c) => key(c.row, c.col)));
    // 全単語のマスがセル集合に含まれる
    for (const w of puzzle.words) {
      const dr = w.direction === 'down' ? 1 : 0;
      const dc = w.direction === 'across' ? 1 : 0;
      for (let i = 0; i < w.length; i++) {
        expect(cellKeys.has(key(w.row + dr * i, w.col + dc * i))).toBe(true);
      }
    }
  });

  it('日本語（かな）でも生成できる', () => {
    const puzzle = generatePuzzle(JA, 'ja', { rnd: seeded(5), targetWords: 5 });
    expect(puzzle.words.length).toBeGreaterThanOrEqual(2);
  });

  it('stripSolution で解答情報が除去される', () => {
    const puzzle = generatePuzzle(EN, 'en', { rnd: seeded(1), targetWords: 6 });
    const stripped = stripSolution(puzzle);
    expect(stripped.cells.every((c) => c.solution === undefined)).toBe(true);
    expect(stripped.words.every((w) => w.answer === undefined)).toBe(true);
  });
});
