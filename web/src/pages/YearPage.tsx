import { daysInYear, isUnlocked, unlockTime } from '../../../shared/calendar.ts';
import { api } from '../api.ts';
import { Stars } from '../components/Stars.tsx';
import { useAsync } from '../hooks.ts';

export function YearPage({ year }: { year: number }) {
  const stars = useAsync((refresh) => api.year(year, refresh), [year]);
  const byDay = new Map(stars.data?.days.map((d) => [d.day, d.stars]));

  return (
    <>
      {stars.error && <p className="error">{stars.error}</p>}
      <div className="calendar">
        {Array.from({ length: daysInYear(year) }, (_, i) => i + 1).map((day) => {
          const label = `Day ${String(day).padStart(2)}  `;
          if (!isUnlocked(year, day)) {
            return (
              <span key={day} className="locked" title={`Unlocks ${new Date(unlockTime(year, day)).toLocaleString()}`}>
                {label}**
              </span>
            );
          }
          return (
            <a key={day} href={`#/${year}/${day}`}>
              {label}
              <Stars count={byDay.get(day) ?? 0} />
            </a>
          );
        })}
      </div>
      <p className="quiet">
        {stars.data ? `${stars.data.total}* of ${daysInYear(year) * 2} · ` : ''}
        <button className="link" onClick={() => stars.reload(true)} disabled={stars.loading}>
          [Refresh]
        </button>
      </p>
    </>
  );
}
