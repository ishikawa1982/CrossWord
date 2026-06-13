import { describe, expect, it } from 'vitest';
import {
  applyOwnership,
  computeScores,
  getWinners,
  isComplete,
  validateAnswer,
} from './gameLogic.js';
import type { Player, Puzzle } from './types.js';

// 小さな手組み盤面：
//  CAT (across, row0 col0-2) と CAR (down, row0-2 col0) が C で交差
function makePuzzle(): Puzzle {
  return {
    width: 3,
    height: 3,
    cells: [
      { row: 0, col: 0, owner: null, solution: 'C', number: 1 },
      { row: 0, col: 1, owner: null, solution: 'A' },
      { row: 0, col: 2, owner: null, solution: 'T' },
      { row: 1, col: 0, owner: null, solution: 'A' },
      { row: 2, col: 0, owner: null, solution: 'R' },
    ],
    words: [
      { id: 'w0', clue: 'feline', row: 0, col: 0, direction: 'across', number: 1, length: 3, answer: 'CAT' },
      { id: 'w1', clue: 'vehicle', row: 0, col: 0, direction: 'down', number: 1, length: 3, answer: 'CAR' },
    ],
  };
}

function makePlayers(): Player[] {
  return [
    { id: 'p1', name: 'A', color: '#e6194b', score: 0, isHost: true, connected: true },
    { id: 'p2', name: 'B', color: '#3b82f6', score: 0, isHost: false, connected: true },
  ];
}

describe('validateAnswer', () => {
  it('正解を判定する（大小無視）', () => {
    const p = makePuzzle();
    expect(validateAnswer(p, 'w0', 'cat', 'en')).toBe(true);
    expect(validateAnswer(p, 'w0', 'CAT', 'en')).toBe(true);
  });
  it('誤答を弾く', () => {
    const p = makePuzzle();
    expect(validateAnswer(p, 'w0', 'dog', 'en')).toBe(false);
  });
  it('かなの表記ゆれ（ひら/カタ・小書き）を吸収する', () => {
    const p: Puzzle = {
      width: 3, height: 1,
      cells: [
        { row: 0, col: 0, owner: null, solution: 'キ' },
        { row: 0, col: 1, owner: null, solution: 'ヤ' },
        { row: 0, col: 2, owner: null, solution: 'ク' },
      ],
      words: [{ id: 'w0', clue: 'guest', row: 0, col: 0, direction: 'across', number: 1, length: 3, answer: 'キヤク' }],
    };
    expect(validateAnswer(p, 'w0', 'きゃく', 'ja')).toBe(true);
  });
});

describe('applyOwnership / computeScores', () => {
  it('正解した単語の全マスを所有し、最新の正解者で上書きする', () => {
    const p = makePuzzle();
    const players = makePlayers();

    applyOwnership(p, 'w0', 'p1'); // CAT を p1
    computeScores(p, players);
    expect(players.find((x) => x.id === 'p1')!.score).toBe(3);

    applyOwnership(p, 'w1', 'p2'); // CAR を p2 → 交差マス(0,0)が p2 に上書き
    computeScores(p, players);
    expect(p.cells.find((c) => c.row === 0 && c.col === 0)!.owner).toBe('p2');
    expect(players.find((x) => x.id === 'p1')!.score).toBe(2); // A,T のみ
    expect(players.find((x) => x.id === 'p2')!.score).toBe(3); // C,A,R
  });
});

describe('isComplete / getWinners', () => {
  it('全マス埋まりで終了判定', () => {
    const p = makePuzzle();
    expect(isComplete(p)).toBe(false);
    applyOwnership(p, 'w0', 'p1');
    applyOwnership(p, 'w1', 'p2');
    expect(isComplete(p)).toBe(true);
  });

  it('最大スコアを勝者とし、同点は引き分け（複数）', () => {
    const players = makePlayers();
    players[0].score = 3;
    players[1].score = 3;
    expect(getWinners(players).sort()).toEqual(['p1', 'p2']);
    players[1].score = 2;
    expect(getWinners(players)).toEqual(['p1']);
  });
});
