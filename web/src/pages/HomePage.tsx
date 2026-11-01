import type { YearSummary } from '../../../shared/types.ts';
import type { Async } from '../hooks.ts';

const BAR_WIDTH = 25;

export function HomePage({ years }: { years: Async<YearSummary[]> }) {
  return (
    <>
      <p>Pick an event to practice its puzzles:</p>
      {years.error && <p className="error">{years.error}</p>}
      {!years.data && years.loading && <p className="quiet">Loading stars…</p>}
      {years.data?.map((y) => {
        const filled = Math.round((y.stars / y.maxStars) * BAR_WIDTH);
        return (
          <div className="eventlist-event" key={y.year}>
            <a href={`#/${y.year}`}>[{y.year}]</a>{' '}
            <span className="progress">
              <span className="filled">{'*'.repeat(filled)}</span>
              {'*'.repeat(BAR_WIDTH - filled)}
            </span>{' '}
            <span className="star-count">{String(y.stars).padStart(2)}*</span>
            <span className="quiet"> / {y.maxStars}</span>
          </div>
        );
      })}
      {years.data && (
        <p>
          <button className="link" onClick={() => years.reload(true)} disabled={years.loading}>
            [Refresh stars]
          </button>
        </p>
      )}
    </>
  );
}
