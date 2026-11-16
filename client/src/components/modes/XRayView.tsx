import { ChevronDown, ChevronUp, Eraser, LogOut, SkipForward } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { socket } from '../../services/socket';
import { useHaptic } from '../../hooks/useHaptic';
import { useI18n } from '../../i18n';
import { EVT, XRAY_THROTTLE_MS, type XRayStrokePayload } from '../../types';

interface Props {
  partnerPresent: boolean;
  onNext: () => void;
  onLeave: () => void;
}

const MAX_GHOST = 30;

function Ghost({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((g, i) => (
        <span
          key={`${i}-${g}`}
          className="animate-ghost-fall inline-block max-w-full break-words rounded bg-white/5 px-2 py-0.5 text-xs italic text-slate-300 line-through"
        >
          {g}
        </span>
      ))}
    </div>
  );
}

export function XRayView({ partnerPresent, onNext, onLeave }: Props) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [ghost, setGhost] = useState<string[]>([]);
  const [remote, setRemote] = useState<XRayStrokePayload>({ currentText: '', ghost: [] });
  const [isGhostCollapsed, setIsGhostCollapsed] = useState(false);
  const haptic = useHaptic();

  const prev = useRef('');
  const lastWasDelete = useRef(false);
  const latest = useRef<XRayStrokePayload>({ currentText: '', ghost: [] });
  const timer = useRef<number | null>(null);
  const partnerScrollRef = useRef<HTMLDivElement>(null);
  const ghostScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onStroke = (p: XRayStrokePayload) => {
      setRemote(p);
      haptic('tap');
    };
    const onReset = () => setRemote({ currentText: '', ghost: [] });
    socket.on(EVT.XRAY_REMOTE_STROKE, onStroke);
    socket.on(EVT.XRAY_RESET, onReset);
    return () => {
      socket.off(EVT.XRAY_REMOTE_STROKE, onStroke);
      socket.off(EVT.XRAY_RESET, onReset);
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [haptic]);

  // Auto-scroll partner's reading pane down to follow the active typing cursor
  useEffect(() => {
    if (partnerScrollRef.current) {
      partnerScrollRef.current.scrollTop = partnerScrollRef.current.scrollHeight;
    }
  }, [remote.currentText]);

  // Auto-scroll partner's ghost pane down to reveal newly erased fragments
  useEffect(() => {
    if (ghostScrollRef.current) {
      ghostScrollRef.current.scrollTop = ghostScrollRef.current.scrollHeight;
    }
  }, [remote.ghost]);

  const flush = () => {
    timer.current = null;
    socket.emit(EVT.XRAY_STROKE, latest.current);
  };

  const onChange = (next: string) => {
    const before = prev.current;
    let nextGhost = ghost;

    if (next.length < before.length) {
      // Something was erased: find the removed fragment and drop it into the ghost layer.
      let p = 0;
      while (p < next.length && next[p] === before[p]) p++;
      const removed = before.slice(p, p + (before.length - next.length));
      if (removed.length > 0) {
        if (lastWasDelete.current && nextGhost.length > 0) {
          // consecutive backspaces grow the same fragment backwards, preserving spaces
          nextGhost = [...nextGhost.slice(0, -1), removed + nextGhost[nextGhost.length - 1]];
          setGhost(nextGhost);
        } else if (removed.trim()) {
          // new fragment starts only if it contains non-whitespace
          nextGhost = [...nextGhost, removed].slice(-MAX_GHOST);
          setGhost(nextGhost);
        }
      }
      lastWasDelete.current = true;
    } else {
      lastWasDelete.current = false;
    }

    prev.current = next;
    setText(next);
    latest.current = { currentText: next, ghost: nextGhost };
    if (timer.current === null) timer.current = window.setTimeout(flush, XRAY_THROTTLE_MS);
  };

  const clearAll = () => {
    prev.current = '';
    lastWasDelete.current = false;
    latest.current = { currentText: '', ghost: [] };
    setText('');
    setGhost([]);
    socket.emit(EVT.XRAY_RESET);
    haptic('soft');
  };

  const clearRemoteGhost = () => {
    setRemote((prev) => ({ ...prev, ghost: [] }));
    haptic('soft');
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-1 flex-col border-x border-white/5 bg-obsidian-900">
      <div className="flex items-center justify-between border-b border-white/5 bg-obsidian-800/80 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs">
          <span className={`h-2 w-2 rounded-full ${partnerPresent ? 'bg-emerald-400' : 'bg-rose-500'}`} />
          <span className="font-bold">{t.xray.title}</span>
          <span className="text-slate-400">{partnerPresent ? t.xray.flowing : t.xray.partnerLeft}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onNext}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
          >
            <SkipForward className="h-3.5 w-3.5 text-amber-400" /> {t.xray.next}
          </button>
          <button
            onClick={onLeave}
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20"
          >
            <LogOut className="h-3.5 w-3.5" /> {t.xray.leave}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 sm:p-4 touch-pan-y">
        {/* Partner's live text + ghost layer */}
        <section className="flex min-h-[10rem] flex-1 flex-col gap-3 rounded-2xl border border-white/10 bg-obsidian-800/70 p-4">
          <div className="shrink-0 text-xs font-semibold text-slate-300">{t.xray.partnerTyping}</div>
          <div
            ref={partnerScrollRef}
            className="flex-1 min-h-[4rem] overflow-y-auto whitespace-pre-wrap break-words pr-1 text-base leading-relaxed sm:text-lg touch-pan-y"
          >
            {remote.currentText ? (
              <>
                {remote.currentText}
                <span className="ml-0.5 inline-block h-5 w-1.5 animate-pulse bg-amber-400 align-middle" />
              </>
            ) : (
              <span className="italic text-slate-600">
                {partnerPresent ? t.xray.silence : t.xray.partnerLeft}
              </span>
            )}
          </div>
          {remote.ghost.length > 0 && (
            <div className="shrink-0 border-t border-white/5 pt-2 max-h-[30%] flex flex-col min-h-0">
              <div className="mb-1 flex items-center justify-between shrink-0 text-[11px] font-medium text-amber-400/80">
                <span>{t.xray.ghostTitle}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setIsGhostCollapsed((prev) => !prev);
                      haptic('tap');
                    }}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors"
                    title={isGhostCollapsed ? t.xray.expandGhost : t.xray.collapseGhost}
                  >
                    {isGhostCollapsed ? (
                      <>
                        <ChevronDown className="h-3 w-3 text-amber-400" />
                        <span>{t.xray.expandGhost}</span>
                      </>
                    ) : (
                      <>
                        <ChevronUp className="h-3 w-3" />
                        <span>{t.xray.collapseGhost}</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={clearRemoteGhost}
                    className="flex items-center rounded p-1 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                    title={t.xray.clearGhost}
                    aria-label={t.xray.clearGhost}
                  >
                    <Eraser className="h-3 w-3" />
                  </button>
                </div>
              </div>
              {!isGhostCollapsed && (
                <div
                  ref={ghostScrollRef}
                  className="flex-1 min-h-0 max-h-24 sm:max-h-28 overflow-y-auto pr-1 touch-pan-y"
                >
                  <Ghost items={remote.ghost} />
                </div>
              )}
            </div>
          )}
        </section>

        {/* User's input section */}
        <section className="flex h-48 shrink-0 flex-col gap-2 rounded-2xl border border-white/10 bg-obsidian-800/70 p-4">
          <div className="flex shrink-0 items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">{t.xray.you}</span>
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-slate-400 hover:text-white"
            >
              <Eraser className="h-3 w-3" /> {t.xray.clearAll}
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => onChange(e.target.value)}
            disabled={!partnerPresent}
            placeholder={partnerPresent ? t.xray.placeholder : t.xray.placeholderLeft}
            className="min-h-0 flex-1 resize-none bg-transparent leading-relaxed text-white outline-none placeholder:text-slate-600 disabled:opacity-40 overflow-y-auto touch-pan-y"
          />
        </section>
      </div>
    </div>
  );
}
