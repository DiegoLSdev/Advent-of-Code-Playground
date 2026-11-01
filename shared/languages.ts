// Language catalog. Adding a language = adding an entry here plus its
// runner in web/src/runners (see README → "Adding a language").

export type RunMode = 'browser' | 'native';

/** Data files every solution can read from its own folder. */
export const DATA_FILES = { input: 'input.txt', example: 'example.txt' } as const;
export type DataSource = keyof typeof DATA_FILES;

export interface LanguageInfo {
  id: string;
  name: string;
  extension: string;
  /** browser: runs in the browser · native: run by the local server with your toolchain. */
  mode: RunMode;
  template: (year: number, day: number) => string;
}

export const LANGUAGES: LanguageInfo[] = [
  {
    id: 'javascript',
    name: 'JavaScript',
    extension: 'js',
    mode: 'browser',
    template: (year, day) => `// Advent of Code ${year} · Day ${day}
// input.txt and example.txt live next to this file (see the tabs on the right).
import { readFileSync } from 'node:fs';

const input = readFileSync('./input.txt', 'utf8');
const example = readFileSync('./example.txt', 'utf8');

function part1() {
  const lines = example.trim().split('\\n');
  return lines.length;
}

function part2() {
  const lines = example.trim().split('\\n');
  return 0;
}
`,
  },
  {
    id: 'python',
    name: 'Python',
    extension: 'py',
    mode: 'browser',
    template: (year, day) => `# Advent of Code ${year} · Day ${day}
# input.txt and example.txt live next to this file (see the tabs on the right).
from pathlib import Path

input = Path("input.txt").read_text()
example = Path("example.txt").read_text()


def part1():
    lines = example.strip().splitlines()
    return len(lines)


def part2():
    lines = example.strip().splitlines()
    return 0
`,
  },
];

export function getLanguage(id: string): LanguageInfo | undefined {
  return LANGUAGES.find((l) => l.id === id);
}
