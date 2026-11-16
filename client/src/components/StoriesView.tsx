import { ArrowLeft, Eye, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import type { Story, StorySummary } from '../types';

interface Props {
  onBack: () => void;
}

export function StoriesView({ onBack }: Props) {
  const { lang, t } = useI18n();
  const [list, setList] = useState<StorySummary[] | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [error, setError] = useState(false);

  // Masterpieces are language-isolated: the list always matches the interface language.
  useEffect(() => {
    let cancelled = false;
    setList(null);
    setStory(null);
    setError(false);
    fetch(`/api/stories?lang=${lang}`)
      .then((r) => r.json())
      .then((data: StorySummary[]) => !cancelled && setList(data))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const open = (slug: string) =>
    fetch(`/api/stories/${slug}`)
      .then((r) => r.json())
      .then(setStory)
      .catch(() => setError(true));

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 animate-fade-in">
      <button
        onClick={story ? () => setStory(null) : onBack}
        className="mb-6 flex items-center gap-2 text-sm text-slate-300 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> {story ? t.stories.backAll : t.stories.back}
      </button>

      {error && <p className="text-sm text-rose-300">{t.stories.loadError}</p>}

      {story ? (
        <div className="rounded-2xl border border-white/10 bg-obsidian-800 p-5">
          <div className="mb-4 text-xs text-slate-400">
            {t.stories.words(story.totalWords)} · {t.stories.views(story.views)}
          </div>
          <div className="space-y-2">
            {story.messages.map((m, i) => (
              <div key={i} className={`flex ${m.author === 2 ? 'justify-end' : ''}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                    m.author === 2 ? 'bg-teal-700/80' : 'bg-obsidian-700'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <a
            href={`/story/${story.slug}`}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:underline"
          >
            {t.stories.publicPage} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      ) : (
        <>
          <h2 className="mb-1 text-2xl font-bold">{t.stories.title}</h2>
          <p className="mb-5 text-xs text-slate-400">{t.stories.subtitle}</p>
          {list === null && !error && <p className="text-sm text-slate-500">{t.stories.loading}</p>}
          {list?.length === 0 && <p className="text-sm text-slate-500">{t.stories.empty}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {list?.map((s) => (
              <button
                key={s.slug}
                onClick={() => open(s.slug)}
                className="rounded-2xl border border-white/10 bg-obsidian-800/80 p-4 text-left transition hover:border-emerald-400/40"
              >
                <div className="mb-2 flex justify-between text-[11px] text-slate-400">
                  <span className="font-mono text-emerald-400">{t.stories.words(s.totalWords)}</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {s.views}
                  </span>
                </div>
                <p className="line-clamp-3 text-sm italic text-slate-300">«{s.preview}»</p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
