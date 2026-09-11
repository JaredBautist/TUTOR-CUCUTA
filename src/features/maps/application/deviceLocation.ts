import type { DevicePosition } from '../domain/contracts';
import { isGeographicPosition } from '../domain/geography';

export type DeviceLocationStatus = 'idle' | 'requesting' | 'tracking' | 'paused' | 'denied' | 'unavailable' | 'timeout' | 'stale';
export interface DeviceLocationSnapshot {
  observation?: DevicePosition;
  status: DeviceLocationStatus;
  isEnabled: boolean;
}
export type WatchDevicePosition = (onPosition: (position: DevicePosition) => void,
  onError: (code: 'denied' | 'timeout' | 'unavailable') => void) => () => void;

export const POSITION_MAX_AGE_MS = 60000;

/** Own-device session: browser permission, one automatic request, visibility pause, stale detection and cancellable observations. */
export function createDeviceLocationSession(watch: WatchDevicePosition, now = Date.now) {
  let snapshot: DeviceLocationSnapshot = { status: 'idle', isEnabled: false };
  let active = false;
  let automaticStartAttempted = false;
  let generation = 0;
  let cancelWatch: (() => void) | undefined;
  const listeners = new Set<() => void>();
  const publish = (next: DeviceLocationSnapshot) => {
    snapshot = next;
    listeners.forEach(listener => listener());
  };
  const releaseWatch = () => {
    generation++;
    cancelWatch?.();
    cancelWatch = undefined;
  };
  const beginWatch = () => {
    releaseWatch();
    const currentGeneration = generation;
    publish({ ...snapshot, status: 'requesting', isEnabled: true });
    const fail = (status: 'denied' | 'timeout' | 'unavailable') => {
      if (generation !== currentGeneration) return;
      releaseWatch();
      publish({ status, isEnabled: false });
    };
    try {
      const unsubscribe = watch((observation) => {
        if (generation !== currentGeneration || !active || !snapshot.isEnabled) return;
        const timestamp = Date.parse(observation.observedAt);
        if (!isGeographicPosition(observation.position) || !Number.isFinite(observation.accuracyMeters)
          || observation.accuracyMeters < 0 || !Number.isFinite(timestamp) || timestamp > now() + 5000) {
          fail('unavailable');
          return;
        }
        if (snapshot.observation && timestamp < Date.parse(snapshot.observation.observedAt)) return;
        publish({ observation, isEnabled: true, status: now() - timestamp > POSITION_MAX_AGE_MS ? 'stale' : 'tracking' });
      }, fail);
      if (generation === currentGeneration) cancelWatch = unsubscribe;
      else unsubscribe();
    } catch {
      fail('unavailable');
    }
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    /** Request once when visible; never automatically retry denial or an explicit stop. */
    startAutomatically: () => {
      if (!active || automaticStartAttempted) return;
      automaticStartAttempted = true;
      beginWatch();
    },
    start: () => {
      automaticStartAttempted = true;
      if (active) beginWatch();
      else publish({ ...snapshot, isEnabled: true, status: 'paused' });
    },
    stop: () => { releaseWatch(); publish({ status: 'idle', isEnabled: false }); },
    setActive: (next: boolean) => {
      if (active === next) return;
      active = next;
      if (!snapshot.isEnabled) return;
      if (active) beginWatch();
      else { releaseWatch(); publish({ ...snapshot, status: 'paused' }); }
    },
    checkFreshness: () => {
      if (active && snapshot.isEnabled && snapshot.status === 'tracking' && snapshot.observation
        && now() - Date.parse(snapshot.observation.observedAt) > POSITION_MAX_AGE_MS) {
        publish({ ...snapshot, status: 'stale' });
      }
    },
  };
}
