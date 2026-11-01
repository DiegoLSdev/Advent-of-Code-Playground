export interface RunRequest {
  code: string;
  /** Files placed next to the solution, e.g. { 'input.txt': '…', 'example.txt': '…' }. */
  files: Record<string, string>;
  part: 1 | 2;
}

export interface RunResult {
  ok: boolean;
  result?: string;
  error?: string;
  timeMs: number;
}

export interface RunHandlers {
  onLog?: (text: string) => void;
  onStatus?: (text: string) => void;
}

/** What every language implements, wherever it runs. */
export interface Runner {
  run(req: RunRequest, handlers?: RunHandlers): Promise<RunResult>;
  /** Stops the current run (infinite loops, puzzles that are too slow…). */
  stop(): void;
}

/** Messages between the page and an execution worker. */
export type WorkerMessage =
  | { id: number; type: 'log'; text: string }
  | { id: number; type: 'status'; text: string }
  | { id: number; type: 'done'; ok: boolean; result?: string; error?: string; timeMs: number };
