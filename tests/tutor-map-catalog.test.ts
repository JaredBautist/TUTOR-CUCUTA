import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Tutor } from '../src/types';
import { attachPublishedTutorLocations } from '../src/features/maps/application/tutorMapCatalog';

test('GM-10: withdrawing a published point removes old coordinates without deleting the tutor', () => {
  const tutor = { id: 'tutor-1', name: 'Docente real', location: { latitude: 7.89, longitude: -72.5 }, distanceKm: 1 } as Tutor;
  const first = attachPublishedTutorLocations([tutor], [{ tutorId: tutor.id, position: { latitude: 7.891, longitude: -72.501 }, precision: 'approximate', updatedAt: '2026-09-10T00:00:00Z' }]);
  assert.deepEqual(first[0].location, { latitude: 7.891, longitude: -72.501 });
  assert.equal(first[0].locationPrecision, 'approximate');
  const withdrawn = attachPublishedTutorLocations(first, []);
  assert.equal(withdrawn[0].location, undefined);
  assert.equal(withdrawn[0].distanceKm, undefined);
  assert.equal(withdrawn[0].locationUpdatedAt, undefined);
  assert.equal(withdrawn[0].name, tutor.name);
  assert.equal(tutor.location.latitude, 7.89, 'The raw catalog record is preserved');
});
