import { ArrowLeftRight, Send } from 'lucide-react';
import { useEffect, useRef, type FormEvent, type ReactNode, type RefObject } from 'react';
import { useI18n } from '../../i18n';
import type { ChatMessage } from '../../types';

export type Accent = 'blue' | 'purple' | 'emerald';

const STYLES: Record<Accent, { own: string; btn: string; focus: string }> = {
  blue: {
    own: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white',
    btn: 'bg-sky-500 hover:bg-sky-400',
    focus: 'focus:border-sky-400',
  },
  purple: {
    own: 'bg-gradient-to-br from-violet-500 to-purple-600 text-white',
    btn: 'bg-violet-500 hover:bg-violet-400',
    focus: 'focus:border-violet-400',
  },
  emerald: {
    own: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
    btn: 'bg-emerald-500 hover:bg-emerald-400',
    focus: 'focus:border-emerald-400',
  },
};

interface Props {
  messages: ChatMessage[];
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder: string;
  emptyText: string;
  accent: Accent;
  /** when set, every bubble gets a "⇄" button (chain bridge) */
  onBridge?: (text: string) => void;
  inputRef?: RefObject<HTMLTextAreaElement>;
  header?: ReactNode;
}

export function ChatPane({
  messages,
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
  emptyText,
  accent,
  onBridge,
  inputRef,
  header,
}: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const activeRef = inputRef ?? internalRef;
  const { t } = useI18n();
  const s = STYLES[accent];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Auto-resize textarea height to fit content (min 44px, max ~140px / 5 lines)
  useEffect(() => {
    const el = activeRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const computedHeight = Math.min(Math.max(el.scrollHeight, 44), 140);
    el.style.height = `${computedHeight}px`;
  }, [value, activeRef]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!disabled && value.trim()) {
      onSubmit();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const isMobileTouch =
        typeof window !== 'undefined' &&
        'ontouchstart' in window &&
        window.innerWidth < 768;
      // On desktop: Enter sends, Shift+Enter adds newline
      // On mobile touch: Enter adds newline, Send button sends
      if (!e.shiftKey && !isMobileTouch) {
        e.preventDefault();
        if (!disabled && value.trim()) {
          onSubmit();
        }
      }
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {header}
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
            {emptyText}
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex animate-fade-in items-center gap-1.5 ${m.isSelf ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                m.isSelf ? s.own : 'border border-white/10 bg-obsidian-700 text-slate-100'
              }`}
            >
              {m.text}
            </div>
            {onBridge && (
              <button
                type="button"
                onClick={() => onBridge(m.text)}
                title={t.chat.bridge}
                className="rounded-lg bg-white/5 p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white active:scale-95"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex items-end gap-2 border-t border-white/5 bg-obsidian-950 p-3">
        <textarea
          ref={activeRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className={`min-h-[44px] max-h-36 min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-obsidian-800 px-4 py-2.5 text-sm leading-relaxed text-white outline-none placeholder:text-slate-500 disabled:opacity-40 overflow-y-auto ${s.focus}`}
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition active:scale-95 disabled:opacity-30 ${s.btn}`}
          aria-label={t.chat.send}
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
