import { BookOpen, Download, Globe, Radio, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { usePWA } from '../../hooks/usePWA';
import { useI18n } from '../../i18n';
import { shareApp } from '../../lib/share';
import type { Language } from '../../types';
import { InstallModal } from '../InstallModal';

interface Props {
  online: number;
  onHome: () => void;
  onStories?: () => void;
  /** language cannot be switched while searching / chatting (queues are per language) */
  langLocked: boolean;
}

const btn =
  'flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 transition hover:bg-white/10 active:scale-95';

export function Header({ online, onHome, onStories, langLocked }: Props) {
  const { lang, setLang, t } = useI18n();
  const { installed, isIOS, install } = usePWA();
  const [modal, setModal] = useState<'ios' | 'other' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const showToast = (text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  };

  const onShare = async () => {
    const result = await shareApp(t.share.title, t.share.text);
    if (result === 'copied') showToast(t.header.shareCopied);
  };

  const onInstall = async () => {
    if (isIOS) {
      setModal('ios'); // iOS has no install API: show manual steps
      return;
    }
    if ((await install()) === 'manual') setModal('other');
  };

  const langButton = (code: Language) => (
    <button
      key={code}
      onClick={() => setLang(code)}
      disabled={langLocked}
      aria-pressed={lang === code}
      className={`px-2 py-1 text-xs font-semibold uppercase transition disabled:cursor-not-allowed ${
        lang === code ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white disabled:hover:text-slate-400'
      } ${langLocked && lang !== code ? 'opacity-40' : ''}`}
    >
      {code}
    </button>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-obsidian-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 py-2">
        {/* DESKTOP layout (md+) */}
        <div className="hidden md:flex min-h-12 items-center gap-3">
          <button onClick={onHome} className="flex items-center gap-2 active:scale-95">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-500 to-sky-400">
              <Radio className="h-4 w-4 text-white" />
            </span>
            <span className="text-lg font-black tracking-wider">VOX</span>
          </button>

          <a
            href="https://virx-topic-pulse.com/search/virus-x.html"
            target="_blank"
            rel="noopener noreferrer"
            title={t.header.creatorsTitle}
            className="flex items-center rounded-lg border border-orange-500/30 bg-obsidian-800/90 px-2.5 py-1 text-xs font-semibold text-orange-400 shadow-sm transition hover:border-orange-500/60 hover:text-orange-300 active:scale-95"
          >
            By Virus-X creators
          </a>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={onShare} className={btn} title={t.header.share} aria-label={t.header.share}>
              <Share2 className="h-4 w-4 text-sky-400" />
              <span>{t.header.share}</span>
            </button>

            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {online > 0 ? t.header.online(online) : t.header.connecting}
            </div>

            <div
              className="flex items-center overflow-hidden rounded-lg border border-white/10 bg-white/5"
              role="group"
              aria-label={t.header.language}
              title={langLocked ? t.header.languageLocked : t.header.language}
            >
              <span className="pl-2 text-slate-400">
                <Globe className="h-3.5 w-3.5" />
              </span>
              {(['ru', 'en'] as Language[]).map(langButton)}
            </div>

            {onStories && (
              <button onClick={onStories} className={btn}>
                <BookOpen className="h-4 w-4 text-emerald-400" />
                <span>{t.header.stories}</span>
              </button>
            )}

            {!installed && (
              <button
                onClick={onInstall}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-sky-500 px-2.5 py-1.5 text-xs font-semibold text-white transition active:scale-95"
                aria-label={t.header.install}
              >
                <Download className="h-4 w-4" />
                <span>{t.header.install}</span>
              </button>
            )}
          </div>
        </div>

        {/* MOBILE layout (< md) */}
        <div className="flex flex-col gap-2 md:hidden">
          {/* Row 1: Brand & Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={onHome} className="flex items-center gap-1.5 active:scale-95">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-500 to-sky-400">
                  <Radio className="h-3.5 w-3.5 text-white" />
                </span>
                <span className="text-base font-black tracking-wider">VOX</span>
              </button>

              <a
                href="https://virx-topic-pulse.com/search/virus-x.html"
                target="_blank"
                rel="noopener noreferrer"
                title={t.header.creatorsTitle}
                className="flex items-center rounded-lg border border-orange-500/30 bg-obsidian-800/90 px-2 py-0.5 text-[10px] font-semibold text-orange-400 shadow-sm transition hover:border-orange-500/60 active:scale-95"
              >
                By Virus-X creators
              </a>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <button
                onClick={onShare}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 active:scale-95"
                title={t.header.share}
                aria-label={t.header.share}
              >
                <Share2 className="h-4 w-4 text-sky-400" />
              </button>

              {!installed && (
                <button
                  onClick={onInstall}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-sky-500 px-2.5 text-xs font-semibold text-white shadow-sm transition active:scale-95"
                  aria-label={t.header.install}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{t.header.install}</span>
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Status & Navigation */}
          <div className="flex items-center justify-between border-t border-white/5 pt-1.5 text-xs">
            {/* Left: Online */}
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {online > 0 ? t.header.online(online) : t.header.connecting}
            </div>

            {/* Center: Stories */}
            {onStories ? (
              <button
                onClick={onStories}
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200 transition hover:bg-white/10 active:scale-95"
              >
                <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
                <span>{t.header.stories}</span>
              </button>
            ) : (
              <div />
            )}

            {/* Right: Language */}
            <div
              className="flex items-center overflow-hidden rounded-lg border border-white/10 bg-white/5 shrink-0"
              role="group"
              aria-label={t.header.language}
              title={langLocked ? t.header.languageLocked : t.header.language}
            >
              <span className="pl-1.5 text-slate-400">
                <Globe className="h-3 w-3" />
              </span>
              {(['ru', 'en'] as Language[]).map(langButton)}
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 animate-fade-in rounded-lg border border-emerald-400/30 bg-obsidian-800 px-3 py-1.5 text-xs font-semibold text-emerald-300 shadow-lg"
        >
          {toast}
        </div>
      )}

      {modal && <InstallModal variant={modal} onClose={() => setModal(null)} />}
    </header>
  );
}
