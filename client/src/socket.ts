import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@crossword/shared';

const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ?? 'http://localhost:3001';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const socket: GameSocket = io(SERVER_URL, {
  autoConnect: true,
});
