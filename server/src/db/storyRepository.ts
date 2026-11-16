import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Language, Story, StoryMessage, StorySummary } from '../../../shared/types';

interface Row {
  slug: string;
  lang: string;
  created_at: number;
  total_words: number;
  views: number;
  messages_json: string;
}

const dataDir = resolve(process.cwd(), 'data');
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(resolve(dataDir, 'vox.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS stories (
    slug TEXT PRIMARY KEY,
    lang TEXT NOT NULL DEFAULT 'ru',
    created_at INTEGER NOT NULL,
    total_words INTEGER NOT NULL,
    views INTEGER NOT NULL DEFAULT 0,
    messages_json TEXT NOT NULL
  )
`);

// Migration for databases created before multilingual support (all old stories are Russian).
const columns = db.prepare('PRAGMA table_info(stories)').all() as unknown as { name: string }[];
if (!columns.some((c) => c.name === 'lang')) {
  db.exec("ALTER TABLE stories ADD COLUMN lang TEXT NOT NULL DEFAULT 'ru'");
}

const insertStmt = db.prepare(
  'INSERT INTO stories (slug, lang, created_at, total_words, views, messages_json) VALUES (?, ?, ?, ?, 0, ?)',
);
const getStmt = db.prepare('SELECT * FROM stories WHERE slug = ?');
const listStmt = db.prepare('SELECT * FROM stories WHERE lang = ? ORDER BY created_at DESC LIMIT ?');
const viewStmt = db.prepare('UPDATE stories SET views = views + 1 WHERE slug = ?');

function toStory(row: Row): Story {
  return {
    slug: row.slug,
    lang: row.lang === 'en' ? 'en' : 'ru',
    createdAt: row.created_at,
    totalWords: row.total_words,
    views: row.views,
    messages: JSON.parse(row.messages_json) as StoryMessage[],
  };
}

function newSlug(): string {
  return randomBytes(6).toString('base64url').replace(/[-_]/g, 'x').slice(0, 7).toLowerCase();
}

export const storyRepository = {
  save(messages: StoryMessage[], totalWords: number, lang: Language): string {
    const slug = newSlug();
    insertStmt.run(slug, lang, Date.now(), totalWords, JSON.stringify(messages));
    return slug;
  },

  get(slug: string): Story | null {
    const row = getStmt.get(slug) as unknown as Row | undefined;
    return row ? toStory(row) : null;
  },

  incrementViews(slug: string): void {
    viewStmt.run(slug);
  },

  list(lang: Language, limit = 30): StorySummary[] {
    const rows = listStmt.all(lang, limit) as unknown as Row[];
    return rows.map((row) => {
      const { messages, ...rest } = toStory(row);
      return { ...rest, preview: (messages[0]?.text ?? '').slice(0, 140) };
    });
  },
};
