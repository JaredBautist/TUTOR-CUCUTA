import { useEffect, useState, useSyncExternalStore } from 'react';
import { createDeviceLocationSession } from './deviceLocation';
import { watchBrowserPosition } from '../infrastructure/browserGeolocation';

/** Request native permission on first visibility and subscribe to own-device observations; active follows actual map/tab visibility. */
export function useDeviceLocation(active: boolean) {
  const [session] = useState(() => createDeviceLocationSession(watchBrowserPosition));
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  useEffect(() => {
    session.setActive(active);
    if (active) session.startAutomatically();
  }, [session, active]);
  useEffect(() => {
    const timer = window.setInterval(session.checkFreshness, 1000);
    return () => { window.clearInterval(timer); session.stop(); };
  }, [session]);
  return { ...snapshot, start: session.start, stop: session.stop };
}
