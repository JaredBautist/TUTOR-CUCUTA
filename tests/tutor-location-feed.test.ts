import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { startTutorLocationFeed, type TutorLocationFeedState } from '../src/features/maps/application/locationFeed';
import { decodePublishedTutorLocations, createTutorLocationRepository } from '../src/features/maps/infrastructure/tutorLocationRepository';
import type { LocationFeedStatus, PublishedTutorLocation, TutorLocationRepository } from '../src/features/maps/domain/contracts';

const publishedLocation: PublishedTutorLocation = {
  tutorId: 'd83f546f-69b8-484c-a5d2-26c07c7d6184',
  position: { latitude: 7.894, longitude: -72.501 },
  precision: 'approximate',
  updatedAt: '2026-09-10T05:00:00.000Z',
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((accept, fail) => { resolve = accept; reject = fail; });
  return { promise, resolve, reject };
}

function fakeRepository() {
  const reads: ReturnType<typeof deferred<PublishedTutorLocation[]>>[] = [];
  let invalidate = () => {};
  let changeStatus = (_status: LocationFeedStatus) => {};
  let disposed = 0;
  const repository: TutorLocationRepository = {
    read() {
      const pending = deferred<PublishedTutorLocation[]>();
      reads.push(pending);
      return pending.promise;
    },
    subscribe(onInvalidation, onStatus) {
      invalidate = onInvalidation;
      changeStatus = onStatus;
      return () => { disposed += 1; };
    },
  };
  return {
    repository, reads,
    invalidate: () => invalidate(),
    status: (status: LocationFeedStatus) => changeStatus(status),
    disposals: () => disposed,
  };
}

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

test('GM-10: initial data is not live until a fresh snapshot after subscription', async () => {
  const fake = fakeRepository();
  const snapshots: TutorLocationFeedState[] = [];
  const dispose = startTutorLocationFeed(fake.repository, (snapshot) => snapshots.push(snapshot));
  assert.equal(fake.reads.length, 1);
  fake.reads[0].resolve([publishedLocation]);
  await settle();
  assert.deepEqual(snapshots.at(-1)?.locations, []);
  assert.equal(snapshots.at(-1)?.status, 'connecting');

  fake.status('connected');
  assert.equal(fake.reads.length, 2);
  fake.reads[1].resolve([publishedLocation]);
  await settle();
  assert.equal(snapshots.at(-1)?.status, 'connected');
  assert.deepEqual(snapshots.at(-1)?.locations, [publishedLocation]);
  dispose();
});

test('GM-10: concurrent update/delete invalidations cannot restore an older snapshot', async () => {
  const fake = fakeRepository();
  const snapshots: TutorLocationFeedState[] = [];
  const dispose = startTutorLocationFeed(fake.repository, (snapshot) => snapshots.push(snapshot));
  fake.status('connected');
  fake.reads[0].resolve([publishedLocation]);
  await settle();
  fake.reads[1].resolve([publishedLocation]);
  await settle();

  fake.invalidate();
  fake.invalidate();
  fake.invalidate();
  assert.equal(fake.reads.length, 3, 'Only one snapshot request may be in flight');
  fake.reads[2].resolve([{ ...publishedLocation, position: { latitude: 7.9, longitude: -72.51 } }]);
  await settle();
  assert.equal(fake.reads.length, 4, 'Coalesce pending invalidations into one follow-up read');
  assert.notEqual(snapshots.at(-1)?.locations[0]?.position.latitude, 7.9);
  fake.reads[3].resolve([]);
  await settle();
  assert.deepEqual(snapshots.at(-1)?.locations, [], 'Withdrawn rows disappear from the feed');
  assert.equal(snapshots.at(-1)?.status, 'connected');
  dispose();
});

test('GM-10: disconnect clears markers and reconnect waits for a new authoritative read', async () => {
  const fake = fakeRepository();
  const snapshots: TutorLocationFeedState[] = [];
  const dispose = startTutorLocationFeed(fake.repository, (snapshot) => snapshots.push(snapshot));
  fake.status('connected');
  fake.reads[0].resolve([]);
  await settle();
  fake.reads[1].resolve([publishedLocation]);
  await settle();
  fake.invalidate();
  fake.status('reconnecting');
  assert.equal(snapshots.at(-1)?.status, 'reconnecting');
  assert.deepEqual(snapshots.at(-1)?.locations, []);
  fake.reads[2].resolve([publishedLocation]);
  await settle();
  assert.deepEqual(snapshots.at(-1)?.locations, []);
  fake.status('connected');
  assert.equal(snapshots.at(-1)?.status, 'reconnecting');
  fake.reads[3].resolve([]);
  await settle();
  assert.equal(snapshots.at(-1)?.status, 'connected');
  assert.deepEqual(snapshots.at(-1)?.locations, []);
  dispose();
});

test('GM-10: read failures are explicit and later invalidation can recover', async () => {
  const fake = fakeRepository();
  const snapshots: TutorLocationFeedState[] = [];
  const dispose = startTutorLocationFeed(fake.repository, (snapshot) => snapshots.push(snapshot));
  fake.status('connected');
  fake.reads[0].resolve([]);
  await settle();
  fake.reads[1].reject(new Error('Location projection is unavailable'));
  await settle();
  assert.equal(snapshots.at(-1)?.status, 'unavailable');
  assert.match(snapshots.at(-1)?.error || '', /Location projection is unavailable/);
  assert.deepEqual(snapshots.at(-1)?.locations, []);
  fake.invalidate();
  fake.reads[2].resolve([publishedLocation]);
  await settle();
  assert.equal(snapshots.at(-1)?.status, 'connected');
  assert.equal(snapshots.at(-1)?.error, undefined);
  dispose();
});

