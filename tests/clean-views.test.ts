import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const values = new Map<string, string>();
const localStorage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, value),
  removeItem: (key: string) => values.delete(key),
};
Object.assign(globalThis, { localStorage });

async function bundle(source: string, env = {}) {
  const result = await build({
    stdin: { contents: source, resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
    define: { 'import.meta.env': JSON.stringify(env) },
  });
  const module = { exports: {} as any };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports);
  return module.exports;
}

const seededTutorIds = [1, 2, 3].map((index) => `b0000000-0000-0000-0000-00000000000${index}`);

test('CV-12: hide known seed tutors and favorites without deleting or name-filtering real records', async () => {
  values.clear();
  const realTutor = { id: 'real-tutor', name: 'Carlos Ramírez', subjects: [], specialties: [] };
  const original = JSON.stringify([...seededTutorIds.map((id) => ({ id })), realTutor]);
  localStorage.setItem('tutorcucuta_tutors_v2', original);
  localStorage.setItem('tutorcucuta_saved_tutors_v2', JSON.stringify([...seededTutorIds, 'diana-penaranda', realTutor.id]));
  const { storage } = await bundle("export { storage } from './src/utils/storage';");
  assert.deepEqual(storage.getTutors().map((tutor: any) => tutor.id), [realTutor.id]);
  assert.deepEqual(storage.getSavedTutors(), [realTutor.id]);
  assert.equal(localStorage.getItem('tutorcucuta_tutors_v2'), original);
});

test('CV-12: preserve same-name student drafts, requests and legacy browser data', async () => {
  values.clear();
  const profile = { id: 'real-student', name: 'Laura Sofía Martínez', phone: '+57 300 555 0100' };
  localStorage.setItem('tutorcucuta_student_profile_v2', JSON.stringify(profile));
  localStorage.setItem('tutorcucuta_student_profile_v1', JSON.stringify(profile));
  localStorage.setItem('tutorcucuta_requests_v2', JSON.stringify([
    { id: 'c0000000-0000-0000-0000-000000000001' },
    { id: 'real-request', studentName: profile.name },
  ]));
  Object.assign(globalThis, { window: { localStorage } });
  const { storage } = await bundle("export { storage } from './src/utils/storage';");
  Reflect.deleteProperty(globalThis, 'window');
  assert.equal(storage.getStudentProfile().id, profile.id);
  assert.deepEqual(storage.getRequests().map((request: any) => request.id), ['real-request']);
  assert.equal(localStorage.getItem('tutorcucuta_student_profile_v1'), JSON.stringify(profile));
});

test('CV-02/CV-03: an empty cache renders the application without a tutor identity', async () => {
  values.clear();
  const { render } = await bundle(`
    import React from 'react';
    import { renderToString } from 'react-dom/server';
    import App from './src/App';
    export const render = () => renderToString(<App />);
  `);
  const html = render();
  assert.match(html, /Recuperando tu sesión/);
  assert.doesNotMatch(html, /Carlos|Diana|Andrés|Unsplash|compatibles \(3\)/);
});

test('CV-04: blank teacher profile and dashboard have no demo identity or progress', async () => {
  const { render } = await bundle(`
    import React from 'react';
    import { renderToString } from 'react-dom/server';
    import { TeacherProfileEditView } from './src/components/views/TeacherProfileEditView';
    import { TeacherDashboardView } from './src/components/views/TeacherDashboardView';
    export const render = () => renderToString(<><TeacherProfileEditView onBack={() => {}} /><TeacherDashboardView requests={[]} onEditProfile={() => {}} /></>);
  `);
  assert.doesNotMatch(render(), /Carlos|unsplash|90%|Miércoles 4:30/);
});

test('CV-02/CV-04: remote empty/seed-only responses stay empty and real names remain visible without fabricated metadata', async () => {
  values.clear();
  localStorage.setItem('tutorcucuta_tutors_v2', JSON.stringify([{ id: 'stale-cache' }]));
  const originalFetch = globalThis.fetch;
  let rows: unknown[] = [];
  globalThis.fetch = async () => new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
  try {
    const { supabaseService } = await bundle("export { supabaseService } from './src/utils/supabase';", {
      VITE_SUPABASE_URL: 'https://catalog.invalid', VITE_SUPABASE_ANON_KEY: 'test-key-with-more-than-twenty-characters',
    });
    assert.deepEqual(await supabaseService.getTutors(), []);
    rows = seededTutorIds.map((id) => ({ id, profiles: { full_name: 'Seed' } }));
    assert.deepEqual(await supabaseService.getTutors(), []);
    rows = [{ id: 'real-tutor', profiles: { full_name: 'Carlos Ramírez' }, rate_per_hour: 20000, verified: false }];
    const [tutor] = await supabaseService.getTutors();
    assert.equal(tutor.name, 'Carlos Ramírez');
    assert.equal(tutor.avatar, '');
    assert.equal(tutor.matchScore, undefined);
    assert.equal(tutor.distanceKm, undefined);
    assert.equal(tutor.coordinates, undefined);
    assert.equal(tutor.nextAvailable, '');
    assert.deepEqual(tutor.matchReasons, []);
    globalThis.fetch = async () => new Response(JSON.stringify({ message: 'Read failed' }), { status: 400 });
    await assert.rejects(() => supabaseService.getTutors());
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('CV-11: removed Supabase initializers cannot reintroduce seed tutors', () => {
  const trackedSupabaseFiles = execFileSync('git', ['ls-files', '--', 'supabase'], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
  assert.deepEqual(trackedSupabaseFiles, []);
});
