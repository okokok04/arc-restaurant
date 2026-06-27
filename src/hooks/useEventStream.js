import { useState, useEffect, useCallback } from 'react';
import { fetchContractEvents } from '../lib/soroban.js';

const POLL_INTERVAL_MS = 5000;

export function useEventStream(enabled = true) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastLedger, setLastLedger] = useState(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const fetched = await fetchContractEvents(lastLedger);
      if (fetched.length > 0) {
        setEvents((prev) => {
          const ids = new Set(prev.map((e) => e.id));
          const novel = fetched.filter((e) => !ids.has(e.id));
          return [...novel, ...prev].slice(0, 50);
        });
        const maxLedger = Math.max(...fetched.map((e) => e.ledger || 0));
        if (maxLedger > 0) setLastLedger(maxLedger + 1);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, [enabled, lastLedger]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled, refresh]);

  return { events, loading, error, refresh };
}
