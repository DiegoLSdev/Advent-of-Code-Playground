// Real Python (CPython compiled to WebAssembly) thanks to Pyodide.
const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.29.3/full/';
/** Working directory of the solution: input.txt and example.txt live here. */
const WORKDIR = '/home/pyodide/solution';

interface PyProxy {
  destroy(): void;
  set(key: string, value: unknown): void;
  get(key: string): unknown;
}
interface Pyodide {
  globals: { get(name: string): () => PyProxy };
  FS: {
    mkdirTree(path: string): void;
    writeFile(path: string, data: string): void;
    readdir(path: string): string[];
    unlink(path: string): void;
  };
  setStdout(opts: { batched: (s: string) => void }): void;
  setStderr(opts: { batched: (s: string) => void }): void;
  loadPackagesFromImports(code: string): Promise<unknown>;
  runPythonAsync(code: string, opts?: { globals?: PyProxy }): Promise<unknown>;
}

interface Job {
  id: number;
  code: string;
  files: Record<string, string>;
  part: 1 | 2;
}

// Runs the solution as solution.py, calls partN() and keeps tracebacks to the user's own lines.
const RUN_PART = `
import inspect as __inspect, linecache as __linecache, traceback as __tb
__linecache.cache["solution.py"] = (len(__code), None, __code.splitlines(True), "solution.py")
__result = __error = None
try:
    exec(compile(__code, "solution.py", "exec"), globals())
    __fn = globals().get(__part_name)
    if not callable(__fn):
        raise NameError(f"Function {__part_name}() not found.")
    if any(p.default is p.empty and p.kind in (p.POSITIONAL_ONLY, p.POSITIONAL_OR_KEYWORD) for p in __inspect.signature(__fn).parameters.values()):
        raise TypeError(f"{__part_name}() should take no parameters: read input or example at the top of the file (see [Template]).")
    __result = str(__fn())
except BaseException as __e:
    __frames = [f for f in __tb.extract_tb(__e.__traceback__) if f.filename == "solution.py"]
    __error = ("Traceback (most recent call last):\\n" + "".join(__tb.format_list(__frames)) if __frames else "") + "".join(__tb.format_exception_only(type(__e), __e))
`;

let pyodide: Promise<Pyodide> | undefined;

function loadPython(id: number): Promise<Pyodide> {
  if (!pyodide) {
    postMessage({ id, type: 'status', text: 'Loading Python (first run only)…' });
    pyodide = import(/* @vite-ignore */ `${PYODIDE_URL}pyodide.mjs`).then(async (m) => {
      const py: Pyodide = await m.loadPyodide({ indexURL: PYODIDE_URL });
      py.FS.mkdirTree(WORKDIR);
      await py.runPythonAsync(`import os; os.chdir(${JSON.stringify(WORKDIR)})`);
      return py;
    });
  }
  return pyodide;
}

function syncFiles(py: Pyodide, files: Record<string, string>): void {
  for (const name of py.FS.readdir(WORKDIR)) {
    if (name !== '.' && name !== '..' && !(name in files)) py.FS.unlink(`${WORKDIR}/${name}`);
  }
  for (const [name, text] of Object.entries(files)) py.FS.writeFile(`${WORKDIR}/${name}`, text);
}

self.onmessage = async (e: MessageEvent<Job>) => {
  const { id, code, files, part } = e.data;
  let namespace: PyProxy | undefined;
  try {
    const py = await loadPython(id);
    const log = (text: string) => postMessage({ id, type: 'log', text });
    py.setStdout({ batched: log });
    py.setStderr({ batched: log });
    syncFiles(py, files);
    // Packages such as numpy or networkx are downloaded when imported.
    await py.loadPackagesFromImports(code);

    const start = performance.now();
    namespace = py.globals.get('dict')();
    namespace.set('__name__', 'solution');
    namespace.set('__code', code);
    namespace.set('__part_name', `part${part}`);
    await py.runPythonAsync(RUN_PART, { globals: namespace });
    const timeMs = performance.now() - start;
    const error = namespace.get('__error');
    if (typeof error === 'string') postMessage({ id, type: 'done', ok: false, error: error.trimEnd(), timeMs });
    else postMessage({ id, type: 'done', ok: true, result: String(namespace.get('__result')), timeMs });
  } catch (err) {
    postMessage({ id, type: 'done', ok: false, error: err instanceof Error ? err.message : String(err), timeMs: 0 });
  } finally {
    namespace?.destroy();
  }
};
