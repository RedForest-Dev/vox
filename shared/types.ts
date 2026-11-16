// ============================================================================
// VOX PWA — SHARED CONTRACTS (client <-> server)
// Single source of truth for socket events and payloads.
// ============================================================================

// ----------------------------------------------------------------------------
// Constants (from SPECIFICATION.md)
// ----------------------------------------------------------------------------
export const OXYGEN_INITIAL_POOL = 500; // words shared by both users
export const OXYGEN_AMPOULE_BONUS = 200; // +200 words, one ampoule per user per session
export const XRAY_THROTTLE_MS = 40;

export type Language = 'ru' | 'en';
export const LANGUAGES: readonly Language[] = ['ru', 'en'];

export const GUILLOTINE_SUFFIXES: Record<Language, string> = {
  ru: '... [ГИЛЬОТИНА]',
  en: '... [GUILLOTINE]',
};
export const HAPTIC_GUILLOTINE_PATTERN = [120, 60, 250] as const;

// ----------------------------------------------------------------------------
// Modes
// ----------------------------------------------------------------------------
export type ChatMode = 'classic' | 'chain' | 'oxygen' | 'xray';

export type ChainSlot = 'left' | 'right';

// ----------------------------------------------------------------------------
// Common models
// ----------------------------------------------------------------------------
export interface ChatMessage {
  id: string;
  /** true for messages written by the current user (server fills per recipient) */
  isSelf: boolean;
  text: string;
  timestamp: number;
}

// NOTE (Chain mode): there is deliberately NO "forwarded"/"bridged" flag anywhere.
// A message sent through the bridge is indistinguishable from a normal one.

// ----------------------------------------------------------------------------
// Mode 3: Oxygen
// ----------------------------------------------------------------------------
export interface OxygenState {
  poolRemaining: number;
  poolMax: number; // grows by 300 per ampoule
  wordsBurnedByMe: number;
  wordsBurnedByPartner: number;
  myAmpouleAvailable: boolean;
  partnerAmpouleUsed: boolean;
  depleted: boolean; // guillotine has fallen
}

// ----------------------------------------------------------------------------
// Mode 4: X-Ray
// ----------------------------------------------------------------------------
export interface XRayStrokePayload {
  currentText: string;
  /** erased fragments, oldest first (the "ghost layer") */
  ghost: string[];
}

// ----------------------------------------------------------------------------
// Stories (Oxygen masterpieces, SEO)
// ----------------------------------------------------------------------------
export interface StoryMessage {
  author: 1 | 2;
  text: string;
  timestamp: number;
}

export interface Story {
  slug: string;
  lang: Language;
  createdAt: number;
  totalWords: number;
  views: number;
  messages: StoryMessage[];
}

export type StorySummary = Omit<Story, 'messages'> & { preview: string };

// ----------------------------------------------------------------------------
// Socket events: names
// ----------------------------------------------------------------------------
export const EVT = {
  // presence
  ONLINE_COUNT: 'online:count',

  // matchmaking (classic / oxygen / xray)
  QUEUE_JOIN: 'queue:join',
  QUEUE_LEAVE: 'queue:leave',
  MATCH_FOUND: 'match:found',
  MATCH_NEXT: 'match:next',
  PARTNER_LEFT: 'partner:left',

  // plain messaging (classic / oxygen)
  MESSAGE_SEND: 'message:send',
  MESSAGE_RECEIVE: 'message:receive',

  // chain
  CHAIN_JOIN: 'chain:join',
  CHAIN_LEAVE: 'chain:leave',
  CHAIN_STATE: 'chain:state',
  CHAIN_SEND: 'chain:send',
  CHAIN_RECEIVE: 'chain:receive',
  CHAIN_STITCHED: 'chain:stitched',

  // oxygen
  OXYGEN_STATE: 'oxygen:state',
  OXYGEN_AMPOULE: 'oxygen:ampoule',
  OXYGEN_DEPLETED: 'oxygen:depleted',
  OXYGEN_SAVE: 'oxygen:save',
  OXYGEN_SAVED: 'oxygen:saved',

  // xray
  XRAY_STROKE: 'xray:stroke',
  XRAY_REMOTE_STROKE: 'xray:remote',
  XRAY_RESET: 'xray:reset',
} as const;

// ----------------------------------------------------------------------------
// Socket events: payloads
// ----------------------------------------------------------------------------
export interface ClientToServerEvents {
  [EVT.QUEUE_JOIN]: (p: { mode: Exclude<ChatMode, 'chain'>; lang: Language }) => void;
  [EVT.QUEUE_LEAVE]: () => void;
  [EVT.MATCH_NEXT]: () => void;

  [EVT.MESSAGE_SEND]: (p: { text: string }) => void;

  [EVT.CHAIN_JOIN]: (p: { lang: Language }) => void;
  [EVT.CHAIN_LEAVE]: () => void;
  [EVT.CHAIN_SEND]: (p: { slot: ChainSlot; text: string }) => void;

  [EVT.OXYGEN_AMPOULE]: () => void;
  [EVT.OXYGEN_SAVE]: () => void;

  [EVT.XRAY_STROKE]: (p: XRayStrokePayload) => void;
  [EVT.XRAY_RESET]: () => void;
}

export interface ServerToClientEvents {
  [EVT.ONLINE_COUNT]: (p: { count: number }) => void;

  [EVT.MATCH_FOUND]: (p: { mode: Exclude<ChatMode, 'chain'>; oxygen?: OxygenState }) => void;
  [EVT.PARTNER_LEFT]: () => void;

  [EVT.MESSAGE_RECEIVE]: (p: { message: ChatMessage }) => void;

  [EVT.CHAIN_STATE]: (p: { left: boolean; right: boolean }) => void;
  [EVT.CHAIN_RECEIVE]: (p: { slot: ChainSlot; message: ChatMessage }) => void;
  [EVT.CHAIN_STITCHED]: (p: { slot: ChainSlot }) => void;

  [EVT.OXYGEN_STATE]: (p: OxygenState) => void;
  [EVT.OXYGEN_DEPLETED]: () => void;
  [EVT.OXYGEN_SAVED]: (p: { slug: string }) => void;

  [EVT.XRAY_REMOTE_STROKE]: (p: XRayStrokePayload) => void;
  [EVT.XRAY_RESET]: () => void;
}
