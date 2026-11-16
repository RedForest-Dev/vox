import { LogOut, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { socket } from '../../services/socket';
import { useHaptic } from '../../hooks/useHaptic';
import { useI18n } from '../../i18n';
import { EVT, type ChainSlot, type ChatMessage } from '../../types';
import { ChatPane } from '../chat/ChatPane';

interface Props {
  onLeave: () => void;
}

/**
 * Two windows. Desktop (md+): side by side 50/50.
 * Mobile: one full-size window + tab switcher ("swipe bridge") with an unread dot.
 * The ⇄ button copies text into the OTHER window's input. No marker is ever added.
 */
export function ChainView({ onLeave }: Props) {
  const { lang, t } = useI18n();
  const [msgs, setMsgs] = useState<Record<ChainSlot, ChatMessage[]>>({ left: [], right: [] });
  const [drafts, setDrafts] = useState<Record<ChainSlot, string>>({ left: '', right: '' });
  const [linked, setLinked] = useState<Record<ChainSlot, boolean>>({ left: false, right: false });
  const [unread, setUnread] = useState<Record<ChainSlot, boolean>>({ left: false, right: false });
  const [tab, setTab] = useState<ChainSlot>('left');
  const [stitched, setStitched] = useState(false);
  const tabRef = useRef<ChainSlot>('left');
  const inputs = { left: useRef<HTMLTextAreaElement>(null), right: useRef<HTMLTextAreaElement>(null) };
  const touchX = useRef<number | null>(null);
  const haptic = useHaptic();

  const switchTab = (slot: ChainSlot) => {
    tabRef.current = slot;
    setTab(slot);
    setUnread((u) => ({ ...u, [slot]: false }));
  };

  useEffect(() => {
    socket.emit(EVT.CHAIN_JOIN, { lang });

    const onState = (s: { left: boolean; right: boolean }) => setLinked(s);
    const onMsg = ({ slot, message }: { slot: ChainSlot; message: ChatMessage }) => {
      setMsgs((m) => ({ ...m, [slot]: [...m[slot], message] }));
      if (!message.isSelf) {
        haptic('tap');
        if (slot !== tabRef.current) setUnread((u) => ({ ...u, [slot]: true }));
      }
    };
    let timer: number | undefined;
    const onStitched = () => {
      setStitched(true);
      haptic('soft');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setStitched(false), 3500);
    };

    socket.on(EVT.CHAIN_STATE, onState);
    socket.on(EVT.CHAIN_RECEIVE, onMsg);
    socket.on(EVT.CHAIN_STITCHED, onStitched);
    return () => {
      socket.off(EVT.CHAIN_STATE, onState);
      socket.off(EVT.CHAIN_RECEIVE, onMsg);
      socket.off(EVT.CHAIN_STITCHED, onStitched);
      window.clearTimeout(timer);
      socket.emit(EVT.CHAIN_LEAVE);
    };
  }, [haptic, lang]);

  const send = (slot: ChainSlot) => {
    const text = drafts[slot].trim();
    if (!text || !linked[slot]) return;
    socket.emit(EVT.CHAIN_SEND, { slot, text });
    setDrafts((d) => ({ ...d, [slot]: '' }));
  };

  const bridge = (from: ChainSlot, text: string) => {
    const to: ChainSlot = from === 'left' ? 'right' : 'left';
    setDrafts((d) => ({ ...d, [to]: text }));
    switchTab(to);
    haptic('soft');
    window.setTimeout(() => inputs[to].current?.focus(), 50);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 70) return;
    switchTab(dx < 0 ? 'right' : 'left');
  };

  const pane = (slot: ChainSlot) => (
    <div
      key={slot}
      className={`min-h-0 flex-1 flex-col bg-obsidian-800/40 ${
        slot === 'left' ? 'md:border-r md:border-white/5' : ''
      } ${tab === slot ? 'flex' : 'hidden md:flex'}`}
    >
      <ChatPane
        accent="purple"
        messages={msgs[slot]}
        value={drafts[slot]}
        onChange={(v) => setDrafts((d) => ({ ...d, [slot]: v }))}
        onSubmit={() => send(slot)}
        disabled={!linked[slot]}
        placeholder={
          linked[slot]
            ? slot === 'left'
              ? t.chain.placeholderLeft
              : t.chain.placeholderRight
            : t.chain.searching
        }
        emptyText={linked[slot] ? t.chain.linked : t.chain.searching}
        onBridge={(text) => bridge(slot, text)}
        inputRef={inputs[slot]}
        header={
          <div className="hidden items-center gap-2 border-b border-white/5 bg-obsidian-950/50 px-4 py-2 text-xs font-semibold text-slate-300 md:flex">
            <span className={`h-2 w-2 rounded-full ${linked[slot] ? 'bg-emerald-400' : 'animate-pulse bg-amber-500'}`} />
            {slot === 'left' ? t.chain.slotLeft : t.chain.slotRight}
          </div>
        }
      />
    </div>
  );

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col border-x border-white/5 bg-obsidian-900">
      <div className="flex items-center justify-between border-b border-white/5 bg-obsidian-800/80 px-4 py-2 sm:py-2.5">
        <div className="text-xs">
          <div className="font-bold">{t.chain.title}</div>
          <div className="hidden text-slate-400 sm:block">{t.chain.subtitle}</div>
        </div>
        <button
          onClick={onLeave}
          className="flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20"
        >
          <LogOut className="h-3.5 w-3.5" /> {t.chain.leave}
        </button>
      </div>

      {stitched && (
        <div className="flex animate-fade-in items-center justify-center gap-2 border-b border-violet-400/30 bg-violet-500/15 px-4 py-1.5 text-xs font-semibold text-violet-300">
          <RefreshCw className="h-3.5 w-3.5" /> {t.chain.stitched}
        </div>
      )}

      {/* mobile tab switcher */}
      <div className="flex border-b border-white/5 bg-obsidian-800 md:hidden">
        {(['left', 'right'] as ChainSlot[]).map((slot) => {
          const isUnread = unread[slot] && tab !== slot;
          return (
            <button
              key={slot}
              onClick={() => switchTab(slot)}
              className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-2 sm:py-2.5 text-xs font-bold transition ${
                tab === slot
                  ? 'border-violet-400 bg-white/5 text-white'
                  : isUnread
                    ? 'border-transparent text-emerald-400 hover:text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {linked[slot] ? (
                isUnread ? (
                  <span className="relative flex h-3 w-3 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  </span>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                )
              ) : (
                <span className="h-2 w-2 rounded-full bg-amber-500" />
              )}
              <span>{slot === 'left' ? t.chain.tabLeft : t.chain.tabRight}</span>
            </button>
          );
        })}
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col md:flex-row"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {pane('left')}
        {pane('right')}
      </div>
    </div>
  );
}