test('GM-18: dispose releases subscription and ignores late reads/statuses/events', async () => {
  const fake = fakeRepository();
  const snapshots: TutorLocationFeedState[] = [];
  const dispose = startTutorLocationFeed(fake.repository, (snapshot) => snapshots.push(snapshot));
  dispose();
  dispose();
  const before = snapshots.length;
  fake.status('connected');
  fake.invalidate();
  fake.reads[0].resolve([publishedLocation]);
  await settle();
  assert.equal(fake.disposals(), 1);
  assert.equal(fake.reads.length, 1);
  assert.equal(snapshots.length, before);
});

const row = {
  tutor_id: publishedLocation.tutorId,
  latitude: 7.894,
  longitude: -72.501,
  precision: 'approximate',
  updated_at: publishedLocation.updatedAt,
};

test('GM-11: only valid deliberately approximate rows become map positions', () => {
  assert.deepEqual(decodePublishedTutorLocations([row]), [publishedLocation]);
  for (const invalid of [
    { ...row, latitude: 91 }, { ...row, longitude: -181 },
    { ...row, latitude: 90 }, { ...row, latitude: -90 }, { ...row, latitude: 85.052 },
    { ...row, latitude: Number.NaN }, { ...row, latitude: 7.894123 },
    { ...row, latitude: '7.894' }, { ...row, precision: 'exact' },
    { ...row, updated_at: 'not-a-date' }, { ...row, tutor_id: 'some-name' },
  ]) {
    assert.throws(() => decodePublishedTutorLocations([invalid]), { code: 'LOCATION_RECORD_INVALID' });
  }
  assert.throws(() => decodePublishedTutorLocations([row, row]), { code: 'LOCATION_RECORD_INVALID' });
  assert.deepEqual(decodePublishedTutorLocations([
    { ...row, tutor_id: 'b0000000-0000-0000-0000-000000000001' },
    { ...row, tutor_id: 'B0000000-0000-0000-0000-000000000001' }, row,
  ]), [publishedLocation], 'Retired reserved fixture identities never return');
});

test('GM-10: an unconfigured repository fails explicitly without demo fallback', async () => {
  const repository = createTutorLocationRepository(null);
  await assert.rejects(repository.read(), { code: 'LOCATION_NOT_CONFIGURED' });
  const statuses: LocationFeedStatus[] = [];
  const dispose = repository.subscribe(() => assert.fail('Unexpected event'), (status) => statuses.push(status));
  assert.deepEqual(statuses, ['unavailable']);
  dispose();
});

test('GM-10: adapter returns explicit public DTOs and rejects a database read error', async () => {
  let error: unknown = null;
  const client = {
    from(collection: string) {
      assert.equal(collection, 'tutor_map_locations', 'Only the deliberate public projection is readable');
      const query = {
        select(columns: string) {
          assert.doesNotMatch(columns, /geom|phone|address/, 'Private legacy fields are outside this adapter');
          return query;
        },
        order: () => query,
        range: () => query,
        abortSignal: async () => ({ data: error ? null : [row], error }),
      };
      return query;
    },
  } as unknown as SupabaseClient;
  const repository = createTutorLocationRepository(client);
  assert.deepEqual(await repository.read(), [publishedLocation]);
  error = { code: '42P01', message: 'Missing projection' };
  await assert.rejects(repository.read(), (cause: Error & { code: string; cause: unknown }) => {
    assert.equal(cause.code, 'LOCATION_READ_FAILED');
    assert.deepEqual(cause.cause, error);
    return true;
  });
});

test('GM-10: adapter invalidates on all public row events and reports actual channel lifecycle', async () => {
  let invalidation = () => {};
  let status = (_status: string) => {};
  let invalidations = 0;
  let removals = 0;
  const channel = {
    on(event: string, filter: { event: string; table: string }, callback: () => void) {
      assert.equal(event, 'postgres_changes');
      assert.deepEqual(filter, { event: '*', schema: 'public', table: 'tutor_map_locations' });
      invalidation = callback;
      return channel;
    },
    subscribe(callback: (state: string) => void) {
      status = callback;
      return channel;
    },
  };
  const client = {
    channel: () => channel,
    async removeChannel() { removals += 1; return 'ok'; },
  } as unknown as SupabaseClient;
  const statuses: LocationFeedStatus[] = [];
  const dispose = createTutorLocationRepository(client).subscribe(
    () => { invalidations += 1; }, (state) => statuses.push(state),
  );
  status('SUBSCRIBED');
  invalidation();
  status('CHANNEL_ERROR');
  status('TIMED_OUT');
  status('SUBSCRIBED');
  status('CLOSED');
  assert.equal(invalidations, 1);
  assert.deepEqual(statuses, ['connecting', 'connected', 'reconnecting', 'reconnecting', 'connected', 'unavailable']);
  dispose();
  dispose();
  status('SUBSCRIBED');
  invalidation();
  await settle();
  assert.equal(removals, 1);
  assert.equal(invalidations, 1);
  assert.equal(statuses.at(-1), 'unavailable');
});
