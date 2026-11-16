import { randomUUID } from 'node:crypto';
import type { ChatMode, Language } from '../../../shared/types';

export type PairMode = Exclude<ChatMode, 'chain'>;

export interface Session {
  id: string;
  mode: PairMode;
  lang: Language;
  /** socket ids still present in the session (a partner may leave first) */
  members: Set<string>;
  /** original join order, used for stable author numbering */
  originalMembers: [string, string];
}

/**
 * In-memory FIFO matchmaker for the 1-on-1 modes (classic / oxygen / xray).
 * Queues are isolated per mode AND language: ru only meets ru, en only meets en.
 */
export class Matchmaker {
  private queues = new Map<string, string[]>();
  private sessions = new Map<string, Session>();
  private userSession = new Map<string, string>();

  private queue(mode: PairMode, lang: Language): string[] {
    const key = `${mode}:${lang}`;
    let q = this.queues.get(key);
    if (!q) {
      q = [];
      this.queues.set(key, q);
    }
    return q;
  }

  /** Put a user into the queue; returns a new session when a pair is formed. */
  enqueue(mode: PairMode, lang: Language, socketId: string): Session | null {
    this.leave(socketId);
    const queue = this.queue(mode, lang);
    queue.push(socketId);
    if (queue.length < 2) return null;

    const a = queue.shift()!;
    const b = queue.shift()!;
    const session: Session = {
      id: randomUUID(),
      mode,
      lang,
      members: new Set([a, b]),
      originalMembers: [a, b],
    };
    this.sessions.set(session.id, session);
    this.userSession.set(a, session.id);
    this.userSession.set(b, session.id);
    return session;
  }

  dequeue(socketId: string): void {
    for (const [key, q] of this.queues) {
      this.queues.set(
        key,
        q.filter((id) => id !== socketId),
      );
    }
  }

  get(socketId: string): Session | undefined {
    const id = this.userSession.get(socketId);
    return id ? this.sessions.get(id) : undefined;
  }

  /** The partner still present in the session, if any. */
  partnerOf(socketId: string): string | null {
    const session = this.get(socketId);
    if (!session) return null;
    for (const id of session.members) if (id !== socketId) return id;
    return null;
  }

  /** Remove the user from queues and from their session. */
  leave(socketId: string): { session?: Session; partnerId: string | null; ended: boolean } {
    this.dequeue(socketId);
    const session = this.get(socketId);
    if (!session) return { partnerId: null, ended: false };

    session.members.delete(socketId);
    this.userSession.delete(socketId);
    const partnerId = session.members.values().next().value ?? null;
    const ended = session.members.size === 0;
    if (ended) this.sessions.delete(session.id);
    return { session, partnerId, ended };
  }
}

export const matchmaker = new Matchmaker();
