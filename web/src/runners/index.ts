import type { Runner } from './types.ts';
import { WorkerRunner } from './workerRunner.ts';

// One runner per language in shared/languages.ts. "native" languages
// (Rust, Go…) would add a runner that calls the local server.
const factories: Record<string, () => Runner> = {
  javascript: () => new WorkerRunner(() => new Worker(new URL('./javascript.worker.ts', import.meta.url), { type: 'module' })),
  python: () => new WorkerRunner(() => new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' })),
};

const instances = new Map<string, Runner>();

export function getRunner(languageId: string): Runner {
  let runner = instances.get(languageId);
  if (!runner) {
    const create = factories[languageId];
    if (!create) throw new Error(`No runner for ${languageId}.`);
    runner = create();
    instances.set(languageId, runner);
  }
  return runner;
}
