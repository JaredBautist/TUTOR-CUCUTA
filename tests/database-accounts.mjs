import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

// A disposable PostgreSQL 15 instance with no network or host ports. This verifies
// the new migration, not legacy tables, Supabase Auth, or the hosted Realtime service.
const container = `tutorcucuta-account-db-test-${randomUUID()}`;
const image = 'postgres:15-alpine';
const migration = await readFile(new URL('../supabase/migrations/20260910010000_auth_private_accounts.sql', import.meta.url), 'utf8');
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
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated,service_role;
    CREATE TABLE public.profiles(id uuid PRIMARY KEY, full_name text, avatar_url text, email text);
    CREATE TABLE public.tutors(id uuid PRIMARY KEY REFERENCES profiles(id),title text,institution text,experience_years int,rate_per_hour numeric,verified boolean,sector text,next_available text,modalities text[],subjects text[],levels text[],specialties text[],bio text,methodology_steps jsonb,geom text);
    CREATE TABLE public.students(id uuid); CREATE TABLE public.student_requests(id uuid); CREATE TABLE public.saved_tutors(id uuid);
    CREATE FUNCTION public.search_tutors_nearby(double precision,double precision,double precision,text,numeric) RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT 'private geometry'::text $$;
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY; ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Perfiles públicos visibles" ON profiles FOR SELECT USING(true);
    CREATE POLICY tutors_public ON tutors FOR SELECT USING(true);
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated;
    CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);
    CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array($1,'/') $$;
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
    INSERT INTO auth.users VALUES ('10000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002');
    INSERT INTO profiles VALUES ('10000000-0000-4000-8000-000000000001','Public tutor',null,'private@example.invalid');
    INSERT INTO tutors(id) SELECT id FROM profiles;`);
  sql(migration); sql(migration);
  const a = '10000000-0000-4000-8000-000000000001';
  const b = '10000000-0000-4000-8000-000000000002';
  const owner = id => `SET ROLE authenticated; SET request.jwt.claim.sub='${id}';`;
  const profile = JSON.stringify({ name:'', title:'', institution:'', experienceYears:null, ratePerHour:null, coverageRadiusKm:5, bio:'', subjects:[], specialties:[] });
  sql(`${owner(a)} INSERT INTO user_accounts(id,role,profile) VALUES('${a}','tutor','${profile}');`);
  sql(`${owner(b)} INSERT INTO user_accounts(id,role,profile) VALUES('${b}','tutor','${profile}');`);
  assert.equal(sql(`${owner(a)} SELECT count(*) FROM user_accounts;`).split('\n').at(-1),'1');
  assert.equal(sql(`${owner(b)} SELECT count(*) FROM user_accounts WHERE id='${a}';`).split('\n').at(-1),'0');
  sql(`SET ROLE anon; SELECT * FROM user_accounts;`,'42501');
  sql(`${owner(b)} INSERT INTO user_accounts(id,role,profile) VALUES('${a}','tutor','${profile}');`,'42501');
  for(const column of ["role='student'","version=55",`id='${b}'`,"created_at=now()"]) sql(`${owner(a)} UPDATE user_accounts SET ${column};`,'42501');
  sql(`${owner(a)} UPDATE user_accounts SET profile=profile || '{"verified":true}';`,'23514');
  sql(`${owner(a)} UPDATE user_accounts SET profile=profile || '{"ratePerHour":9999}';`,'23514');
  sql(`${owner(a)} UPDATE user_accounts SET profile=profile || '{"subjects":[5]}';`,'23514');
  sql(`${owner(a)} UPDATE user_accounts SET profile=profile || '{"coverageRadiusKm":null}';`,'23514');
  assert.equal(sql(`${owner(a)} UPDATE user_accounts SET profile=profile || '{"name":"Owner"}' WHERE version=1; SELECT version FROM user_accounts;`).split('\n').at(-1),'2');
  assert.match(sql(`${owner(a)} UPDATE user_accounts SET profile=profile || '{"name":"Stale"}' WHERE version=1;`),/UPDATE 0/);
  assert.match(sql(`${owner(b)} UPDATE user_accounts SET profile=profile || '{"name":"Attack"}' WHERE id='${a}';`),/UPDATE 0/);
  sql(`${owner(a)} UPDATE user_accounts SET avatar_path='${b}/10000000-0000-4000-8000-000000000003.png';`,'23514');
  sql(`${owner(a)} INSERT INTO storage.objects(bucket_id,name) VALUES('profile-avatars','${a}/10000000-0000-4000-8000-000000000003.png');`);
  sql(`${owner(b)} INSERT INTO storage.objects(bucket_id,name) VALUES('profile-avatars','${a}/10000000-0000-4000-8000-000000000004.png');`,'42501');
  assert.equal(sql(`${owner(b)} SELECT count(*) FROM storage.objects;`).split('\n').at(-1),'0');
  assert.match(sql(`${owner(b)} DELETE FROM storage.objects;`),/DELETE 0/);
  for (const role of ['anon','authenticated']) {
    sql(`SET ROLE ${role}; SELECT email FROM profiles;`,'42501');
    sql(`SET ROLE ${role}; SELECT geom FROM tutors;`,'42501');
    sql(`SET ROLE ${role}; SELECT * FROM students;`,'42501');
    sql(`SET ROLE ${role}; SELECT * FROM student_requests;`,'42501');
    sql(`SET ROLE ${role}; SELECT search_tutors_nearby(0::double precision,0::double precision,5::double precision,'',1::numeric);`,'42501');
    assert.equal(sql(`SET ROLE ${role}; SELECT profiles.full_name FROM tutors JOIN profiles ON tutors.id=profiles.id;`).split('\n').at(-1),'Public tutor');
  }
  console.log('PASS PostgreSQL: repeatable accounts migration, owner isolation, immutable role/identity/version, validated JSON, stale saves rejected, private photo paths, public catalog preserved, legacy PII/RPC denied.');
} finally {
  if (started) {
    const removal = docker(['rm', '-f', container]);
    assert.equal(removal.status, 0, removal.stderr);
  }
}
