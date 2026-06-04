import { useState, useEffect, useCallback, useRef } from "react";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  intervalMs = 15000,
  deps: unknown[] = [],
): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Always keep a ref to the latest fetcher so re-renders with new inline
  // arrow functions don't trigger extra fetches and cause infinite loops.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcherRef.current()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
          setLoading(false);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // `deps` lets callers trigger a re-fetch when their fetcher's captured
    // inputs change (e.g. roundId becoming non-null after async load).
    // Without this, the fetcher closure updates via fetcherRef but the effect
    // only re-fires on `tick`, leaving panels silently empty until the next
    // interval (up to 60s).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  useEffect(() => {
    if (intervalMs <= 0) return;
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, refresh]);

  return { data, loading, error, refresh };
}
