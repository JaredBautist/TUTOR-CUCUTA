import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDeviceLocationSession } from '../src/features/maps/application/deviceLocation';
import type { DevicePosition } from '../src/features/maps/domain/contracts';

function scenario() {
  let receive: (position: DevicePosition) => void = () => {};
  let fail: (code: 'denied' | 'timeout' | 'unavailable') => void = () => {};
  let starts = 0;
  let stops = 0;
  let time = 100000;
  const session = createDeviceLocationSession((onPosition, onError) => {
    starts++;
    receive = onPosition;
    fail = onError;
    return () => { stops++; };
  }, () => time);
  return { session, emit: (position: DevicePosition) => receive(position), fail: (code: 'denied' | 'timeout' | 'unavailable') => fail(code),
    tick: (value: number) => { time = value; session.checkFreshness(); }, counts: () => ({ starts, stops }) };
}
const observed: DevicePosition = { position: { latitude: 7.89, longitude: -72.5 }, accuracyMeters: 12, observedAt: new Date(100000).toISOString() };

test('GM-07/08: tracking starts only on request and pauses when its map is hidden', () => {
  const { session, emit, counts } = scenario();
  session.setActive(true);
  assert.equal(counts().starts, 0, 'Showing a map must not request permission');
  session.start();
  assert.equal(session.getSnapshot().status, 'requesting');
  emit(observed);
  assert.deepEqual(session.getSnapshot().observation, observed);
  assert.equal(session.getSnapshot().status, 'tracking');
  session.setActive(false);
  assert.equal(session.getSnapshot().status, 'paused');
  assert.equal(counts().stops, 1);
  session.setActive(true);
  assert.equal(counts().starts, 2);
  session.stop();
  assert.equal(counts().stops, 2);
  assert.equal(session.getSnapshot().observation, undefined);
});

test('GM-08/09: denial/timeout is explicit and late observations cannot restore a stopped location', () => {
  for (const code of ['denied', 'timeout', 'unavailable'] as const) {
    const { session, emit, fail, counts } = scenario();
    session.setActive(true); session.start(); fail(code);
    assert.equal(session.getSnapshot().status, code);
    assert.equal(session.getSnapshot().isEnabled, false);
    emit(observed);
    assert.equal(session.getSnapshot().observation, undefined);
    assert.equal(counts().stops, 1);
  }
});

test('GM-07/08: stale and invalid observations are not described as live', () => {
  const { session, emit, tick } = scenario();
  session.setActive(true); session.start();
  emit({ ...observed, position: { latitude: 100, longitude: -72.5 } });
  assert.equal(session.getSnapshot().observation, undefined);
  assert.equal(session.getSnapshot().status, 'unavailable', 'An invalid fix must not leave permission/loading pending forever');
  session.start();
  emit(observed); tick(170001);
  assert.equal(session.getSnapshot().status, 'stale');
  emit({ ...observed, observedAt: new Date(170001).toISOString() });
  assert.equal(session.getSnapshot().status, 'tracking');
});

test('GM-08: observations from an old watcher are ignored after a visibility restart', () => {
  const callbacks: ((position: DevicePosition) => void)[] = [];
  const session = createDeviceLocationSession((onPosition) => { callbacks.push(onPosition); return () => {}; }, () => 100000);
  session.setActive(true); session.start(); session.setActive(false); session.setActive(true);
  callbacks[0](observed);
  assert.equal(session.getSnapshot().observation, undefined);
  callbacks[1](observed);
  assert.deepEqual(session.getSnapshot().observation, observed);
  session.stop();
});

test('Automatic location: visible maps request once, stop and denial prevent automatic retries', () => {
  const { session, counts, fail } = scenario();
  session.startAutomatically();
  assert.equal(counts().starts, 0, 'Hidden maps must not request location');
  session.setActive(true);
  session.startAutomatically();
  assert.equal(counts().starts, 1);
  session.startAutomatically();
  assert.equal(counts().starts, 1, 'Rendering again must not repeat the prompt');
  fail('denied');
  session.setActive(false); session.setActive(true); session.startAutomatically();
  assert.equal(counts().starts, 1, 'Denial must not cause a prompt loop');
  session.start();
  assert.equal(counts().starts, 2, 'Explicit retry remains available');
  session.stop(); session.setActive(false); session.setActive(true); session.startAutomatically();
  assert.equal(counts().starts, 2, 'Stopping must be respected after visibility changes');
});
