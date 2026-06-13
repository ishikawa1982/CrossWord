// 共有型定義：クライアント・サーバ間で使うデータ構造とソケットイベント

export type Language = 'ja' | 'en';

export type Direction = 'across' | 'down';

/** 単語＋カギのデータソース1件 */
export interface WordEntry {
  answer: string;
  clue: string;
}

/** 盤面に配置された単語（カギ） */
export interface PlacedWord {
  id: string;
  clue: string;
  row: number;
  col: number;
  direction: Direction;
  number: number;
  length: number;
  /** 解答文字（サーバのみ保持。クライアント配信時は除去） */
  answer?: string;
}

/** 盤面の1マス */
export interface Cell {
  row: number;
  col: number;
  /** カギ番号（マスの起点になっている場合） */
  number?: number;
  /** 現在の所有プレイヤーID（未獲得は null） */
  owner: string | null;
  /** 解答文字（サーバのみ。クライアント配信時は除去） */
  solution?: string;
}

/** 盤面全体 */
export interface Puzzle {
  width: number;
  height: number;
  /** 使用マスのみ（[row][col] のうち単語が通るマス） */
  cells: Cell[];
  words: PlacedWord[];
}

export type GameStatus = 'lobby' | 'playing' | 'finished';

export interface Player {
  id: string;
  name: string;
  /** 表示色（CSS カラー） */
  color: string;
  score: number;
  isHost: boolean;
  connected: boolean;
}

/** クライアントへ配信するゲーム状態 */
export interface GameState {
  roomCode: string;
  status: GameStatus;
  language: Language;
  players: Player[];
  puzzle: Puzzle | null;
  winnerIds: string[];
}

// ---- ソケットイベント I/F ----

export interface CreateRoomPayload {
  name: string;
  language: Language;
}
export interface JoinRoomPayload {
  code: string;
  name: string;
}
export interface SubmitAnswerPayload {
  wordId: string;
  guess: string;
}

export interface AnswerResult {
  wordId: string;
  correct: boolean;
  /** 誤答時のクールダウン期限（epoch ms） */
  cooldownUntil?: number;
}

export interface ErrorPayload {
  message: string;
}

/** サーバ → クライアント */
export interface ServerToClientEvents {
  roomUpdate: (state: GameState) => void;
  gameUpdate: (state: GameState) => void;
  answerResult: (result: AnswerResult) => void;
  gameOver: (state: GameState) => void;
  errorMessage: (err: ErrorPayload) => void;
}

/** クライアント → サーバ */
export interface ClientToServerEvents {
  createRoom: (
    payload: CreateRoomPayload,
    ack: (res: { ok: boolean; code?: string; playerId?: string; message?: string }) => void
  ) => void;
  joinRoom: (
    payload: JoinRoomPayload,
    ack: (res: { ok: boolean; playerId?: string; message?: string }) => void
  ) => void;
  startGame: () => void;
  submitAnswer: (payload: SubmitAnswerPayload) => void;
  leaveRoom: () => void;
}

/** プレイヤーに割り当てる4色（参加順） */
export const PLAYER_COLORS = ['#e6194b', '#3b82f6', '#22c55e', '#f59e0b'] as const;
