import { Check, Share, SquarePlus, X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';

interface Props {
  variant: 'ios' | 'other';
  onClose: () => void;
}

function Step({ n, icon, children }: { n: number; icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-xs font-semibold text-slate-300">
        {n}
      </span>
      <div className="flex-1 pt-0.5 text-sm leading-relaxed text-slate-200">{children}</div>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center text-slate-400">{icon}</span>
    </li>
  );
}

/** Bottom sheet with manual install instructions (iOS Safari has no install API). */
export function InstallModal({ variant, onClose }: Props) {
  const { t } = useI18n();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t.install.title}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md animate-fade-in rounded-t-2xl border border-white/10 bg-obsidian-800 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl"
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold">{t.install.title}</h2>
          <button
            onClick={onClose}
            aria-label={t.install.close}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {variant === 'ios' ? (
          <>
            <p className="mb-4 text-xs text-slate-400">{t.install.iosLead}</p>
            <ol className="space-y-4">
              <Step n={1} icon={<Share className="h-5 w-5" />}>
                {t.install.iosStep1}
              </Step>
              <Step n={2} icon={<SquarePlus className="h-5 w-5" />}>
                {t.install.iosStep2}
              </Step>
              <Step n={3} icon={<Check className="h-5 w-5" />}>
                {t.install.iosStep3}
              </Step>
            </ol>
            <p className="mt-4 border-t border-white/5 pt-3 text-xs text-slate-500">{t.install.iosSafariOnly}</p>
          </>
        ) : (
          <>
            <p className="mb-4 text-xs text-slate-400">{t.install.otherLead}</p>
            <ol className="space-y-4">
              <Step n={1} icon={null}>
                {t.install.otherStep1}
              </Step>
              <Step n={2} icon={null}>
                {t.install.otherStep2}
              </Step>
            </ol>
          </>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold hover:bg-white/10"
        >
          {t.install.close}
        </button>
      </div>
    </div>,
    document.body,
  );
}
