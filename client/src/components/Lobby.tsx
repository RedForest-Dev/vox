import { ArrowRight, Eye, GitFork, Gauge, MessageSquare, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useI18n } from '../i18n';
import type { ChatMode } from '../types';

interface Props {
  onPick: (mode: ChatMode) => void;
}

interface Style {
  id: ChatMode;
  Icon: LucideIcon;
  border: string;
  accent: string;
  badgeCls: string;
}

const STYLES: Style[] = [
  {
    id: 'classic',
    Icon: MessageSquare,
    border: 'border-sky-400/30 hover:border-sky-400',
    accent: 'text-sky-400',
    badgeCls: 'bg-sky-400/10 text-sky-300 border-sky-400/20',
  },
  {
    id: 'chain',
    Icon: GitFork,
    border: 'border-violet-400/40 hover:border-violet-400',
    accent: 'text-violet-400',
    badgeCls: 'bg-violet-400/15 text-violet-300 border-violet-400/30',
  },
  {
    id: 'oxygen',
    Icon: Gauge,
    border: 'border-emerald-400/40 hover:border-emerald-400',
    accent: 'text-emerald-400',
    badgeCls: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
  },
  {
    id: 'xray',
    Icon: Eye,
    border: 'border-amber-400/30 hover:border-amber-400',
    accent: 'text-amber-400',
    badgeCls: 'bg-amber-400/10 text-amber-300 border-amber-400/20',
  },
];

export function Lobby({ onPick }: Props) {
  const { t } = useI18n();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-8 animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-black tracking-tight sm:text-5xl">{t.lobby.heroTitle}</h1>
        <p className="text-sm text-slate-400 sm:text-base">{t.lobby.heroSub}</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {STYLES.map(({ id, Icon, border, accent, badgeCls }) => {
          const card = t.lobby.cards[id];
          return (
            <button
              key={id}
              onClick={() => onPick(id)}
              className={`group flex flex-col justify-between rounded-2xl border bg-obsidian-800/90 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-xl ${border}`}
            >
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 ${accent}`}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${badgeCls}`}
                  >
                    {card.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold">{card.title}</h3>
                <p className={`mb-2 text-xs font-medium ${accent}`}>{card.subtitle}</p>
                <p className="mb-4 text-sm leading-relaxed text-slate-400">{card.text}</p>
              </div>
              <div className="flex items-center justify-between border-t border-white/5 pt-3 text-sm font-semibold">
                <span>{card.cta}</span>
                <ArrowRight className={`h-4 w-4 transition group-hover:translate-x-1 ${accent}`} />
              </div>
            </button>
          );
        })}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
        {t.lobby.footer}
      </p>
    </div>
  );
}
