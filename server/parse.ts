// Extracts data from adventofcode.com HTML. AoC has no public API, so any
// change in its markup only needs fixing here.
import type { AnswerResult, Puzzle } from '../shared/types.ts';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|\w+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return String.fromCodePoint(n);
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

/** Logged-in user name, or undefined when the cookie is not valid. */
export function parseUser(html: string): string | undefined {
  const match = html.match(/<div class="user">([\s\S]*?)<\/div>/);
  if (!match) return undefined;
  return stripTags(match[1].replace(/<span class="star-count">[\s\S]*?<\/span>/, '').replace(/<span class="supporter-badge">[\s\S]*?<\/span>/, ''));
}

/** Stars per day, from a year's calendar page. */
export function parseCalendar(html: string): Map<number, number> {
  const days = new Map<number, number>();
  const re = /<a\b([^>]*)class="calendar-day(\d+)\b([^"]*)"/g;
  for (const m of html.matchAll(re)) {
    const day = Number(m[2]);
    const classes = m[3];
    const label = m[1];
    const stars = /calendar-verycomplete/.test(classes) || /two stars/.test(label) ? 2 : /calendar-complete/.test(classes) || /one star/.test(label) ? 1 : 0;
    days.set(day, Math.max(days.get(day) ?? 0, stars));
  }
  return days;
}

/** Stars per year, from the /events page. */
export function parseEvents(html: string): Map<number, number> {
  const years = new Map<number, number>();
  for (const m of html.matchAll(/<div class="eventlist-event">([\s\S]*?)<\/div>/g)) {
    const year = m[1].match(/\[(\d{4})\]/);
    if (!year) continue;
    const stars = m[1].match(/<span class="star-count">\s*(\d+)\*/);
    years.set(Number(year[1]), Number(stars?.[1] ?? 0));
  }
  return years;
}

export function parsePuzzle(html: string, year: number, day: number): Puzzle {
  const parts = [...html.matchAll(/<article class="day-desc">([\s\S]*?)<\/article>/g)].map((m) =>
    // Relative links point to adventofcode.com, not to the local app.
    m[1].replace(/href="\/(?!\/)/g, 'href="https://adventofcode.com/'),
  );
  const answers = [...html.matchAll(/Your puzzle answer was <code>([\s\S]*?)<\/code>/g)].map((m) => decodeEntities(m[1]));
  const titleMatch = html.match(/<h2>--- Day \d+: ([\s\S]*?) ---<\/h2>/);
  return {
    year,
    day,
    title: titleMatch ? decodeEntities(titleMatch[1]) : `Day ${day}`,
    parts,
    answers,
    fetchedAt: Date.now(),
  };
}

export function parseAnswer(html: string): AnswerResult {
  const article = html.match(/<article>([\s\S]*?)<\/article>/);
  const message = article ? stripTags(article[1]) : 'Unexpected response from Advent of Code.';
  const status: AnswerResult['status'] = /That's the right answer/i.test(message)
    ? 'correct'
    : /not the right answer/i.test(message)
      ? 'incorrect'
      : /answer too recently/i.test(message)
        ? 'wait'
        : /right level|already complete/i.test(message)
          ? 'already'
          : 'unknown';
  return { status, message };
}
