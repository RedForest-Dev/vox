import { AlertTriangle, Check, Copy, Gauge, LogOut, Share2, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { socket } from '../../services/socket';
import { useHaptic } from '../../hooks/useHaptic';
import { useI18n } from '../../i18n';
import { copyText } from '../../lib/share';
import {
  EVT,
  OXYGEN_AMPOULE_BONUS,
  OXYGEN_INITIAL_POOL,
  type ChatMessage,
  type OxygenState,
} from '../../types';
import { ChatPane } from '../chat/ChatPane';

interface Props {
  initial?: OxygenState;
  partnerPresent: boolean;
  onLeave: () => void;
}

const EMPTY: OxygenState = {
  poolRemaining: OXYGEN_INITIAL_POOL,
  poolMax: OXYGEN_INITIAL_POOL,
  wordsBurnedByMe: 0,
  wordsBurnedByPartner: 0,
  myAmpouleAvailable: true,
  partnerAmpouleUsed: false,
  depleted: false,
};

export function OxygenView({ initial, partnerPresent, onLeave }: Props) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [ox, setOx] = useState<OxygenState>(initial ?? EMPTY);
  const [slug, setSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const haptic = useHaptic();

  useEffect(() => {
    const onMsg = ({ message }: { message: ChatMessage }) => {
      setMessages((m) => [...m, message]);
      if (!message.isSelf) haptic('tap');
    };
    const onState = (s: OxygenState) => setOx(s);
    const onDepleted = () => haptic('guillotine');
    const onSaved = ({ slug }: { slug: string }) => setSlug(slug);

    socket.on(EVT.MESSAGE_RECEIVE, onMsg);
    socket.on(EVT.OXYGEN_STATE, onState);
    socket.on(EVT.OXYGEN_DEPLETED, onDepleted);
    socket.on(EVT.OXYGEN_SAVED, onSaved);
    return () => {
      socket.off(EVT.MESSAGE_RECEIVE, onMsg);
      socket.off(EVT.OXYGEN_STATE, onState);
      socket.off(EVT.OXYGEN_DEPLETED, onDepleted);
      socket.off(EVT.OXYGEN_SAVED, onSaved);
    };
  }, [haptic]);

  const locked = !partnerPresent || ox.depleted;

  const send = () => {
    const text = draft.trim();
    if (!text || locked) return;
    socket.emit(EVT.MESSAGE_SEND, { text });
    setDraft('');
  };

  const ampoule = () => {
    haptic('strong');
    socket.emit(EVT.OXYGEN_AMPOULE);
  };

  const copyLink = async () => {
    if (!slug) return;
    if (await copyText(`${window.location.origin}/story/${slug}`)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const pct = Math.max(0, Math.min(100, Math.round((ox.poolRemaining / ox.poolMax) * 100)));
  const draftWords = draft.match(/\S+/g)?.length ?? 0;
  const barColor =
    pct > 40 ? 'from-emerald-500 to-teal-400' : pct > 15 ? 'from-amber-500 to-orange-500' : 'from-rose-600 to-red-500';
  const totalBurned = ox.wordsBurnedByMe + ox.wordsBurnedByPartner;
  const myShare = totalBurned ? Math.round((ox.wordsBurnedByMe / totalBurned) * 100) : 0;

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col border-x border-white/5 bg-obsidian-800">
      <ChatPane
        accent="emerald"
        messages={messages}
        value={draft}
        onChange={setDraft}
        onSubmit={send}
        disabled={locked}
        placeholder={
          ox.depleted
            ? t.oxygen.placeholderDepleted
            : partnerPresent
              ? t.oxygen.placeholderActive
              : t.oxygen.placeholderLeft
        }
        emptyText={t.oxygen.empty}
        header={
          <div className="border-b border-white/10 bg-obsidian-950 px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/15 text-emerald-400">
                  <Gauge className="h-4 w-4" />
                </span>
                <div className="text-xs">
                  <div className="font-bold">{t.oxygen.words(ox.poolRemaining, ox.poolMax)}</div>
                  <div className="text-slate-400">
                    {partnerPresent ? t.oxygen.partnerBreathing : t.oxygen.partnerLeft}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {ox.myAmpouleAvailable && partnerPresent && (
                  <button
                    onClick={ampoule}
                    title={t.oxygen.ampouleTitle}
                    className="flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-400/25"
                  >
                    <Zap className="h-3.5 w-3.5" /> {t.oxygen.ampoule(OXYGEN_AMPOULE_BONUS)}
                  </button>
                )}
                <button
                  onClick={onLeave}
                  className="rounded-lg bg-white/5 p-2 text-slate-300 hover:bg-rose-500/20 hover:text-rose-300"
                  aria-label={t.oxygen.leave}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full border border-white/5 bg-obsidian-700">
              <div
                className={`h-full rounded-full bg-gradient-to-r transition-all duration-300 ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[10px] text-slate-400">
              <span>{t.oxygen.youBurned(ox.wordsBurnedByMe, myShare)}</span>
              <span>{t.oxygen.partnerBurned(ox.wordsBurnedByPartner, totalBurned ? 100 - myShare : 0)}</span>
            </div>
            {ox.partnerAmpouleUsed && (
              <div className="mt-1 text-[10px] text-emerald-400">{t.oxygen.partnerAmpoule}</div>
            )}
          </div>
        }
      />

      {ox.depleted && (
        <div className="flex items-center justify-center gap-1.5 border-t border-rose-500/40 bg-rose-500/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-rose-300">
          <AlertTriangle className="h-4 w-4" /> {t.oxygen.depleted}
        </div>
      )}

      {messages.length > 0 && (
        <div className="flex items-center justify-between gap-2 border-t border-white/5 bg-obsidian-950 px-3 py-2 text-xs">
          <span className="text-slate-300 truncate">
            {draftWords > 0 && !locked
              ? t.oxygen.draftWords(draftWords)
              : slug
                ? t.oxygen.savedHint
                : ox.depleted
                  ? t.oxygen.saveHint
                  : t.oxygen.saveLocked}
          </span>
          {slug ? (
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 shrink-0 rounded-lg border border-emerald-400/40 bg-emerald-400/15 px-3 py-1.5 font-bold text-emerald-300 transition active:scale-95"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? t.oxygen.copied : t.oxygen.copy}
            </button>
          ) : (
            <button
              onClick={() => {
                if (ox.depleted) {
                  socket.emit(EVT.OXYGEN_SAVE);
                  haptic('soft');
                }
              }}
              disabled={!ox.depleted}
              title={ox.depleted ? t.oxygen.save : t.oxygen.saveLocked}
              className={`flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-1.5 font-bold transition active:scale-95 ${
                ox.depleted
                  ? 'bg-emerald-400 text-obsidian-950 hover:bg-emerald-300 animate-pulse shadow-[0_0_12px_#34d399]'
                  : 'border border-white/5 bg-white/5 text-slate-500 opacity-40 cursor-not-allowed'
              }`}
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>{t.oxygen.save}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
