// Works out which data file each part reads (input / example) by looking at
// the code, so the UI can always say what a run is going to use.
import type { DataSource } from '../../shared/languages.ts';

const SOURCES: DataSource[] = ['input', 'example'];

function stripComments(code: string, language: string): string {
  return language === 'python' ? code.replace(/#.*$/gm, '') : code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/** Body of `function partN` / `const partN = … =>` (brace matching, good enough for highlighting). */
function jsBody(code: string, name: string): string | undefined {
  const start = code.search(new RegExp(`(function\\s*\\*?\\s*${name}\\s*\\(|(const|let|var)\\s+${name}\\s*=)`));
  if (start < 0) return undefined;
  const open = code.indexOf('{', code.indexOf('(', start));
  const arrow = code.indexOf('=>', start);
  if (arrow >= 0 && (open < 0 || arrow < open) && !/^\s*\{/.test(code.slice(arrow + 2))) {
    return code.slice(arrow + 2).split('\n')[0];
  }
  if (open < 0) return undefined;
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}' && --depth === 0) return code.slice(open, i + 1);
  }
  return code.slice(open);
}

/** Body of `def partN(...)`: every following line indented deeper than the def. */
function pyBody(code: string, name: string): string | undefined {
  const lines = code.split('\n');
  const index = lines.findIndex((l) => new RegExp(`^\\s*def\\s+${name}\\s*\\(`).test(l));
  if (index < 0) return undefined;
  const indent = lines[index].match(/^\s*/)![0].length;
  const body: string[] = [];
  for (const line of lines.slice(index + 1)) {
    if (line.trim() && line.match(/^\s*/)![0].length <= indent) break;
    body.push(line);
  }
  return body.join('\n');
}

function sourcesIn(text: string): DataSource[] {
  return SOURCES.filter((s) => new RegExp(`\\b${s}\\b`).test(text));
}

/**
 * Data used by partN. If its body does not mention input/example directly
 * (e.g. it uses a `lines` variable parsed at the top), falls back to the
 * top-level code, ignoring the lines that just read the files.
 */
export function dataUsedBy(code: string, language: string, part: 1 | 2): DataSource[] {
  const clean = stripComments(code, language);
  const name = `part${part}`;
  const body = language === 'python' ? pyBody(clean, name) : jsBody(clean, name);
  if (body === undefined) return [];
  const direct = sourcesIn(body);
  if (direct.length) return direct;

  const others = [1, 2].map((p) => (language === 'python' ? pyBody(clean, `part${p}`) : jsBody(clean, `part${p}`)) ?? '');
  let topLevel = clean;
  for (const b of others) if (b) topLevel = topLevel.replace(b, '');
  topLevel = topLevel
    .split('\n')
    .filter((l) => !/^\s*(const|let|var)?\s*(input|example)\s*=/.test(l))
    .join('\n');
  return sourcesIn(topLevel);
}
