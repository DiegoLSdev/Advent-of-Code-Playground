// adventofcode.com client: a single request queue, a User-Agent with your
// contact and an on-disk cache, following AoC's automation guidelines.
import type { AnswerResult, Puzzle, YearStars, YearSummary } from '../shared/types.ts';
import { allYears, daysInYear } from '../shared/calendar.ts';
import * as cache from './cache.ts';
import { getContact, getSession, REPO_URL } from './config.ts';
import { parseAnswer, parseCalendar, parseEvents, parsePuzzle, parseUser } from './parse.ts';

const BASE = 'https://adventofcode.com';
const MIN_INTERVAL_MS = 1000;
/** Stars and unfinished puzzles are fetched again after this long. */
const TTL_MS = 15 * 60 * 1000;
/** Even a forced refresh never fetches the same page more than once a minute. */
const MIN_REFRESH_MS = 60 * 1000;

export class AocError extends Error {
  constructor(
    public status: 400 | 401 | 404 | 502,
    message: string,
  ) {
    super(message);
  }
}

let queue: Promise<unknown> = Promise.resolve();
let lastRequest = 0;

function userAgent(): string {
  const contact = getContact();
  return `advent-of-code-playground (+${REPO_URL})${contact ? ` by ${contact}` : ''}`;
}

async function request(pathname: string, init: RequestInit = {}): Promise<string> {
  const session = getSession();
  if (!session) throw new AocError(401, 'Missing Advent of Code session cookie. Set it in [Settings].');

  const run = async () => {
    const wait = lastRequest + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequest = Date.now();
    return fetch(BASE + pathname, {
      ...init,
      redirect: 'manual',
      headers: { Cookie: `session=${session}`, 'User-Agent': userAgent(), ...init.headers },
    });
  };
  const pending = queue.then(run, run);
  queue = pending.catch(() => {});

  let res: Response;
  try {
    res = await pending;
  } catch {
    throw new AocError(502, 'Could not reach adventofcode.com.');
  }
  const body = await res.text();
  if (res.status === 404) throw new AocError(404, 'That puzzle does not exist or is not available yet.');
  if (res.status === 400 || (res.status >= 300 && res.status < 400)) {
    throw new AocError(401, 'The session cookie is invalid or expired. Update it in [Settings].');
  }
  if (res.status === 500) {
    // AoC answers 500 when the cookie has a format it does not recognise.
    throw new AocError(401, 'Advent of Code rejected the session cookie (500). Check it is complete in [Settings].');
  }
  if (!res.ok) throw new AocError(502, `Advent of Code answered ${res.status}.`);
  return body;
}

// --- User ------------------------------------------------------------------

let cachedUser: string | undefined;

export function forgetUser(): void {
  cachedUser = undefined;
}

export async function getUser(): Promise<string | undefined> {
  if (cachedUser) return cachedUser;
  const html = await request('/');
  cachedUser = parseUser(html);
  return cachedUser;
}

// --- Stars ---------------------------------------------------------------

interface EventsCache {
  years: [number, number][];
  fetchedAt: number;
}

export async function getYears(refresh = false): Promise<YearSummary[]> {
  let cached = await cache.readJson<EventsCache>('events.json');
  const age = cached ? Date.now() - cached.fetchedAt : Infinity;
  if (!cached || age > TTL_MS || (refresh && age > MIN_REFRESH_MS)) {
    const html = await request(`/${allYears()[0]}/events`);
    cached = { years: [...parseEvents(html)], fetchedAt: Date.now() };
    await cache.writeJson('events.json', cached);
  }
  const stars = new Map(cached.years);
  return allYears().map((year) => ({ year, stars: stars.get(year) ?? 0, maxStars: daysInYear(year) * 2 }));
}

export async function getYearStars(year: number, refresh = false): Promise<YearStars> {
  const key = `${year}/stars.json`;
  const cached = await cache.readJson<YearStars>(key);
  const age = cached ? Date.now() - cached.fetchedAt : Infinity;
  if (cached && age < TTL_MS && !(refresh && age > MIN_REFRESH_MS)) return cached;

  const html = await request(`/${year}`);
  const parsed = parseCalendar(html);
  const days = Array.from({ length: daysInYear(year) }, (_, i) => ({ day: i + 1, stars: parsed.get(i + 1) ?? 0 }));
  const result: YearStars = { year, days, total: days.reduce((s, d) => s + d.stars, 0), fetchedAt: Date.now() };
  await cache.writeJson(key, result);

  // The calendar is fresher than the events list: keep them consistent.
  const events = await cache.readJson<EventsCache>('events.json');
  if (events) {
    events.years = events.years.map(([y, stars]) => [y, y === year ? result.total : stars]);
    await cache.writeJson('events.json', events);
  }
  return result;
}

// --- Puzzles ----------------------------------------------------------------

export async function getPuzzle(year: number, day: number, refresh = false): Promise<Puzzle> {
  const key = `${year}/${day}/puzzle.json`;
  const cached = await cache.readJson<Puzzle>(key);
  if (cached) {
    const age = Date.now() - cached.fetchedAt;
    const complete = cached.answers.length >= 2;
    if (complete || (age < TTL_MS && !(refresh && age > MIN_REFRESH_MS))) return cached;
  }
  const puzzle = parsePuzzle(await request(`/${year}/day/${day}`), year, day);
  await cache.writeJson(key, puzzle);
  return puzzle;
}

/** A user's input never changes: fetch it once and keep it. */
export async function getInput(year: number, day: number): Promise<string> {
  const key = `${year}/${day}/input.txt`;
  const cached = await cache.readText(key);
  if (cached !== undefined) return cached;
  const input = await request(`/${year}/day/${day}/input`);
  await cache.writeText(key, input);
  return input;
}

export async function submitAnswer(year: number, day: number, part: 1 | 2, answer: string): Promise<AnswerResult> {
  const html = await request(`/${year}/day/${day}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ level: String(part), answer }).toString(),
  });
  const result = parseAnswer(html);
  if (result.status === 'correct' || result.status === 'already') {
    await Promise.all([cache.remove(`${year}/${day}/puzzle.json`), cache.remove(`${year}/stars.json`), cache.remove('events.json')]);
  }
  return result;
}
