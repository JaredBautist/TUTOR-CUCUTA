import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CUCUTA_REFERENCE_ORIGIN, distanceKilometers, getOriginPosition,
  isGeographicPosition, radiusToMeters, selectTutorsInArea,
} from '../src/features/maps/domain/geography';
import type { Tutor } from '../src/types';

const tutor = (id: string, modalities: Tutor['modalities'], location?: Tutor['location']): Tutor => ({
  id, name: id, title: '', institution: '', avatar: '', experienceYears: 0,
  ratePerHour: 0, verified: false, sector: '', nextAvailable: '', modalities,
  subjects: [], levels: [], specialties: [], bio: '', methodologySteps: [], matchReasons: [], location,
});
const origin = getOriginPosition(CUCUTA_REFERENCE_ORIGIN);

test('GM-02/03: slider values become exact geographic meters, including teacher bounds', () => {
  for (const [kilometers, meters] of [[1, 1000], [3.5, 3500], [12, 12000], [15, 15000]]) {
    assert.equal(radiusToMeters(kilometers), meters);
  }
  for (const invalid of [0, -1, Number.NaN, Infinity]) assert.throws(() => radiusToMeters(invalid));
});

test('GM-06/12: geographic validation rejects offsets, coercions and invalid latitudes', () => {
  assert.ok(isGeographicPosition(origin));
  for (const invalid of [null, {}, { x: 490, y: 395 }, { latitude: '7.89', longitude: -72.5 },
    { latitude: 90, longitude: -72.5 }, { latitude: 7.89, longitude: 181 },
    { latitude: NaN, longitude: -72.5 }]) assert.equal(isGeographicPosition(invalid), false);
});

test('GM-16: in-person area filters cards by measured location, while virtual bypasses radius', () => {
  const near = tutor('near', ['presencial'], origin);
  const far = tutor('far', ['presencial'], { latitude: 8.5, longitude: -73 });
  const missing = tutor('unknown', ['presencial']);
  const virtual = tutor('virtual', ['virtual']);
  const both = tutor('both', ['presencial', 'virtual'], far.location);
  const all = [near, far, missing, virtual, both];
  const area = { origin: CUCUTA_REFERENCE_ORIGIN, radiusKm: 3.5 };
  assert.deepEqual(selectTutorsInArea(all, area, 'presencial').map(t => t.id), ['near']);
  assert.deepEqual(selectTutorsInArea(all, area, 'virtual').map(t => t.id), ['virtual', 'both']);
  assert.deepEqual(selectTutorsInArea(all, area, 'any').map(t => t.id), ['near', 'virtual', 'both']);
  assert.equal(selectTutorsInArea(all, area, 'presencial')[0].distanceKm, 0);
  assert.equal(near.distanceKm, undefined, 'Catalog inputs are immutable');
  assert.equal(selectTutorsInArea(all, undefined, 'presencial').length, all.length, 'Opening Results alone does not submit a search');
});

test('GM-16: radius includes its boundary and does not present a travel distance', () => {
  const position = { latitude: origin.latitude + 0.02, longitude: origin.longitude };
  const boundary = distanceKilometers(origin, position);
  const candidate = tutor('boundary', ['presencial'], position);
  assert.equal(selectTutorsInArea([candidate], { origin: CUCUTA_REFERENCE_ORIGIN, radiusKm: boundary }, 'presencial').length, 1);
  assert.equal(selectTutorsInArea([candidate], { origin: CUCUTA_REFERENCE_ORIGIN, radiusKm: boundary - 0.01 }, 'presencial').length, 0);
  assert.ok(boundary > 2 && boundary < 2.5);
});
