import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { daysInYear, isUnlocked } from '../../../shared/calendar.ts';
import { DATA_FILES, getLanguage, LANGUAGES, type DataSource } from '../../../shared/languages.ts';
import type { AnswerResult } from '../../../shared/types.ts';
import { api, STARS_CHANGED } from '../api.ts';
import { CodeEditor } from '../components/CodeEditor.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { PartCard, type PartRun } from '../components/PartCard.tsx';
import { Splitter } from '../components/Splitter.tsx';
import { Stars } from '../components/Stars.tsx';
import { dataUsedBy } from '../dataUsage.ts';
import { useAsync, useLocalStorage } from '../hooks.ts';
import { extractExample, extractExampleAnswer, sanitize } from '../puzzleHtml.ts';
import { getRunner } from '../runners/index.ts';

type Part = 1 | 2;
type Target = Part | 'both';
type Tab = 'puzzle' | DataSource;

interface ConsoleLine {
  kind: 'info' | 'log' | 'error' | 'result' | 'warn';
  text: string;
}

const MAX_CONSOLE_LINES = 2000;
const SAVE_DELAY_MS = 800;
const DEFAULT_COLS = 0.53;
const DEFAULT_ROWS = 0.5;
/** Below this the top panel (puzzle / files) collapses to just its tabs. */
const COLLAPSE_AT = 0.12;
const FONT_SIZES = [11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32];
const DEFAULT_FONT_SIZE = 15;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const clock = () => new Date().toLocaleTimeString();
const countLines = (text: string) => (text.trim() ? text.trimEnd().split('\n').length : 0);

function useRatio(key: string, fallback: number): [number, (v: number) => void] {
  const [raw, setRaw] = useLocalStorage(key, String(fallback));
  const value = Number.isFinite(Number(raw)) ? Number(raw) : fallback;
  return [value, useCallback((v: number) => setRaw(v.toFixed(3)), [setRaw])];
}

