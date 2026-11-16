import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../types';

export type VoxSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Dev: Vite proxies /socket.io to :3001. Production: same origin (or VITE_SERVER_URL).
export const socket: VoxSocket = io(import.meta.env.VITE_SERVER_URL || undefined, {
  reconnection: true,
  reconnectionDelay: 800,
  transports: ['websocket', 'polling'],
});
