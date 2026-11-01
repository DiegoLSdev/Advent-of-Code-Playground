import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono, type Context } from 'hono';
import { isUnlocked, isValidDay } from '../shared/calendar.ts';
import { getLanguage } from '../shared/languages.ts';
import type { Me } from '../shared/types.ts';
import * as aoc from './aoc.ts';
import { clearAll } from './cache.ts';
import { getContact, getSession, PORT, saveConfig, STATIC_DIR } from './config.ts';
import { readSolution, writeSolution } from './solutions.ts';

const app = new Hono();
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function isLocal(hostOrUrl: string | undefined): boolean {
  if (!hostOrUrl) return false;
  try {
    return LOCAL_HOSTS.has(new URL(hostOrUrl.includes('://') ? hostOrUrl : `http://${hostOrUrl}`).hostname);
  } catch {
    return false;
  }
}

// The server holds your AoC cookie: it only accepts requests from this machine
// and from pages served on localhost (prevents CSRF and DNS rebinding).
app.use('/api/*', async (c, next) => {
  const origin = c.req.header('origin');
  if (!isLocal(c.req.header('host')) || (origin && !isLocal(origin))) {
    return c.json({ error: 'Only local requests are allowed.' }, 403);
  }
  if (c.req.method !== 'GET' && !c.req.header('content-type')?.startsWith('application/json')) {
    return c.json({ error: 'Expected JSON.' }, 415);
  }
  await next();
});

app.onError((err, c) => {
  if (err instanceof aoc.AocError) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: 'Internal server error.' }, 500);
});

function yearDay(c: Context): { year: number; day: number } {
  const year = Number(c.req.param('year'));
  const day = Number(c.req.param('day'));
  if (!isValidDay(year, day)) throw new aoc.AocError(400, 'Invalid year or day.');
  if (!isUnlocked(year, day)) throw new aoc.AocError(404, 'This puzzle has not been released yet.');
  return { year, day };
}

function refresh(c: Context): boolean {
  return c.req.query('refresh') === '1';
}

async function me(): Promise<Me> {
  const contact = getContact();
  if (!getSession()) return { configured: false, valid: false, contact };
  try {
    const user = await aoc.getUser();
    return { configured: true, valid: Boolean(user), user, contact };
  } catch (err) {
    if (err instanceof aoc.AocError && err.status === 401) return { configured: true, valid: false, contact };
    throw err;
  }
}

app.get('/api/me', async (c) => c.json(await me()));

app.post('/api/config', async (c) => {
  const body = await c.req.json<{ session?: string; contact?: string }>();
  const patch: { session?: string; contact?: string } = {};
  if (typeof body.session === 'string') {
    const session = body.session.trim().replace(/^session=/, '');
    if (session && !/^[0-9a-f]+$/i.test(session)) return c.json({ error: 'The cookie must be hexadecimal.' }, 400);
    patch.session = session;
  }
  if (typeof body.contact === 'string') patch.contact = body.contact.trim();
  saveConfig(patch);
  if (patch.session !== undefined) {
    // Another account means other stars, puzzles and inputs.
    aoc.forgetUser();
    await clearAll();
  }
  return c.json(await me());
});

app.get('/api/years', async (c) => c.json(await aoc.getYears(refresh(c))));

app.get('/api/years/:year', async (c) => {
  const year = Number(c.req.param('year'));
  if (!isValidDay(year, 1)) throw new aoc.AocError(400, 'Invalid year.');
  return c.json(await aoc.getYearStars(year, refresh(c)));
});

app.get('/api/puzzle/:year/:day', async (c) => {
  const { year, day } = yearDay(c);
  return c.json(await aoc.getPuzzle(year, day, refresh(c)));
});

app.get('/api/input/:year/:day', async (c) => {
  const { year, day } = yearDay(c);
  return c.text(await aoc.getInput(year, day));
});

app.post('/api/answer/:year/:day', async (c) => {
  const { year, day } = yearDay(c);
  const { part, answer } = await c.req.json<{ part: number; answer: string }>();
  if ((part !== 1 && part !== 2) || typeof answer !== 'string' || !answer.trim()) {
    return c.json({ error: 'Invalid answer.' }, 400);
  }
  return c.json(await aoc.submitAnswer(year, day, part, answer.trim()));
});

app.get('/api/solutions/:year/:day/:lang', async (c) => {
  const { year, day } = yearDay(c);
  const lang = getLanguage(c.req.param('lang'));
  if (!lang) return c.json({ error: 'Unknown language.' }, 400);
  const code = await readSolution(year, day, lang);
  return c.json({ code: code ?? null });
});

app.put('/api/solutions/:year/:day/:lang', async (c) => {
  const { year, day } = yearDay(c);
  const lang = getLanguage(c.req.param('lang'));
  if (!lang) return c.json({ error: 'Unknown language.' }, 400);
  const { code } = await c.req.json<{ code: string }>();
  if (typeof code !== 'string') return c.json({ error: 'Invalid code.' }, 400);
  await writeSolution(year, day, lang, code);
  return c.json({ ok: true });
});

app.all('/api/*', (c) => c.json({ error: 'Not found.' }, 404));

if (process.argv.includes('--static')) {
  app.use('/*', serveStatic({ root: STATIC_DIR }));
}

serve({ fetch: app.fetch, port: PORT, hostname: '127.0.0.1' }, ({ port }) => {
  const url = process.argv.includes('--static') ? `http://localhost:${port}` : 'http://localhost:5173';
  console.log(`🎄 AoC Playground ready at ${url}`);
});