export function DayPage({ year, day }: { year: number; day: number }) {
  const puzzle = useAsync((refresh) => api.puzzle(year, day, refresh), [year, day]);
  const answers = puzzle.data?.answers ?? [];

  // --- Code --------------------------------------------------------------
  const [langId, setLangId] = useLocalStorage('aoc:language', LANGUAGES[0].id);
  const lang = getLanguage(langId) ?? LANGUAGES[0];
  const [code, setCode] = useState<string>();
  const codeRef = useRef<string>(undefined);
  const [saveState, setSaveState] = useState<'saved' | 'pending' | 'error'>('saved');
  const pendingSave = useRef<{ timer: number; save: () => void }>(undefined);

  const flushSave = useCallback(() => {
    if (!pendingSave.current) return;
    clearTimeout(pendingSave.current.timer);
    pendingSave.current.save();
    pendingSave.current = undefined;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const show = (value: string) => {
      if (cancelled) return;
      codeRef.current = value;
      setCode(value);
    };
    setCode(undefined);
    api.solution(year, day, lang.id).then(
      (r) => show(r.code ?? lang.template(year, day)),
      () => show(lang.template(year, day)),
    );
    return () => {
      cancelled = true;
      flushSave();
    };
  }, [year, day, lang, flushSave]);

  function onCodeChange(value: string) {
    codeRef.current = value;
    setCode(value);
    setSaveState('pending');
    if (pendingSave.current) clearTimeout(pendingSave.current.timer);
    const save = () =>
      api.saveSolution(year, day, lang.id, value).then(
        () => setSaveState('saved'),
        () => setSaveState('error'),
      );
    pendingSave.current = { timer: window.setTimeout(flushSave, SAVE_DELAY_MS), save };
  }

  const [confirmingTemplate, setConfirmingTemplate] = useState(false);
  const closeTemplateDialog = useCallback(() => setConfirmingTemplate(false), []);

  function resetToTemplate() {
    setConfirmingTemplate(false);
    onCodeChange(lang.template(year, day));
    flushSave();
  }

  const [fontSizeRaw, setFontSize] = useLocalStorage('aoc:editor-font-size', String(DEFAULT_FONT_SIZE));
  const fontSize = FONT_SIZES.includes(Number(fontSizeRaw)) ? Number(fontSizeRaw) : DEFAULT_FONT_SIZE;
  const fontIndex = FONT_SIZES.indexOf(fontSize);
  const stepFont = (delta: number) => setFontSize(String(FONT_SIZES[clamp(fontIndex + delta, 0, FONT_SIZES.length - 1)]));

  // --- Data files ----------------------------------------------------------
  const detectedExample = useMemo(() => extractExample(puzzle.data?.parts[0]), [puzzle.data]);
  const [example, setExample] = useLocalStorage(`aoc:example:${year}:${day}`, detectedExample);
  const exampleAnswers = useMemo(
    () => [extractExampleAnswer(puzzle.data?.parts[0]), extractExampleAnswer(puzzle.data?.parts[1])],
    [puzzle.data],
  );

  const [input, setInput] = useState<{ text?: string; error?: string }>({});
  const inputRequest = useRef<Promise<string>>(undefined);
  const loadInput = useCallback(() => {
    inputRequest.current ??= api.input(year, day).then(
      (text) => {
        setInput({ text });
        return text;
      },
      (err: Error) => {
        inputRequest.current = undefined;
        setInput({ error: err.message });
        throw err;
      },
    );
    return inputRequest.current;
  }, [year, day]);

  // The template reads input.txt at the top, so it is needed on every run anyway.
  useEffect(() => {
    loadInput().catch(() => {});
  }, [loadInput]);

  const sources = useMemo(
    () => ({ 1: code ? dataUsedBy(code, lang.id, 1) : [], 2: code ? dataUsedBy(code, lang.id, 2) : [] }),
    [code, lang.id],
  );

  const dataHints: Record<DataSource, string> = {
    input:
      input.text !== undefined
        ? `input → ${DATA_FILES.input} · your puzzle input · ${countLines(input.text)} lines`
        : `input → ${DATA_FILES.input} · your puzzle input · ${input.error ?? 'loading…'}`,
    example: example.trim()
      ? `example → ${DATA_FILES.example} · ${countLines(example)} lines`
      : `example → ${DATA_FILES.example} · empty! paste one in the ${DATA_FILES.example} tab`,
  };

  // --- Layout --------------------------------------------------------------
  const [tab, setTab] = useState<Tab>('puzzle');
  const [hinted, setHinted] = useState<DataSource | null>(null);
  const [cols, setCols] = useRatio('aoc:split-cols', DEFAULT_COLS);
  const [rows, setRows] = useRatio('aoc:split-rows', DEFAULT_ROWS);
  const lastOpenRows = useRef(rows >= COLLAPSE_AT ? rows : DEFAULT_ROWS);
  const collapsed = rows < COLLAPSE_AT;
  const gridRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLElement>(null);

  const changeRows = (v: number) => {
    const next = v < COLLAPSE_AT ? 0 : clamp(v, COLLAPSE_AT, 0.75);
    if (next) lastOpenRows.current = next;
    setRows(next);
  };
  const toggleCollapsed = () => setRows(collapsed ? lastOpenRows.current : 0);
  const openTab = (t: Tab) => {
    setTab(t);
    if (collapsed) setRows(lastOpenRows.current);
  };

  // --- Running -----------------------------------------------------------
  const [runs, setRuns] = useState<Partial<Record<Part, PartRun>>>({});
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<ConsoleLine[]>([
    { kind: 'info', text: 'Ctrl+S saves and re-runs · Ctrl+Enter runs · hover input / example in the code to see what they hold.' },
  ]);
  const [submissions, setSubmissions] = useState<Partial<Record<Part, AnswerResult>>>({});
  const [submitting, setSubmitting] = useState<Part>();
  const generation = useRef(0);
  const lastTarget = useRef<Target>('both');
  const consoleRef = useRef<HTMLPreElement>(null);

  const print = useCallback((kind: ConsoleLine['kind'], text: string) => {
    setLines((prev) => [...prev, { kind, text }].slice(-MAX_CONSOLE_LINES));
  }, []);

  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  async function run(target: Target, reason?: 'save') {
    const source = codeRef.current;
    if (source === undefined) return;
    // A new run replaces the previous one, like a nodemon restart.
    const gen = ++generation.current;
    const isCurrent = () => gen === generation.current;
    lastTarget.current = target;
    const parts: Part[] = target === 'both' ? [1, 2] : [target];
    const runner = getRunner(lang.id);
    const used = (p: Part) => dataUsedBy(source, lang.id, p);

    setRunning(true);
    setSubmissions((s) => (target === 'both' ? {} : { ...s, [target]: undefined }));
    setRuns((r) => ({ ...r, ...Object.fromEntries(parts.map((p) => [p, { state: 'running', sources: used(p) }])) }));
    print('info', `[${clock()}] ${reason === 'save' ? 'saved · ' : ''}part ${parts.join(' & ')} · ${lang.name}`);

    const files: Record<string, string> = { [DATA_FILES.example]: example };
    try {
      files[DATA_FILES.input] = await loadInput();
    } catch (err) {
      print('warn', `${DATA_FILES.input} is not available: ${(err as Error).message}`);
    }
    if (!isCurrent()) return;
    if (!example.trim() && parts.some((p) => used(p).includes('example'))) {
      print('warn', `${DATA_FILES.example} is empty: this puzzle has no example block, paste one in the ${DATA_FILES.example} tab.`);
    }

    for (const part of parts) {
      const result = await runner.run(
        { code: source, files, part },
        {
          onLog: (text) => isCurrent() && print('log', text),
          onStatus: (text) => isCurrent() && print('info', text),
        },
      );
      if (!isCurrent()) return;
      const partSources = used(part);
      setRuns((r) => ({ ...r, [part]: { state: 'done', sources: partSources, result } }));
      const tag = partSources.length ? ` (${partSources.join(' + ')})` : '';
      if (result.ok) print('result', `part ${part}${tag} → ${result.result}  ${result.timeMs.toFixed(1)} ms`);
      else print('error', `part ${part}${tag}: ${result.error}`);
    }
    setRunning(false);
  }

  function stop() {
    generation.current++;
    getRunner(lang.id).stop();
    setRuns((r) => Object.fromEntries(Object.entries(r).map(([p, v]) => [p, v.state === 'running' ? { ...v, state: 'stopped' } : v])));
    setRunning(false);
    print('info', `[${clock()}] stopped`);
  }

  // Switching language or day invalidates whatever was running.
  useEffect(
    () => () => {
      generation.current++;
      getRunner(lang.id).stop();
    },
    [lang.id, year, day],
  );

  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        flushSave();
        runRef.current(lastTarget.current, 'save');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flushSave]);

  async function submit(part: Part, answer: string) {
    setSubmitting(part);
    try {
      const result = await api.submit(year, day, part, answer);
      setSubmissions((s) => ({ ...s, [part]: result }));
      print(result.status === 'correct' ? 'result' : 'info', `AoC: ${result.message}`);
      if (result.status === 'correct' || result.status === 'already') {
        puzzle.reload(true);
        window.dispatchEvent(new Event(STARS_CHANGED));
      }
    } catch (err) {
      setSubmissions((s) => ({ ...s, [part]: { status: 'unknown', message: (err as Error).message } }));
    } finally {
      setSubmitting(undefined);
    }
  }

  // --- Render ------------------------------------------------------------
  if (puzzle.error) return <p className="error page-message">{puzzle.error}</p>;
  if (!puzzle.data) return <p className="quiet page-message">Loading puzzle…</p>;

  const hasNext = day < daysInYear(year) && isUnlocked(year, day + 1);
  const solutionFile = `solutions/${year}/day${String(day).padStart(2, '0')}/solution.${lang.extension}`;
  const usesInput = (part: Part) => runs[part]?.sources.length === 1 && runs[part]?.sources[0] === 'input';
  const canSubmit = (part: Part) =>
    usesInput(part) && runs[part]?.state === 'done' && !answers[part - 1] && answers.length === part - 1;

  const tabs: [Tab, string][] = [
    ['puzzle', 'Puzzle'],
    ['input', DATA_FILES.input],
    ['example', DATA_FILES.example],
  ];

  return (
    <div className="day">
      <div className="daybar">
        {day > 1 ? (
          <a href={`#/${year}/${day - 1}`} title="Previous day">
            ‹
          </a>
        ) : (
          <span className="quiet">‹</span>
        )}
        <h2>
          Day {day} <span className="quiet">· {year}</span>
        </h2>
        {hasNext ? (
          <a href={`#/${year}/${day + 1}`} title="Next day">
            ›
          </a>
        ) : (
          <span className="quiet">›</span>
        )}
        <em className="daybar-title">{puzzle.data.title}</em>
        <Stars count={answers.length} />
        <a href={`https://adventofcode.com/${year}/day/${day}`} target="_blank" rel="noopener">
          Puzzle ↗
        </a>
        <a href={`https://adventofcode.com/${year}/day/${day}/input`} target="_blank" rel="noopener">
          My input ↗
        </a>
        <span className="spacer" />
        <div className="segmented" role="group" aria-label="Language">
          {LANGUAGES.map((l) => (
            <button key={l.id} aria-pressed={l.id === lang.id} onClick={() => setLangId(l.id)}>
              {l.name}
            </button>
          ))}
        </div>
      </div>

      <div
        className="day-grid"
        ref={gridRef}
        style={{ gridTemplateColumns: `minmax(0, ${cols}fr) auto minmax(0, ${1 - cols}fr)` }}
      >
        <section className="pane editor-pane">
          <div className="pane-head">
            <span title={solutionFile}>solution.{lang.extension}</span>
            <span className={saveState === 'error' ? 'error' : 'quiet'}>
              {saveState === 'pending' ? '● unsaved' : saveState === 'error' ? 'save failed' : 'saved'}
            </span>
            <span className="spacer" />
            <span className="quiet hint">Ctrl+S save & run · Ctrl+Enter run</span>
            <div className="font-size" role="group" aria-label="Code size">
              <button className="btn" onClick={() => stepFont(-1)} disabled={fontIndex === 0} aria-label="Smaller code" title="Smaller code">
                A−
              </button>
              <button className="btn" onClick={() => setFontSize(String(DEFAULT_FONT_SIZE))} title="Reset code size">
                {fontSize}px
              </button>
              <button
                className="btn"
                onClick={() => stepFont(1)}
                disabled={fontIndex === FONT_SIZES.length - 1}
                aria-label="Larger code"
                title="Larger code"
              >
                A+
              </button>
            </div>
            <button className="btn" onClick={() => setConfirmingTemplate(true)} disabled={code === undefined}>
              Template
            </button>
          </div>
          {code === undefined ? (
            <div className="editor quiet">Loading code…</div>
          ) : (
            <CodeEditor
              fontSize={fontSize}
              language={lang.id}
              value={code}
              onChange={onCodeChange}
              onRun={() => run(lastTarget.current)}
              dataHints={dataHints}
              onHoverData={setHinted}
            />
          )}
        </section>

        <Splitter
          orientation="vertical"
          containerRef={gridRef}
          value={cols}
          onChange={(v) => setCols(clamp(v, 0.25, 0.75))}
          onDoubleClick={() => setCols(DEFAULT_COLS)}
          label="Resize editor"
        />

        <section className="pane side-pane" ref={sideRef}>
          <div className={`side-top${collapsed ? ' collapsed' : ''}`} style={collapsed ? undefined : { height: `${rows * 100}%` }}>
            <div className="tabs" role="tablist">
              {tabs.map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={!collapsed && tab === id}
                  className={hinted === id ? 'hinted' : undefined}
                  onClick={() => openTab(id)}
                >
                  {label}
                  {id === 'example' && !example.trim() && <span className="tab-warn" title="Empty"> !</span>}
                </button>
              ))}
              <span className="spacer" />
              {!collapsed && tab === 'puzzle' && (
                <button className="btn small" onClick={() => puzzle.reload(true)} disabled={puzzle.loading}>
                  Refresh
                </button>
              )}
              {!collapsed && tab === 'example' && example !== detectedExample && detectedExample && (
                <button className="btn small" onClick={() => setExample(detectedExample)}>
                  Restore
                </button>
              )}
            </div>

            {!collapsed && (
              <div className={`tab-body${hinted && hinted === tab ? ' hinted' : ''}`}>
                {tab === 'puzzle' && (
                  <div className="puzzle">
                    {puzzle.data.parts.map((html, i) => (
                      <div key={i}>
                        <article className="day-desc" dangerouslySetInnerHTML={{ __html: sanitize(html) }} />
                        {answers[i] && (
                          <p>
                            Your puzzle answer was <code>{answers[i]}</code>.
                          </p>
                        )}
                      </div>
                    ))}
                    {answers.length >= 2 ? (
                      <p className="day-success">Both parts of this puzzle are complete! They provide two gold stars: **</p>
                    ) : (
                      <p className="quiet">
                        {answers.length === 1 ? 'Solve part 2 for the second star.' : 'Solve part 1 to unlock part 2.'}
                      </p>
                    )}
                  </div>
                )}
                {tab === 'input' &&
                  (input.error ? (
                    <p className="error file-note">{input.error}</p>
                  ) : input.text === undefined ? (
                    <p className="quiet file-note">Downloading your input…</p>
                  ) : (
                    <>
                      <p className="quiet file-note">
                        {countLines(input.text)} lines · {input.text.length} chars · read-only, cached locally
                      </p>
                      <pre className="input-view">{input.text}</pre>
                    </>
                  ))}
                {tab === 'example' && (
                  <>
                    <p className="quiet file-note">
                      {example.trim() ? `${countLines(example)} lines · editable` : 'No example block found in this puzzle.'}
                    </p>
                    <textarea
                      value={example}
                      onChange={(e) => setExample(e.target.value)}
                      spellCheck={false}
                      placeholder={`Paste an example here. Your code reads it as ${DATA_FILES.example}.`}
                      aria-label={DATA_FILES.example}
                    />
                  </>
                )}
              </div>
            )}
          </div>

          <Splitter
            orientation="horizontal"
            containerRef={sideRef}
            value={rows}
            onChange={changeRows}
            onDoubleClick={toggleCollapsed}
            label="Resize panels"
          />

          <div className="side-bottom">
            <div className="runbar">
              <button className="btn primary" onClick={() => run(1)} disabled={code === undefined}>
                ▶ Part 1
              </button>
              <button className="btn primary" onClick={() => run(2)} disabled={code === undefined}>
                ▶ Part 2
              </button>
              <button className="btn" onClick={() => run('both')} disabled={code === undefined}>
                ▶ Both
              </button>
              {running && (
                <button className="btn danger" onClick={stop}>
                  ■ Stop
                </button>
              )}
              <span className="spacer" />
              <button className="btn small" onClick={toggleCollapsed} title="Double-click the divider does the same">
                {collapsed ? '⤓ Show panels' : '⤒ Focus output'}
              </button>
            </div>

            <div className="cards">
              {([1, 2] as const).map((part) => (
                <PartCard
                  key={part}
                  part={part}
                  run={runs[part]}
                  sources={sources[part]}
                  accepted={answers[part - 1]}
                  exampleAnswer={exampleAnswers[part - 1]}
                  canSubmit={canSubmit(part)}
                  submitting={submitting === part}
                  submission={submissions[part]}
                  onSubmit={(answer) => submit(part, answer)}
                  onHoverSource={setHinted}
                />
              ))}
            </div>

            <div className="pane-head">
              <span>Console</span>
              <span className="spacer" />
              <button className="btn small" onClick={() => setLines([])}>
                Clear
              </button>
            </div>
            <pre className="console" ref={consoleRef} aria-live="polite">
              {lines.map((line, i) => (
                <span key={i} className={`line ${line.kind}`}>
                  {line.text}
                  {'\n'}
                </span>
              ))}
            </pre>
          </div>
        </section>
      </div>

      {confirmingTemplate && (
        <ConfirmDialog
          title="Reset to template"
          message={`This replaces your ${lang.name} code for day ${day} with the starter template. It cannot be undone.`}
          confirmLabel="Replace code"
          onConfirm={resetToTemplate}
          onCancel={closeTemplateDialog}
        />
      )}
    </div>
  );
}
