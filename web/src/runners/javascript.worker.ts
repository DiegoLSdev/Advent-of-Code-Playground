import { formatValue } from './format.ts';

interface Job {
  id: number;
  code: string;
  files: Record<string, string>;
  part: 1 | 2;
}

/** Minimal node:fs so solutions read input.txt / example.txt like local files. */
function createFs(files: Record<string, string>) {
  const read = (path: string) => {
    const name = String(path).replace(/^\.\//, '');
    if (!(name in files)) {
      throw new Error(`ENOENT: no such file '${path}'. Available: ${Object.keys(files).join(', ') || 'none'}.`);
    }
    return files[name];
  };
  return {
    readFileSync: (path: string) => read(path),
    existsSync: (path: string) => String(path).replace(/^\.\//, '') in files,
    promises: { readFile: async (path: string) => read(path) },
  };
}

/** Turns `import … from 'node:fs'` into `const … = require('node:fs')`. */
function rewriteImports(code: string): string {
  return code
    .replace(/^(\s*)import\s+([\s\S]+?)\s+from\s+(['"][^'"]+['"]);?/gm, (_, indent: string, clause: string, source: string) => {
      const binding = clause.trim().startsWith('{')
        ? clause.replace(/\s+as\s+/g, ': ')
        : clause.replace(/^\*\s+as\s+/, '');
      return `${indent}const ${binding} = require(${source});`;
    })
    .replace(/^(\s*)export\s+(default\s+)?/gm, '$1');
}

self.onmessage = async (e: MessageEvent<Job>) => {
  const { id, code, files, part } = e.data;
  const log = (...args: unknown[]) => postMessage({ id, type: 'log', text: args.map(formatValue).join(' ') });
  console.log = console.info = console.warn = console.error = console.debug = log;

  const fs = createFs(files);
  const require = (name: string) => {
    if (name === 'fs' || name === 'node:fs') return fs;
    if (name === 'fs/promises' || name === 'node:fs/promises') return fs.promises;
    throw new Error(`Module '${name}' is not available here. Only node:fs can be imported.`);
  };

  const start = performance.now();
  try {
    const load = new Function(
      'require',
      `${rewriteImports(code)}\n;return { part1: typeof part1 === 'function' ? part1 : undefined, part2: typeof part2 === 'function' ? part2 : undefined };`,
    );
    const fn = load(require)[`part${part}`];
    if (!fn) throw new Error(`Function part${part}() not found.`);
    if (fn.length > 0) {
      throw new Error(`part${part}() should take no parameters: read input or example from the top of the file (see [Template]).`);
    }
    const result = await fn();
    postMessage({ id, type: 'done', ok: true, result: formatValue(result), timeMs: performance.now() - start });
  } catch (err) {
    const error = err instanceof Error ? (err.stack ?? err.message) : String(err);
    postMessage({ id, type: 'done', ok: false, error, timeMs: performance.now() - start });
  }
};
