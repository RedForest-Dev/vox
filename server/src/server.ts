import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import { Server } from 'socket.io';
import type { ClientToServerEvents, Language, ServerToClientEvents } from '../../shared/types';
import { storyRepository } from './db/storyRepository';
import { buildDescription, buildTitle, pickQuote } from './seo';
import { registerSockets } from './socket';

const PORT = Number(process.env.PORT) || 3001;
// Canonical origin (no trailing slash). Override with SITE_URL when a custom domain is connected.
const SITE_URL = (process.env.SITE_URL || 'https://vox-e06w.onrender.com').replace(/\/+$/, '');

const app = Fastify({ logger: { level: 'info' }, routerOptions: { ignoreTrailingSlash: true } });
await app.register(cors, { origin: true });

const io = new Server<ClientToServerEvents, ServerToClientEvents>(app.server, {
  cors: { origin: true },
});
registerSockets(io);

// ---------------------------------------------------------------- REST API
app.get('/api/health', async () => ({ status: 'ok', time: Date.now() }));

// Stories are language-isolated: ?lang=ru (default) or ?lang=en
app.get<{ Querystring: { lang?: string } }>('/api/stories', async (req) => {
  const lang: Language = req.query.lang === 'en' ? 'en' : 'ru';
  return storyRepository.list(lang, 30);
});

app.get<{ Params: { slug: string } }>('/api/stories/:slug', async (req, reply) => {
  const story = storyRepository.get(req.params.slug);
  if (!story) return reply.code(404).send({ error: 'not_found' });
  return story;
});

// ------------------------------------------------- robots.txt & sitemap.xml
app.get('/robots.txt', async (_req, reply) => {
  reply
    .type('text/plain; charset=utf-8')
    .send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /socket.io/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
});

app.get('/sitemap.xml', async (_req, reply) => {
  reply
    .type('application/xml; charset=utf-8')
    .send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE_URL}/</loc></url>\n</urlset>\n`,
    );
});

// ------------------------------------------------- SEO page: /story/:slug
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const PAGE: Record<
  Language,
  {
    locale: string;
    ogLocale: string;
    heading: string;
    speaker: string;
    meta: (date: string, words: number, views: number) => string;
    end: string;
    cta: string;
  }
> = {
  ru: {
    locale: 'ru-RU',
    ogLocale: 'ru_RU',
    heading: 'Кислородный баллон',
    speaker: 'Собеседник',
    meta: (date, words, views) => `${date} · ${words} слов · просмотров: ${views}`,
    end: 'КИСЛОРОД ИСЧЕРПАН',
    cta: 'Начать свой диалог в VOX',
  },
  en: {
    locale: 'en-US',
    ogLocale: 'en_US',
    heading: 'Oxygen Tank',
    speaker: 'Speaker',
    meta: (date, words, views) => `${date} · ${words} words · views: ${views}`,
    end: 'OXYGEN DEPLETED',
    cta: 'Start your own chat on VOX',
  },
};

app.get<{ Params: { slug: string } }>('/story/:slug', async (req, reply) => {
  const story = storyRepository.get(req.params.slug);
  if (!story) {
    return reply
      .code(404)
      .type('text/html; charset=utf-8')
      .send(
        '<!doctype html><meta charset="utf-8"><title>VOX</title><body style="background:#0B0F17;color:#fff;font-family:sans-serif;text-align:center;padding:48px"><h1>Диалог не найден / Story not found</h1><a style="color:#10B981" href="/">VOX</a></body>',
      );
  }
  storyRepository.incrementViews(story.slug);

  const { lang } = story;
  const p = PAGE[lang];
  const title = buildTitle(lang, story.totalWords, pickQuote(story.messages, lang));
  const description = buildDescription(story.messages, lang);
  const date = new Date(story.createdAt).toLocaleDateString(p.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const bubbles = story.messages
    .map(
      (m) =>
        `<div class="b b${m.author}"><small>${p.speaker} ${m.author}</small><p>${esc(m.text)}</p></div>`,
    )
    .join('');

  reply.type('text/html; charset=utf-8').send(`<!doctype html>
<html lang="${lang}"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(`${SITE_URL}/story/${story.slug}`)}">
<meta property="og:url" content="${esc(`${SITE_URL}/story/${story.slug}`)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="VOX">
<meta property="og:locale" content="${p.ogLocale}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<script defer src="https://cloud.umami.is/script.js" data-website-id="6b7622c1-3ec4-440f-8c0b-e11a3b9d6ea0"></script>
<style>
body{margin:0;background:#0B0F17;color:#e2e8f0;font-family:system-ui,sans-serif;display:flex;justify-content:center;padding:24px 12px}
main{width:100%;max-width:640px}
h1{font-size:20px;margin:0 0 4px}.meta{color:#94a3b8;font-size:13px;margin-bottom:20px}
.b{max-width:82%;padding:10px 14px;border-radius:16px;margin-bottom:10px}
.b p{margin:2px 0 0;white-space:pre-wrap;line-height:1.45}.b small{opacity:.55;font-size:11px}
.b1{background:#1f2937;margin-right:auto}.b2{background:#0f766e;margin-left:auto}
.end{text-align:center;color:#f43f5e;border:1px dashed #f43f5e;border-radius:10px;padding:10px;margin:18px 0;font-size:13px}
a.cta{display:block;text-align:center;background:#10B981;color:#04231c;font-weight:700;text-decoration:none;padding:14px;border-radius:12px}
</style></head><body><main>
<h1>${p.heading}</h1>
<div class="meta">${esc(p.meta(date, story.totalWords, story.views + 1))}</div>
${bubbles}
<div class="end">${p.end}</div>
<a class="cta" href="/">${p.cta}</a>
</main></body></html>`);
});

// ------------------------------------------------ Static files & SPA fallback
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const clientDist = resolve(__dirname, '../../client/dist');

if (existsSync(clientDist)) {
  await app.register(fastifyStatic, {
    root: clientDist,
    prefix: '/',
  });

  app.setNotFoundHandler((req, reply) => {
    const url = req.raw.url || '';
    if (url.startsWith('/api') || url.startsWith('/story') || url.startsWith('/socket.io')) {
      reply.code(404).send({ error: 'not_found' });
    } else {
      reply.sendFile('index.html');
    }
  });
}

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
