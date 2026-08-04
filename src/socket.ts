import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../shared/protocol';

export interface SessionData {
  roomCode: string;
  playerId: string;
  sessionToken: string;
  nickname: string;
}

const SESSION_KEY = 'quem-sou-eu:session';

export function readSession(): SessionData | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionData>;
    if (!parsed.roomCode || !parsed.playerId || !parsed.sessionToken || !parsed.nickname) return null;
    return {
      roomCode: parsed.roomCode,
      playerId: parsed.playerId,
      sessionToken: parsed.sessionToken,
      nickname: parsed.nickname,
    };
  } catch {
    return null;
  }
}

export function saveSession(session: SessionData): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  import.meta.env.VITE_SERVER_URL || undefined,
  {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 800,
    auth: readSession() ?? {},
  },
);
