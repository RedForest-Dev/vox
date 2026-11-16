import {
  GUILLOTINE_SUFFIXES,
  OXYGEN_AMPOULE_BONUS,
  OXYGEN_INITIAL_POOL,
  type Language,
  type OxygenState,
  type StoryMessage,
} from '../../../shared/types';

export interface OxygenRoom {
  sessionId: string;
  lang: Language;
  poolRemaining: number;
  poolMax: number;
  burned: Map<string, number>;
  ampouleUsed: Set<string>;
  depleted: boolean;
  authors: Map<string, 1 | 2>;
  log: StoryMessage[];
  savedSlug?: string;
}

export function countWords(text: string): number {
  return text.match(/\S+/g)?.length ?? 0;
}

class OxygenEngine {
  private rooms = new Map<string, OxygenRoom>();

  create(sessionId: string, lang: Language, a: string, b: string): OxygenRoom {
    const room: OxygenRoom = {
      sessionId,
      lang,
      poolRemaining: OXYGEN_INITIAL_POOL,
      poolMax: OXYGEN_INITIAL_POOL,
      burned: new Map([[a, 0], [b, 0]]),
      ampouleUsed: new Set(),
      depleted: false,
      authors: new Map([[a, 1], [b, 2]]),
      log: [],
    };
    this.rooms.set(sessionId, room);
    return room;
  }

  get(sessionId: string): OxygenRoom | undefined {
    return this.rooms.get(sessionId);
  }

  remove(sessionId: string): void {
    this.rooms.delete(sessionId);
  }

  /**
   * Burn words for a message. When the message does not fit into the remaining
   * pool it is cut exactly at the last affordable word (the "guillotine").
   */
  process(room: OxygenRoom, userId: string, rawText: string): { text: string; depleted: boolean } | null {
    if (room.depleted || room.poolRemaining <= 0) return null;
    const words = rawText.match(/\S+/g);
    if (!words) return null;

    let text = words.join(' ');
    let burned = words.length;
    if (words.length >= room.poolRemaining) {
      burned = room.poolRemaining;
      text = words.slice(0, burned).join(' ');
      if (words.length > burned) text += GUILLOTINE_SUFFIXES[room.lang];
      room.poolRemaining = 0;
      room.depleted = true;
    } else {
      room.poolRemaining -= burned;
    }

    room.burned.set(userId, (room.burned.get(userId) ?? 0) + burned);
    room.log.push({ author: room.authors.get(userId) ?? 1, text, timestamp: Date.now() });
    return { text, depleted: room.depleted };
  }

  /** One ampoule per user per session: +300 words to the shared pool. */
  useAmpoule(room: OxygenRoom, userId: string): boolean {
    if (room.ampouleUsed.has(userId) || !room.authors.has(userId)) return false;
    room.ampouleUsed.add(userId);
    room.poolRemaining += OXYGEN_AMPOULE_BONUS;
    room.poolMax += OXYGEN_AMPOULE_BONUS;
    room.depleted = false;
    return true;
  }

  viewFor(room: OxygenRoom, userId: string, partnerId: string | null): OxygenState {
    const other = [...room.authors.keys()].find((id) => id !== userId);
    return {
      poolRemaining: room.poolRemaining,
      poolMax: room.poolMax,
      wordsBurnedByMe: room.burned.get(userId) ?? 0,
      wordsBurnedByPartner: other ? room.burned.get(other) ?? 0 : 0,
      myAmpouleAvailable: !room.ampouleUsed.has(userId),
      partnerAmpouleUsed: other ? room.ampouleUsed.has(other) : false,
      depleted: room.depleted,
    };
  }
}

export const oxygenEngine = new OxygenEngine();
