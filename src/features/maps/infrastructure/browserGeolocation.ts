import type { WatchDevicePosition } from '../application/deviceLocation';

/** Browser adapter: single-shot approximate observation without continuous background GPS tracking. */
export const watchBrowserPosition: WatchDevicePosition = (onPosition, onError) => {
  if (typeof navigator === 'undefined' || !navigator.geolocation || !globalThis.isSecureContext) {
    onError('unavailable');
    return () => {};
  }
  let active = true;
  navigator.geolocation.getCurrentPosition((position) => {
    if (!active) return;
    if (!Number.isFinite(new Date(position.timestamp).getTime())) { onError('unavailable'); return; }
    onPosition({
      position: { latitude: position.coords.latitude, longitude: position.coords.longitude },
      accuracyMeters: position.coords.accuracy,
      observedAt: new Date(position.timestamp).toISOString(),
    });
  }, (error) => {
    if (!active) return;
    onError(error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable');
  }, {
    enableHighAccuracy: false, maximumAge: 300000, timeout: 15000,
  });
  return () => { active = false; };
};
