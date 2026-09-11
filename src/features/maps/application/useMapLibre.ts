import { useEffect, useRef, useState, type RefObject } from 'react';
import { MapLibreController, MapRenderError, type MapSnapshot } from '../infrastructure/mapLibreAdapter';

/** Load the bundled open map engine only for visible maps; clean up workers and overlays on unmount/retry. */
export function useMapLibre(container: RefObject<HTMLDivElement | null>, snapshot: MapSnapshot, active: boolean) {
  const controller = useRef<MapLibreController | null>(null);
  const latestSnapshot = useRef(snapshot);
  latestSnapshot.current = snapshot;
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<MapRenderError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const hasActivated = useRef(false);
  if (active) hasActivated.current = true;
  const activated = hasActivated.current;

  useEffect(() => {
    if (!activated || !container.current) return;
    let cancelled = false;
    const fail = (failure: unknown) => {
      if (cancelled) return;
      controller.current?.dispose();
      controller.current = null;
      setError(failure instanceof MapRenderError ? failure : new MapRenderError('initialization', 'No se pudo iniciar el mapa. Comprueba que tu navegador permita gráficos WebGL.'));
      setState('error');
    };
    setState('loading');
    setError(null);
    Promise.all([
      import('maplibre-gl'),
      import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
    ]).then(([sdk, { default: workerUrl }]) => {
      if (cancelled || !container.current) return;
      // Vite must bundle the v6 worker and its shared module for development and production.
      sdk.setWorkerUrl(workerUrl);
      controller.current = new MapLibreController(container.current, sdk, {
        origin: latestSnapshot.current.origin,
        onReady: () => { if (!cancelled) { setState('ready'); setError(null); } },
        onError: fail,
      });
      controller.current.update(latestSnapshot.current);
    }).catch(fail);
    return () => { cancelled = true; controller.current?.dispose(); controller.current = null; };
  }, [activated, attempt, container]);

  useEffect(() => {
    if (active) controller.current?.update(snapshot);
  }, [active, snapshot, state]);

  useEffect(() => { if (active) controller.current?.resize(); }, [active, state]);

  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(() => controller.current?.resize());
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [container]);

  return { controller, state, error, retry: () => setAttempt((previous) => previous + 1) };
}
