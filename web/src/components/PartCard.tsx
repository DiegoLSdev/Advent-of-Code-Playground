import type { DataSource } from '../../../shared/languages.ts';
import type { AnswerResult } from '../../../shared/types.ts';
import type { RunResult } from '../runners/types.ts';

export interface PartRun {
  state: 'running' | 'done' | 'stopped';
  /** Data the code used in this run. */
  sources: DataSource[];
  result?: RunResult;
}

interface Props {
  part: 1 | 2;
  run?: PartRun;
  /** Data the current code uses (updates while typing). */
  sources: DataSource[];
  /** Answer already accepted by AoC for this part. */
  accepted?: string;
  /** Example answer detected in the puzzle text. */
  exampleAnswer?: string;
  canSubmit: boolean;
  submitting: boolean;
  submission?: AnswerResult;
  onSubmit: (answer: string) => void;
  onHoverSource: (source: DataSource | null) => void;
}

export function SourceBadges({ sources, onHover }: { sources: DataSource[]; onHover: (s: DataSource | null) => void }) {
  if (!sources.length) return <span className="badge none" title="This part reads neither input nor example">no data</span>;
  return (
    <>
      {sources.map((s) => (
        <span key={s} className={`badge ${s}`} onMouseEnter={() => onHover(s)} onMouseLeave={() => onHover(null)}>
          {s}
        </span>
      ))}
    </>
  );
}

export function PartCard(props: Props) {
  const { part, run, sources, accepted, exampleAnswer, canSubmit, submitting, submission, onSubmit, onHoverSource } = props;
  const result = run?.result;
  const usedOnly = (s: DataSource) => run?.sources.length === 1 && run.sources[0] === s;
  const expected = usedOnly('input') ? accepted : usedOnly('example') ? exampleAnswer : undefined;

  let body;
  if (!run) body = <span className="quiet">not run yet</span>;
  else if (run.state === 'running') body = <span className="quiet">running…</span>;
  else if (run.state === 'stopped') body = <span className="quiet">stopped</span>;
  else if (!result?.ok) body = <span className="error">error · see console</span>;
  else {
    const matches = expected !== undefined && result.result === expected;
    body = (
      <>
        <div className="card-value">
          <span className="result">{result.result}</span> <span className="quiet">{result.timeMs.toFixed(1)} ms</span>
        </div>
        {expected !== undefined && (
          <div className={matches ? 'success' : usedOnly('input') ? 'error' : 'quiet'}>
            {matches
              ? usedOnly('input')
                ? '✓ matches your accepted answer'
                : '✓ matches the example'
              : `✗ ${usedOnly('input') ? 'your accepted answer was' : 'the example expects'} ${expected}`}
          </div>
        )}
      </>
    );
  }

  return (
    <div className={`card${run?.state === 'running' ? ' running' : ''}`}>
      <div className="card-head">
        <span>Part {part}</span>
        <SourceBadges sources={sources} onHover={onHoverSource} />
        <span className={`star ${accepted ? 'gold' : ''}`} title={accepted ? `Accepted: ${accepted}` : 'Not solved yet'}>
          *
        </span>
      </div>
      {body}
      {canSubmit && result?.result && (
        <button className="btn small" onClick={() => onSubmit(result.result!)} disabled={submitting}>
          {submitting ? 'Submitting…' : `Submit ${result.result}`}
        </button>
      )}
      {submission && (
        <div className={`card-note ${submission.status === 'correct' ? 'success' : submission.status === 'incorrect' ? 'error' : 'quiet'}`}>
          {submission.message}
        </div>
      )}
    </div>
  );
}
