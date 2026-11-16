import { Check, Loader2, Share2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { shareApp } from '../lib/share';
import type { ChatMode } from '../types';

interface Props {
  mode: ChatMode;
  onCancel: () => void;
}

export function Searching({ mode, onCancel }: Props) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);
  const text = t.searching[mode];

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const handleShare = async () => {
    const res = await shareApp(t.share.title, t.share.text);
    if (res === 'copied') {
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="mx-auto flex flex-1 flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="relative mb-8 flex items-center justify-center">
        <span className="absolute h-32 w-32 animate-ping rounded-full bg-violet-500/20" />
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-violet-500 to-sky-400">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </span>
      </div>
      <h2 className="mb-1 text-xl font-bold">{text.title}</h2>
      <p className="mb-6 text-sm text-slate-400">{text.sub}</p>
      <button
        onClick={onCancel}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm hover:bg-white/10 transition active:scale-95"
      >
        <X className="h-4 w-4" /> {t.searching.cancel}
      </button>

      {/* Viral call to action */}
      <div className="mt-8 max-w-sm rounded-2xl border border-white/10 bg-obsidian-800/60 p-4 backdrop-blur-sm">
        <div className="text-xs font-semibold text-slate-300">{t.searching.sharePrompt}</div>
        <div className="mt-1 text-xs text-slate-400 leading-relaxed">{t.searching.shareSub}</div>
        <button
          onClick={handleShare}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/15 px-4 py-2 text-xs font-medium text-violet-300 hover:bg-violet-500/25 transition active:scale-95"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-300">{t.searching.shareCopied}</span>
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5 text-violet-400" />
              <span>{t.searching.shareCta}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
