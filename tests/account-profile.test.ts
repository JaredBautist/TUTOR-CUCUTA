import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyProfile, validateProfile, validateCredentials, AccountError } from '../src/features/accounts/domain/profile';

test('Account profiles: incomplete drafts preserve missing facts and reject identity/role injection', () => {
  const student = emptyProfile('student');
  assert.equal(student.age, null);
  assert.equal(student.guardianAuthorized, false);
  assert.deepEqual(validateProfile('student', student), student);
  assert.throws(() => validateProfile('student', { ...student, role: 'tutor' }), AccountError);
  assert.throws(() => validateProfile('student', { ...student, age: -1 }), AccountError);
  assert.throws(() => validateProfile('student', { ...student, guardianAuthorized: 'true' }), AccountError);
  assert.throws(() => validateProfile('student', { ...student, name: 'x'.repeat(201) }), AccountError);
});
test('Teacher profiles: optional numeric facts, bounded arrays and rates are validated', () => {
  const tutor = emptyProfile('tutor');
  assert.equal(tutor.ratePerHour, null);
  assert.deepEqual(validateProfile('tutor', tutor), tutor);
  assert.throws(() => validateProfile('tutor', { ...tutor, verified: true }), AccountError);
  assert.throws(() => validateProfile('tutor', { ...tutor, ratePerHour: 9999 }), AccountError);
  assert.throws(() => validateProfile('tutor', { ...tutor, subjects: ['Math', 1] }), AccountError);
  assert.throws(() => validateProfile('tutor', { ...tutor, coverageRadiusKm: 16 }), AccountError);
});
test('Credentials: validate signup policy without altering password bytes or rejecting older login passwords', () => {
  assert.deepEqual(validateCredentials(' person@example.com ', ' leading pass ', true), { email: 'person@example.com', password: ' leading pass ' });
  assert.throws(() => validateCredentials('bad', '12345678', true), AccountError);
  assert.throws(() => validateCredentials('person@example.com', 'short', true), AccountError);
  assert.equal(validateCredentials('person@example.com', 'short', false).password, 'short');
});
