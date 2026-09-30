import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAuthAdapter } from '../src/features/accounts/infrastructure/supabaseAccounts';
Object.assign(globalThis, { window: { location: { origin: 'https://app.example.invalid' } } });
function adapter(response: unknown) {
  return createAuthAdapter({ auth: { signUp: async () => response } } as unknown as SupabaseClient);
}
test('signup: confirmed existing identity never reports confirmation', async () => {
  const auth = adapter({ data: { user: { id: 'obfuscated', identities: [] }, session: null }, error: null });
  assert.equal(await auth.signUp('existing@example.invalid', 'test-password', 'student'), 'existing-account');
});
test('signup: explicit duplicate email errors route to existing-account', async () => {
  for (const code of ['user_already_exists', 'email_exists']) {
    assert.equal(await adapter({ data: {}, error: { code } }).signUp('existing@example.invalid', 'test-password', 'student'), 'existing-account');
  }
});
test('signup: real pending and signed-in outcomes remain distinct', async () => {
  for (const session of [null, { access_token: 'isolated-token' }]) {
    const auth = adapter({ data: { user: { id: 'new', identities: [{ provider: 'email' }] }, session }, error: null });
    assert.equal(await auth.signUp('new@example.invalid', 'test-password', 'student'), session ? 'signed-in' : 'confirmation');
  }
});
test('signup: missing user or identities cannot claim confirmation', async () => {
  for (const user of [null, { id: 'missing-identities' }]) {
    await assert.rejects(adapter({ data: { user, session: null }, error: null }).signUp('new@example.invalid', 'test-password', 'student'));
  }
});
test('signup: provider failure remains an error', async () => {
  await assert.rejects(adapter({ data: {}, error: { code: 'over_email_send_rate_limit' } }).signUp('new@example.invalid', 'test-password', 'student'), /Espera/);
});
