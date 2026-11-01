import type { RunHandlers, RunRequest, RunResult, Runner, WorkerMessage } from './types.ts';

/**
 * Generic runner for languages that run in the browser: code runs in a Web
 * Worker, so an infinite loop never freezes the page.
 */
export class WorkerRunner implements Runner {
  private worker?: Worker;
  private nextId = 0;
  private pending?: { id: number; resolve: (r: RunResult) => void; handlers: RunHandlers; startedAt: number };

  constructor(private createWorker: () => Worker) {}

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = this.createWorker();
      this.worker.onmessage = (e: MessageEvent<WorkerMessage>) => this.handle(e.data);
      this.worker.onerror = (e) => {
        e.preventDefault();
        this.finish({ ok: false, error: e.message || 'The worker crashed.', timeMs: 0 });
        this.reset();
      };
    }
    return this.worker;
  }

  private handle(msg: WorkerMessage): void {
    const pending = this.pending;
    if (!pending || msg.id !== pending.id) return;
    if (msg.type === 'log') pending.handlers.onLog?.(msg.text);
    else if (msg.type === 'status') pending.handlers.onStatus?.(msg.text);
    else this.finish({ ok: msg.ok, result: msg.result, error: msg.error, timeMs: msg.timeMs });
  }

  private finish(result: RunResult): void {
    const pending = this.pending;
    this.pending = undefined;
    pending?.resolve(result);
  }

  private reset(): void {
    this.worker?.terminate();
    this.worker = undefined;
  }

  run(req: RunRequest, handlers: RunHandlers = {}): Promise<RunResult> {
    this.stop();
    const id = ++this.nextId;
    return new Promise((resolve) => {
      this.pending = { id, resolve, handlers, startedAt: performance.now() };
      this.getWorker().postMessage({ id, ...req });
    });
  }

  stop(): void {
    if (!this.pending) return;
    const timeMs = performance.now() - this.pending.startedAt;
    this.reset();
    this.finish({ ok: false, error: 'Stopped.', timeMs });
  }
}
