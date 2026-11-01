import fs from 'node:fs';
import path from 'node:path';

try {
  process.loadEnvFile();
} catch {
  // No .env: settings come from .data/config.json (Settings page).
}

export const ROOT = process.cwd();
export const DATA_DIR = path.join(ROOT, '.data');
export const CACHE_DIR = path.join(DATA_DIR, 'cache');
export const SOLUTIONS_DIR = path.join(ROOT, 'solutions');
export const STATIC_DIR = path.join(ROOT, 'web', 'dist');
export const PORT = Number(process.env.PORT ?? 3001);
export const REPO_URL = 'https://github.com/DiegoLSdev/advent-of-code-playground';

const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

interface StoredConfig {
  session?: string;
  contact?: string;
}

function readStored(): StoredConfig {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

export function getSession(): string | undefined {
  return process.env.AOC_SESSION || readStored().session || undefined;
}

export function getContact(): string | undefined {
  return process.env.AOC_CONTACT || readStored().contact || undefined;
}

export function saveConfig(patch: StoredConfig): void {
  const next = { ...readStored(), ...patch };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2), { mode: 0o600 });
}
