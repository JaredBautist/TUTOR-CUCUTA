import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { createFavoritesRepository } from '../src/features/favorites/infrastructure/supabaseFavorites';
const tutor = '10000000-0000-4000-8000-000000000001';
function adapter(respond: (url: string, init?: RequestInit) => Response) {
  return createFavoritesRepository(createClient('https://favorites.invalid', 'test-public-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (url, init) => respond(String(url), init) },
  }));
}
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
test('Favorites: reads IDs and sends desired state without a caller-supplied student identity', async () => {
  const requests: Record<string, unknown>[] = [];
  const repository = adapter((url, init) => {
    if (url.includes('/rpc/')) { const input = JSON.parse(String(init?.body)); requests.push(input); return json(input.p_saved); }
    return json([{ tutor_id: tutor }]);
  });
  assert.deepEqual(await repository.list(), [tutor]);
  assert.equal(await repository.set(tutor, true), true);
  assert.equal(await repository.set(tutor, false), false);
  assert.deepEqual(requests, [{ p_tutor_id: tutor, p_saved: true }, { p_tutor_id: tutor, p_saved: false }]);
});
test('Favorites: refuses invalid IDs, malformed reads and unacknowledged writes', async () => {
  const repository = adapter(() => json(null));
  await assert.rejects(repository.set('not-a-uuid', true), { code: 'INVALID_FAVORITE' });
  await assert.rejects(repository.list(), { code: 'INVALID_RESPONSE' });
  await assert.rejects(repository.set(tutor, true), { code: 'INVALID_RESPONSE' });
  await assert.rejects(createFavoritesRepository(null).list(), { code: 'NOT_CONFIGURED' });
});
test('Favorites: missing migrations and network failures expose errors instead of empty success', async () => {
  await assert.rejects(adapter(() => json({ code: 'PGRST205' }, 404)).list(), { code: 'MIGRATION_REQUIRED' });
  await assert.rejects(adapter(() => { throw new Error('offline'); }).set(tutor, true), /No se pudo confirmar el favorito/);
});
