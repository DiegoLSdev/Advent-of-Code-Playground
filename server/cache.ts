import fs from 'node:fs/promises';
import path from 'node:path';
import { CACHE_DIR } from './config.ts';

function resolve(key: string): string {
  return path.join(CACHE_DIR, key);
}

export async function readText(key: string): Promise<string | undefined> {
  try {
    return await fs.readFile(resolve(key), 'utf8');
  } catch {
    return undefined;
  }
}

export async function writeText(key: string, content: string): Promise<void> {
  const file = resolve(key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
}

export async function readJson<T>(key: string): Promise<T | undefined> {
  const text = await readText(key);
  return text === undefined ? undefined : (JSON.parse(text) as T);
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  await writeText(key, JSON.stringify(value));
}

export async function remove(key: string): Promise<void> {
  await fs.rm(resolve(key), { force: true });
}

export async function clearAll(): Promise<void> {
  await fs.rm(CACHE_DIR, { recursive: true, force: true });
}
