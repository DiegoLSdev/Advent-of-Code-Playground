import { useCallback, useEffect, useRef, useState } from 'react';

export type Route =
  | { page: 'home' }
  | { page: 'settings' }
  | { page: 'year'; year: number }
  | { page: 'day'; year: number; day: number };

function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'settings') return { page: 'settings' };
  const year = Number(parts[0]);
  const day = Number(parts[1]);
  if (Number.isInteger(year) && Number.isInteger(day)) return { page: 'day', year, day };
  if (Number.isInteger(year)) return { page: 'year', year };
  return { page: 'home' };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export interface Async<T> {
  data?: T;
  error?: string;
  loading: boolean;
  reload: (refresh?: boolean) => void;
}

/** Loads API data and reloads it when the dependencies change. */
export function useAsync<T>(load: (refresh: boolean) => Promise<T>, deps: unknown[]): Async<T> {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const [request, setRequest] = useState({ n: 0, refresh: false });

  const stableLoad = useCallback(load, deps);
  const lastLoad = useRef(stableLoad);

  useEffect(() => {
    let cancelled = false;
    // A reload keeps the current data; navigating elsewhere does not.
    const keep = lastLoad.current === stableLoad;
    lastLoad.current = stableLoad;
    setState((s) => ({ data: keep ? s.data : undefined, loading: true }));
    stableLoad(request.refresh).then(
      (data) => !cancelled && setState({ data, loading: false }),
      (err: Error) => !cancelled && setState({ error: err.message, loading: false }),
    );
    return () => {
      cancelled = true;
    };
  }, [stableLoad, request]);

  const reload = useCallback((refresh = false) => setRequest((r) => ({ n: r.n + 1, refresh })), []);
  return { ...state, reload };
}

export function useLocalStorage(key: string, initial: string): [string, (v: string) => void] {
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(key) ?? initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      setValue(localStorage.getItem(key) ?? initial);
    } catch {
      setValue(initial);
    }
  }, [key, initial]);
  const update = useCallback(
    (v: string) => {
      setValue(v);
      try {
        localStorage.setItem(key, v);
      } catch {
        // No storage available: the value only lives in this tab.
      }
    },
    [key],
  );
  return [value, update];
}
