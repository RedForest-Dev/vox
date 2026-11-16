import { randomUUID } from 'node:crypto';
import type { Server } from 'socket.io';
import {
  EVT,
  type ChatMessage,
  type ClientToServerEvents,
  type Language,
  type ServerToClientEvents,
  type XRayStrokePayload,
} from '../../../shared/types';
import { matchmaker, type PairMode, type Session } from '../core/matchmaker';
import { chainRegistry } from '../modes/chainEngine';
import { countWords, oxygenEngine } from '../modes/oxygenEngine';
import { storyRepository } from '../db/storyRepository';

export type IO = Server<ClientToServerEvents, ServerToClientEvents>;

const MAX_TEXT = 10000;
const PAIR_MODES: PairMode[] = ['classic', 'oxygen', 'xray'];

function clean(text: unknown): string {
  return typeof text === 'string' ? text.slice(0, MAX_TEXT) : '';
}

/** Anything that is not explicitly "en" is treated as Russian. */
function toLang(value: unknown): Language {
  return value === 'en' ? 'en' : 'ru';
}

export function registerSockets(io: IO): void {
  const broadcastOnline = () => io.emit(EVT.ONLINE_COUNT, { count: io.engine.clientsCount });

  const sendOxygenState = (session: Session) => {
    const room = oxygenEngine.get(session.id);
    if (!room) return;
    for (const id of session.members) {
      const partner = [...session.members].find((m) => m !== id) ?? null;
      io.to(id).emit(EVT.OXYGEN_STATE, oxygenEngine.viewFor(room, id, partner));
    }
  };

  const startSession = (session: Session) => {
    const [a, b] = session.originalMembers;
    const room =
      session.mode === 'oxygen' ? oxygenEngine.create(session.id, session.lang, a, b) : undefined;
    for (const id of session.originalMembers) {
      io.to(id).emit(EVT.MATCH_FOUND, {
        mode: session.mode,
        oxygen: room ? oxygenEngine.viewFor(room, id, id === a ? b : a) : undefined,
      });
    }
  };

  const leaveSession = (id: string) => {
    const { session, partnerId, ended } = matchmaker.leave(id);
    if (!session) return;
    if (partnerId) io.to(partnerId).emit(EVT.PARTNER_LEFT);
    if (ended) oxygenEngine.remove(session.id);
  };

  const sendChainState = (ids: string[]) => {
    for (const id of ids) {
      const state = chainRegistry.getState(id);
      if (state) io.to(id).emit(EVT.CHAIN_STATE, state);
    }
  };

  const leaveChain = (id: string) => {
    const result = chainRegistry.leave(id);
    sendChainState(result.affected);
    if (result.stitched) {
      io.to(result.stitched.leftId).emit(EVT.CHAIN_STITCHED, { slot: 'right' });
      io.to(result.stitched.rightId).emit(EVT.CHAIN_STITCHED, { slot: 'left' });
    }
  };

  io.on('connection', (socket) => {
    broadcastOnline();

    // ------------------------------------------------------------------ queue
    socket.on(EVT.QUEUE_JOIN, (p) => {
      if (!p || !PAIR_MODES.includes(p.mode)) return;
      leaveSession(socket.id);
      const session = matchmaker.enqueue(p.mode, toLang(p.lang), socket.id);
      if (session) startSession(session);
    });

    socket.on(EVT.QUEUE_LEAVE, () => {
      matchmaker.dequeue(socket.id);
      leaveSession(socket.id);
    });

    socket.on(EVT.MATCH_NEXT, () => {
      const current = matchmaker.get(socket.id);
      if (!current) return;
      const { mode, lang } = current;
      leaveSession(socket.id);
      const session = matchmaker.enqueue(mode, lang, socket.id);
      if (session) startSession(session);
    });

    // -------------------------------------------------- classic + oxygen text
    socket.on(EVT.MESSAGE_SEND, (p) => {
      const session = matchmaker.get(socket.id);
      const partnerId = matchmaker.partnerOf(socket.id);
      if (!session || !partnerId || session.mode === 'xray') return;

      let text = clean(p?.text).trim();
      if (!text) return;

      let depleted = false;
      if (session.mode === 'oxygen') {
        const room = oxygenEngine.get(session.id);
        const result = room && oxygenEngine.process(room, socket.id, text);
        if (!result) return;
        text = result.text;
        depleted = result.depleted;
      }

      const base: Omit<ChatMessage, 'isSelf'> = { id: randomUUID(), text, timestamp: Date.now() };
      io.to(socket.id).emit(EVT.MESSAGE_RECEIVE, { message: { ...base, isSelf: true } });
      io.to(partnerId).emit(EVT.MESSAGE_RECEIVE, { message: { ...base, isSelf: false } });

      if (session.mode === 'oxygen') {
        sendOxygenState(session);
        if (depleted) {
          io.to(socket.id).emit(EVT.OXYGEN_DEPLETED);
          io.to(partnerId).emit(EVT.OXYGEN_DEPLETED);
        }
      }
    });

    // ----------------------------------------------------------------- oxygen
    socket.on(EVT.OXYGEN_AMPOULE, () => {
      const session = matchmaker.get(socket.id);
      if (!session || session.mode !== 'oxygen' || !matchmaker.partnerOf(socket.id)) return;
      const room = oxygenEngine.get(session.id);
      if (room && oxygenEngine.useAmpoule(room, socket.id)) sendOxygenState(session);
    });

    socket.on(EVT.OXYGEN_SAVE, () => {
      const session = matchmaker.get(socket.id);
      if (!session || session.mode !== 'oxygen') return;
      const room = oxygenEngine.get(session.id);
      if (!room || room.log.length === 0) return;

      if (!room.savedSlug) {
        const totalWords = room.log.reduce((sum, m) => sum + countWords(m.text), 0);
        room.savedSlug = storyRepository.save(room.log, totalWords, room.lang);
      }
      socket.emit(EVT.OXYGEN_SAVED, { slug: room.savedSlug });
    });

    // ------------------------------------------------------------------ chain
    socket.on(EVT.CHAIN_JOIN, (p) => {
      const lang = toLang(p?.lang);
      const current = chainRegistry.langOf(socket.id);
      if (current && current !== lang) leaveChain(socket.id); // switched language: change chain
      sendChainState(chainRegistry.join(socket.id, lang));
    });

    socket.on(EVT.CHAIN_LEAVE, () => leaveChain(socket.id));

    socket.on(EVT.CHAIN_SEND, (p) => {
      if (!p || (p.slot !== 'left' && p.slot !== 'right')) return;
      const text = clean(p.text).trim();
      if (!text) return;
      const route = chainRegistry.route(socket.id, p.slot);
      if (!route) return;

      // Same payload for every message: no "forwarded" marker exists by design.
      const base: Omit<ChatMessage, 'isSelf'> = { id: randomUUID(), text, timestamp: Date.now() };
      io.to(socket.id).emit(EVT.CHAIN_RECEIVE, { slot: p.slot, message: { ...base, isSelf: true } });
      io.to(route.targetId).emit(EVT.CHAIN_RECEIVE, {
        slot: route.targetSlot,
        message: { ...base, isSelf: false },
      });
    });

    // ------------------------------------------------------------------- xray
    socket.on(EVT.XRAY_STROKE, (p: XRayStrokePayload) => {
      const session = matchmaker.get(socket.id);
      const partnerId = matchmaker.partnerOf(socket.id);
      if (!session || session.mode !== 'xray' || !partnerId || !p) return;
      io.to(partnerId).emit(EVT.XRAY_REMOTE_STROKE, {
        currentText: clean(p.currentText),
        ghost: Array.isArray(p.ghost)
          ? p.ghost.slice(-30).map((g) => clean(g).slice(0, 4000))
          : [],
      });
    });

    socket.on(EVT.XRAY_RESET, () => {
      const session = matchmaker.get(socket.id);
      const partnerId = matchmaker.partnerOf(socket.id);
      if (session?.mode === 'xray' && partnerId) io.to(partnerId).emit(EVT.XRAY_RESET);
    });

    // ------------------------------------------------------------- disconnect
    socket.on('disconnect', () => {
      leaveSession(socket.id);
      leaveChain(socket.id);
      broadcastOnline();
    });
  });
}
