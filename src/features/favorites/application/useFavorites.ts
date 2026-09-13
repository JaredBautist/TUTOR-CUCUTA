import { useCallback, useEffect, useRef, useState } from 'react';
import type { FavoritesRepository } from '../domain/contracts';

/** Account-keyed parent owns lifetime; no stale reads or unacknowledged bookmark changes. */
export function useFavorites(repository: FavoritesRepository, enabled: boolean) {
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(false);
  const writing = useRef(false);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    if (!enabled || writing.current) return;
    const request = ++generation.current;
    try {
      const saved = await repository.list();
      if (mounted.current && request === generation.current) { setIds(saved); setError(''); }
    } catch (cause) {
      if (mounted.current && request === generation.current) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar tus favoritos.');
    } finally {
      if (mounted.current && request === generation.current) setLoading(false);
    }
  }, [repository, enabled]);

  useEffect(() => {
    mounted.current = true;
    if (!enabled) return () => { mounted.current = false; };
    void refresh();
    const update = () => { if (document.visibilityState === 'visible') void refresh(); };
    const timer = window.setInterval(update, 30000);
    window.addEventListener('focus', update);
    return () => { mounted.current = false; generation.current++; clearInterval(timer); window.removeEventListener('focus', update); };
  }, [enabled, refresh]);

  const toggle = useCallback(async (tutorId: string) => {
    if (!enabled || loading || error || writing.current) return;
    writing.current = true;
    generation.current++;
    setBusy(true);
    const desired = !ids.includes(tutorId);
    try {
      const saved = await repository.set(tutorId, desired);
      if (mounted.current) setIds(previous => saved ? [...new Set([...previous, tutorId])] : previous.filter(id => id !== tutorId));
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'No se pudo confirmar el favorito.');
    } finally {
      writing.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [enabled, loading, error, ids, repository]);

  return { ids, loading, busy, error, refresh, toggle, disabled: !enabled || loading || busy || Boolean(error) };
}
