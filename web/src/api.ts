import type { AnswerResult, Me, Puzzle, YearStars, YearSummary } from '../../shared/types.ts';

/** Global event: some star changed and counters need a refresh. */
export const STARS_CHANGED = 'aoc:stars-changed';

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : await res.text();
  if (!res.ok) throw new Error((isJson && body?.error) || `Error ${res.status}`);
  return body as T;
}

const q = (refresh?: boolean) => (refresh ? '?refresh=1' : '');

export const api = {
  me: () => call<Me>('/me'),
  saveConfig: (config: { session?: string; contact?: string }) =>
    call<Me>('/config', { method: 'POST', body: JSON.stringify(config) }),
  years: (refresh?: boolean) => call<YearSummary[]>(`/years${q(refresh)}`),
  year: (year: number, refresh?: boolean) => call<YearStars>(`/years/${year}${q(refresh)}`),
  puzzle: (year: number, day: number, refresh?: boolean) => call<Puzzle>(`/puzzle/${year}/${day}${q(refresh)}`),
  input: (year: number, day: number) => call<string>(`/input/${year}/${day}`),
  submit: (year: number, day: number, part: 1 | 2, answer: string) =>
    call<AnswerResult>(`/answer/${year}/${day}`, { method: 'POST', body: JSON.stringify({ part, answer }) }),
  solution: (year: number, day: number, lang: string) =>
    call<{ code: string | null }>(`/solutions/${year}/${day}/${lang}`),
  saveSolution: (year: number, day: number, lang: string, code: string) =>
    call<{ ok: true }>(`/solutions/${year}/${day}/${lang}`, { method: 'PUT', body: JSON.stringify({ code }) }),
};
