import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

// A disposable PostgreSQL 15 instance with no network or host ports. This verifies
// the new migration, not legacy tables, Supabase Auth, or the hosted Realtime service.
const container = `tutorcucuta-map-db-test-${randomUUID()}`;
const image = 'postgres:15-alpine';
const migration = await readFile(new URL('../supabase/migrations/20260910000000_published_tutor_map_locations.sql', import.meta.url), 'utf8');
function docker(args, input) {
  const result = spawnSync('docker', args, { encoding: 'utf8', input, timeout: 30000 });
  if (result.error) throw result.error;
  return result;
}
function sql(statement, expectedCode) {
  const result = docker(['exec', '-i', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose', '-At'], statement);
  if (expectedCode) {
    assert.notEqual(result.status, 0, 'Expected PostgreSQL to reject this operation');
    assert.match(result.stderr, new RegExp(`ERROR:  ${expectedCode}:`));
  } else assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
let started = false;
try {
  assert.equal(docker(['image', 'inspect', image]).status, 0, 'Use an existing postgres:15-alpine image; this test never pulls images');
  const start = docker(['run', '--pull=never', '--rm', '-d', '--name', container, '--network=none', '--tmpfs', '/var/lib/postgresql/data', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', image, '-c', 'wal_level=logical']);
  assert.equal(start.status, 0, start.stderr);
  started = true;
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    // The image starts a temporary socket-only server during initialization.
    // TCP readiness distinguishes the final server from that temporary process.
    if (docker(['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres']).status === 0) { ready = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.ok(ready, 'Isolated PostgreSQL did not become ready');
  sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    CREATE TABLE public.tutors (id uuid PRIMARY KEY);
    CREATE PUBLICATION supabase_realtime;
    INSERT INTO public.tutors VALUES ('19a1b2c3-0000-4000-8000-000000000001');`);
  sql(migration);
  sql(migration);
  assert.equal(sql('SELECT count(*) FROM public.tutor_map_locations'), '0', 'Migration must not create teaching points');
  assert.equal(sql("SELECT count(*) FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tutor_map_locations'"), '1');
  const point = "('19a1b2c3-0000-4000-8000-000000000001', 7.895, -72.506)";
  for (const role of ['anon', 'authenticated']) {
    assert.equal(sql(`SET ROLE ${role}; SELECT count(*) FROM public.tutor_map_locations;`).split('\n').at(-1), '0');
    sql(`SET ROLE ${role}; INSERT INTO public.tutor_map_locations(tutor_id,latitude,longitude) VALUES ${point};`, '42501');
    sql(`SET ROLE ${role}; UPDATE public.tutor_map_locations SET latitude = 7.896;`, '42501');
    sql(`SET ROLE ${role}; DELETE FROM public.tutor_map_locations;`, '42501');
  }
  sql(`SET ROLE service_role; INSERT INTO public.tutor_map_locations(tutor_id,latitude,longitude) VALUES ${point};`);
  assert.equal(sql('SET ROLE anon; SELECT latitude::text FROM public.tutor_map_locations;').split('\n').at(-1), '7.895');
  sql("SET ROLE service_role; UPDATE public.tutor_map_locations SET latitude = 7.895123;", '23514');
  sql("SET ROLE service_role; UPDATE public.tutor_map_locations SET latitude = 90;", '23514');
  sql("SET ROLE service_role; UPDATE public.tutor_map_locations SET longitude = 181;", '23514');
  sql("SET ROLE service_role; UPDATE public.tutor_map_locations SET precision = 'exact';", '23514');
  sql("SET ROLE service_role; UPDATE public.tutor_map_locations SET tutor_id = '19a1b2c3-0000-4000-8000-000000000009';", '23503');
  assert.equal(sql("SET ROLE service_role; UPDATE public.tutor_map_locations SET latitude = 7.896, updated_at = '2000-01-01'; SELECT updated_at > now() - interval '1 minute' FROM public.tutor_map_locations;").split('\n').at(-1), 't');
  sql('SET ROLE service_role; DELETE FROM public.tutor_map_locations;');
  assert.equal(sql('SET ROLE authenticated; SELECT count(*) FROM public.tutor_map_locations;').split('\n').at(-1), '0');
  sql(`SET ROLE service_role; INSERT INTO public.tutor_map_locations(tutor_id,latitude,longitude) VALUES ${point};`);
  sql('DELETE FROM public.tutors;');
  assert.equal(sql('SELECT count(*) FROM public.tutor_map_locations;'), '0', 'Tutor deletion must withdraw its teaching point');
  console.log('PASS PostgreSQL 15: repeatable migration, empty initial table, publication membership, browser read-only RLS, trusted writes, precision/bounds/FK constraints, server timestamps and revocation/cascade');
} finally {
  if (started) {
    const removal = docker(['rm', '-f', container]);
    assert.equal(removal.status, 0, removal.stderr);
  }
}
