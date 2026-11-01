import { useCallback, useEffect, useState } from 'react';
import type { Me } from '../../shared/types.ts';
import { api, STARS_CHANGED } from './api.ts';
import { useAsync, useRoute } from './hooks.ts';
import { DayPage } from './pages/DayPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { YearPage } from './pages/YearPage.tsx';

export function App() {
  const route = useRoute();
  const [me, setMe] = useState<Me>();
  const [meError, setMeError] = useState<string>();
  const ready = Boolean(me?.valid);
  const years = useAsync(() => (ready ? api.years() : Promise.resolve([])), [ready]);
  const year = route.page === 'year' || route.page === 'day' ? route.year : undefined;

  const loadMe = useCallback(() => {
    api.me().then(setMe, (err: Error) => setMeError(err.message));
  }, []);
  useEffect(loadMe, [loadMe]);

  useEffect(() => {
    const onChange = () => years.reload();
    window.addEventListener(STARS_CHANGED, onChange);
    return () => window.removeEventListener(STARS_CHANGED, onChange);
  }, [years.reload]);

  const yearStars = year !== undefined ? years.data?.find((y) => y.year === year)?.stars : undefined;
  const totalStars = years.data?.reduce((sum, y) => sum + y.stars, 0);

  let page;
  if (meError) page = <p className="error">Could not reach the local server: {meError}</p>;
  else if (!me) page = <p className="quiet">Loading…</p>;
  else if (route.page === 'settings' || !me.valid) page = <SettingsPage me={me} onSaved={setMe} />;
  else if (route.page === 'home') page = <HomePage years={years} />;
  else if (route.page === 'year') page = <YearPage year={route.year} />;
  else page = <DayPage key={`${route.year}-${route.day}`} year={route.year} day={route.day} />;

  const fullHeight = route.page === 'day' && me?.valid;

  return (
    <div className={fullHeight ? 'app-full' : undefined}>
      <header>
        <div>
          <h1 className="title-global">
            <a href="#/">AoC Playground</a>
          </h1>
          <nav>
            <ul>
              <li>
                <a href="#/">[Events]</a>
              </li>
              <li>
                <a href="#/settings">[Settings]</a>
              </li>
            </ul>
          </nav>
          {me?.user && (
            <div className="user">
              {me.user}{' '}
              <span className="star-count">{(year !== undefined ? yearStars : totalStars) ?? '?'}*</span>
            </div>
          )}
        </div>
        {year !== undefined && (
          <div>
            <h1 className="title-event">
              {'  '}
              <span className="title-event-wrap">const year = </span>
              <a href={`#/${year}`}>{year}</a>
              <span className="title-event-wrap">;</span>
            </h1>
            <nav>
              <ul>
                <li>
                  <a href={`#/${year}`}>[Calendar]</a>
                </li>
                <li>
                  <a href={`https://adventofcode.com/${year}${route.page === 'day' ? `/day/${route.day}` : ''}`} target="_blank" rel="noopener">
                    [Open on AoC]
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </header>
      <main className={fullHeight ? undefined : 'narrow'}>{page}</main>
    </div>
  );
}
