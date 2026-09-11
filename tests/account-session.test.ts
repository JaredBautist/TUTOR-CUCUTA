import test from 'node:test';
import assert from 'node:assert/strict';
import { SessionController } from '../src/features/accounts/application/sessionController';
import { emptyProfile } from '../src/features/accounts/domain/profile';
import type { AccountIdentity, OwnAccount } from '../src/features/accounts/domain/profile';
import type { AuthPort, AccountRepository } from '../src/features/accounts/domain/ports';
const pause = () => new Promise(resolve => setTimeout(resolve, 5));
const identity = (id: string): AccountIdentity => ({ id, email: `${id}@example.invalid`, name: '', suggestedRole: 'student' });
const account = (id: string): OwnAccount => ({ id, email: `${id}@example.invalid`, role: 'student', profile: emptyProfile('student'), avatarPath: null, avatarUrl: null, displayAvatarUrl: '', version: 1 });
function harness(overrides: Partial<AccountRepository> = {}) {
  let emit: Parameters<AuthPort['subscribe']>[0];
  const auth = { subscribe(listener) { emit = listener; return () => {}; } } as AuthPort;
  const repository: AccountRepository = { read: async owner => account(owner.id), create: async owner => account(owner.id), save: async owner => ({ ...owner, version: owner.version + 1 }), ...overrides };
  const controller = new SessionController(auth, repository, () => 'tutor');
  const stop = controller.start();
  return { controller, emit: (owner: AccountIdentity | null, recovery = false) => emit(owner, recovery), stop };
}
test('restores the stored role instead of the selected onboarding hint', async () => {
  const { controller, emit, stop } = harness(); emit(identity('a')); await pause();
  assert.equal(controller.getSnapshot().status, 'ready'); assert.equal(controller.getSnapshot().account?.role, 'student'); stop();
});
test('logout discards a delayed profile and prevents onboarding writes from stale reads', async () => {
  let resolve: (value: OwnAccount | null) => void; let creates = 0;
  const { controller, emit, stop } = harness({ read: () => new Promise(done => { resolve = done; }), create: async owner => { creates++; return account(owner.id); } });
  emit(identity('a')); await pause(); emit(null); resolve!(null); await pause();
  assert.equal(controller.getSnapshot().status, 'anonymous'); assert.equal(controller.getSnapshot().account, null); assert.equal(creates, 0); stop();
});
test('an old save cannot replace the next account', async () => {
  let resolve: (value: OwnAccount) => void;
  const { controller, emit, stop } = harness({ save: () => new Promise(done => { resolve = done; }) });
  emit(identity('a')); await pause(); const save = controller.save(emptyProfile('student'), '');
  emit(identity('b')); await pause(); resolve!(account('a'));
  await assert.rejects(save, /sesión cambió/); assert.equal(controller.getSnapshot().account?.id, 'b'); stop();
});
test('read errors are retryable without creating a second registration', async () => {
  let reads = 0;
  const { controller, emit, stop } = harness({ read: async owner => { if (++reads === 1) throw new Error('offline'); return account(owner.id); } });
  emit(identity('a')); await pause(); assert.equal(controller.getSnapshot().status, 'error');
  controller.retry(); await pause(); assert.equal(controller.getSnapshot().status, 'ready'); stop();
});
test('recovery holds across token refresh until the password update is acknowledged', async () => {
  const { controller, emit, stop } = harness(); emit(identity('a'), true); await pause(); emit(identity('a'));
  assert.equal(controller.getSnapshot().recovery, true); controller.finishRecovery(); assert.equal(controller.getSnapshot().recovery, false); stop();
});
