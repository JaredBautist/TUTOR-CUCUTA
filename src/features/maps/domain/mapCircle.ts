import type { GeographicPosition } from './contracts';
import { isGeographicPosition } from './geography';

const EARTH_RADIUS_METERS = 6371008.8;
const CIRCLE_SEGMENTS = 128;

/** Closed geographic ring in [longitude, latitude] order; rejects invalid centers/radii. */
export function circleCoordinates(center: GeographicPosition, radiusMeters: number): [number, number][] {
  if (!isGeographicPosition(center) || !Number.isFinite(radiusMeters) || radiusMeters < 0) {
    throw new RangeError('A geographic circle requires a valid center and nonnegative radius.');
  }
  const latitude = center.latitude * Math.PI / 180;
  const longitude = center.longitude * Math.PI / 180;
  const angle = radiusMeters / EARTH_RADIUS_METERS;
  const ring: [number, number][] = [];
  for (let segment = 0; segment < CIRCLE_SEGMENTS; segment++) {
    const bearing = segment * 2 * Math.PI / CIRCLE_SEGMENTS;
    const nextLatitude = Math.asin(Math.sin(latitude) * Math.cos(angle)
      + Math.cos(latitude) * Math.sin(angle) * Math.cos(bearing));
    const nextLongitude = longitude + Math.atan2(Math.sin(bearing) * Math.sin(angle) * Math.cos(latitude),
      Math.cos(angle) - Math.sin(latitude) * Math.sin(nextLatitude));
    // Keep the ring continuous across the date line; MapLibre accepts wrapped longitudes.
    ring.push([nextLongitude * 180 / Math.PI, nextLatitude * 180 / Math.PI]);
  }
  ring.push([...ring[0]]);
  return ring;
}
