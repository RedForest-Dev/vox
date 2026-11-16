import { GUILLOTINE_SUFFIXES, type Language, type StoryMessage } from '../../shared/types';

/**
 * Smart SEO snippets for saved stories.
 * Almost every dialog starts with "hi", so greetings are filtered out and the
 * most substantial line becomes the quote used in og:title / og:description.
 */

const FILLER: Record<Language, RegExp> = {
  ru: /^(привет\S*|здравствуй\S*|здорово|хай|ку|хеллоу|добр\S+ (день|вечер|утро|ночи)|как дела|как ты|как жизнь|как оно|что нового|чем занят\S*|есть кто|ты тут)( .*)?$/,
  en: /^(hello\S*|hi|hey\S*|yo|sup|howdy|wassup|good (morning|evening|afternoon|night)|how are you|how s it going|what s up|whats up)( .*)?$/,
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A short greeting / small-talk line that carries no content. */
export function isFiller(text: string, lang: Language): boolean {
  const norm = normalize(text);
  if (!norm) return true;
  if (norm.split(' ').length > 5) return false;
  return FILLER[lang].test(norm);
}

function stripGuillotine(text: string): string {
  let out = text;
  for (const suffix of Object.values(GUILLOTINE_SUFFIXES)) out = out.replace(suffix, '');
  return out.replace(/\s+/g, ' ').trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:!?-]+$/, '')}…`;
}

function meaningfulTexts(messages: StoryMessage[], lang: Language): string[] {
  const clean = messages.map((m) => stripGuillotine(m.text)).filter(Boolean);
  const meaningful = clean.filter((t) => !isFiller(t, lang));
  return meaningful.length > 0 ? meaningful : clean;
}

/** The most substantial line of the dialog (the longest non-greeting message). */
export function pickQuote(messages: StoryMessage[], lang: Language, max = 90): string {
  const pool = meaningfulTexts(messages, lang);
  if (pool.length === 0) return '';
  const best = pool.reduce((a, b) => (b.length >= a.length ? b : a));
  return truncate(best, max);
}

function ruWords(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'слово';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'слова';
  return 'слов';
}

export function buildTitle(lang: Language, totalWords: number, quote: string): string {
  if (lang === 'en') {
    return quote
      ? `Oxygen Masterpiece (${totalWords} words): "${quote}" — VOX`
      : `Oxygen Masterpiece (${totalWords} words) — VOX`;
  }
  const head = `Диалог на ${totalWords} ${ruWords(totalWords)} перед Гильотиной`;
  return quote ? `${head}: "${quote}" — VOX` : `${head} — VOX`;
}

export function buildDescription(messages: StoryMessage[], lang: Language): string {
  const lines = meaningfulTexts(messages, lang).slice(0, 3);
  return truncate(lines.join(' / '), 160);
}
