// Solutions are plain files in solutions/YEAR/dayDD/, ready to be
// versioned in your own repo (inputs are never written there).
import fs from 'node:fs/promises';
import path from 'node:path';
import type { LanguageInfo } from '../shared/languages.ts';
import { SOLUTIONS_DIR } from './config.ts';

function solutionPath(year: number, day: number, lang: LanguageInfo): string {
  return path.join(SOLUTIONS_DIR, String(year), `day${String(day).padStart(2, '0')}`, `solution.${lang.extension}`);
}

export async function readSolution(year: number, day: number, lang: LanguageInfo): Promise<string | undefined> {
  try {
    return await fs.readFile(solutionPath(year, day, lang), 'utf8');
  } catch {
    return undefined;
  }
}

export async function writeSolution(year: number, day: number, lang: LanguageInfo, code: string): Promise<void> {
  const file = solutionPath(year, day, lang);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, code);
}
