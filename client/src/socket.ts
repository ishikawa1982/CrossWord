import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@crossword/shared';

// 接続先の決定ルール：
// 1. VITE_SERVER_URL が指定されていればそれを使う（別ホストにサーバを置く場合）
// 2. 開発時（vite dev）は localhost:3001（サーバを別ポートで起動）
// 3. 本番（ビルド済み）は同一オリジン＝画面を配信したサーバ自身に接続
const explicit = import.meta.env.VITE_SERVER_URL as string | undefined;
const SERVER_URL = explicit && explicit.trim()
  ? explicit
  : import.meta.env.DEV
    ? 'http://localhost:3001'
    : ''; // 空文字 = 同一オリジン

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const socket: GameSocket = io(SERVER_URL, {
  autoConnect: true,
});
