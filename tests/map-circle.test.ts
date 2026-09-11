import assert from 'node:assert/strict';
import test from 'node:test';
import { circleCoordinates } from '../src/features/maps/domain/mapCircle';
import { distanceKilometers } from '../src/features/maps/domain/geography';

test('geographic search circles have the requested ground distance and a closed ring', () => {
  for (const center of [{ latitude: 7.8891, longitude: -72.4967 }, { latitude: 60, longitude: 179.99 }]) {
    for (const meters of [12, 1000, 3500, 15000]) {
      const ring = circleCoordinates(center, meters);
      assert.deepEqual(ring[0], ring.at(-1));
      for (const [longitude, latitude] of ring) {
        assert.ok(Math.abs(distanceKilometers(center, { latitude, longitude }) * 1000 - meters) < 0.001);
      }
    }
  }
});

test('invalid circle observations are rejected instead of producing invalid GeoJSON', () => {
  assert.throws(() => circleCoordinates({ latitude: NaN, longitude: 0 }, 1000));
  for (const radius of [-1, Infinity, NaN]) assert.throws(() => circleCoordinates({ latitude: 7.89, longitude: -72.5 }, radius));
});
