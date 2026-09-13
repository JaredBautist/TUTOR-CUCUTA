import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

// A disposable PostgreSQL 15 instance with no network or host ports. This verifies
// the new migration, not legacy tables, Supabase Auth, or the hosted Realtime service.
const container = `tutorcucuta-marketplace-db-test-${randomUUID()}`;
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
  const cloud = await readFile(new URL('../supabase/migrations/20260912000000_cloud_marketplace.sql', import.meta.url),'utf8');
  sql(cloud); sql(cloud);
  const favorites = await readFile(new URL('../supabase/migrations/20260912010000_student_favorites.sql', import.meta.url),'utf8');
  sql(favorites); sql(favorites);
  const tutor='10000000-0000-4000-8000-000000000001';
  const student='10000000-0000-4000-8000-000000000002';
  const outsider='10000000-0000-4000-8000-000000000003';
  const otherTutor='10000000-0000-4000-8000-000000000004';
  const owner=id=>`SET ROLE authenticated; SET request.jwt.claim.sub='${id}';`;
  const q=value=>JSON.stringify(value).replaceAll("'","''");
  const last=output=>output.split('\n').at(-1);
  const teacherProfile={name:'Declared tutor',title:'Teacher',institution:'',experienceYears:2,ratePerHour:30000,coverageRadiusKm:5,bio:'',subjects:['Álgebra'],specialties:[]};
  const studentProfile={name:'Student',age:16,grade:'Bachillerato',school:'',sector:'Centro',address:'DO NOT DISCLOSE',phone:'+573001234567',guardianName:'Guardian',guardianPhone:'+573009876543',guardianRelation:'Parent',guardianAuthorized:false,academicGoal:'Learn',difficultiesOrTopics:'',learningStyles:[],preferredModality:'presencial',preferredSchedule:'',bioNote:''};
  sql(`INSERT INTO auth.users VALUES('${outsider}'),('${otherTutor}');`);
  for(const [id,role,profile] of [[tutor,'tutor',teacherProfile],[student,'student',studentProfile],[outsider,'student',{...studentProfile,age:22}],[otherTutor,'tutor',teacherProfile]]) sql(`${owner(id)} INSERT INTO user_accounts(id,role,profile) VALUES('${id}','${role}','${q(profile)}');`);
  const photoPath=`${tutor}/${randomUUID()}.png`;
  sql(`${owner(tutor)} INSERT INTO storage.objects(bucket_id,name) VALUES('profile-avatars','${photoPath}'); UPDATE user_accounts SET avatar_path='${photoPath}';`);
  const offer={levels:['Básica secundaria','Universidad'],modalities:['presencial','virtual'],availability:Array.from({length:7},(_,day)=>({day:day+1,start:'08:00',end:'18:00'})),sector:'Teaching zone',position:{latitude:7.891234,longitude:-72.501234},phone:'+573001111111',version:0};
  sql(`SET ROLE anon; SELECT publish_tutor_offer_v1('${q(offer)}');`,'42501');
  sql(`${owner(student)} SELECT publish_tutor_offer_v1('${q(offer)}');`,'42501');
  const published=JSON.parse(last(sql(`${owner(tutor)} SELECT publish_tutor_offer_v1('${q(offer)}');`)));
  assert.equal(published.version,1);
  const favoriteRows=id=>last(sql(`${owner(id)} SELECT coalesce(json_agg(tutor_id),'[]') FROM student_favorites;`));
  sql(`SET ROLE anon; SELECT * FROM student_favorites;`,'42501');
  sql(`SET ROLE anon; SELECT set_student_favorite_v1('${tutor}',true);`,'42501');
  sql(`${owner(tutor)} SELECT set_student_favorite_v1('${tutor}',true);`,'42501');
  sql(`${owner(student)} INSERT INTO student_favorites(student_id,tutor_id) VALUES('${outsider}','${tutor}');`,'42501');
  for(let attempt=0;attempt<2;attempt++) assert.equal(last(sql(`${owner(student)} SELECT set_student_favorite_v1('${tutor}',true);`)),'t');
  assert.deepEqual(JSON.parse(favoriteRows(student)),[tutor]);
  assert.equal(favoriteRows(outsider),'[]');
  assert.equal(favoriteRows(tutor),'[]');
  sql(`${owner(outsider)} DELETE FROM student_favorites;`,'42501');
  for(let attempt=0;attempt<2;attempt++) assert.equal(last(sql(`${owner(student)} SELECT set_student_favorite_v1('${tutor}',false);`)),'f');
  assert.equal(favoriteRows(student),'[]');
  sql(`${owner(student)} SELECT set_student_favorite_v1('${otherTutor}',true);`,'P0001');
  sql(`${owner(student)} SELECT set_student_favorite_v1('${tutor}',NULL);`,'22023');
  sql(`${owner(student)} SELECT set_student_favorite_v1('${tutor}',true);`);

  assert.equal(published.position.latitude,7.89);
  assert.equal(last(sql(`${owner(student)} SELECT count(*) FROM storage.objects WHERE bucket_id='profile-avatars';`)),'1');
  assert.match(sql(`${owner(tutor)} DELETE FROM storage.objects WHERE bucket_id='profile-avatars';`),/DELETE 0/);
  sql(`${owner(tutor)} SELECT publish_tutor_offer_v1('${q(offer)}');`,'P0001');
  assert.equal(last(sql(`${owner(student)} SELECT count(*) FROM tutor_offers;`)),'1');
  sql(`${owner(student)} SELECT * FROM tutor_offer_contacts;`,'42501');
  sql(`${owner(student)} UPDATE tutor_offers SET published=false;`,'42501');
  const catalog=last(sql(`${owner(student)} SELECT listing FROM tutor_offers;`));
  assert.ok(!catalog.includes('phone') && !catalog.includes('address'));
  const starts=new Date(Date.now()+86400000); starts.setUTCHours(14,0,0,0);
  const input={id:randomUUID(),tutorId:tutor,subject:'Álgebra',modality:'presencial',startsAt:starts.toISOString(),durationHours:1,note:'Learn algebra',ratePerHour:1,studentId:outsider};
  sql(`${owner(student)} SELECT create_tutoring_request_v1('${q(input)}');`,'P0001');
  sql(`${owner(student)} UPDATE user_accounts SET profile=profile || '{"guardianAuthorized":true}';`);
  assert.equal(last(sql(`${owner(student)} SELECT create_tutoring_request_v1('${q(input)}');`)),input.id);
  assert.equal(last(sql(`${owner(student)} SELECT create_tutoring_request_v1('${q(input)}');`)),input.id);
  const rows=id=>JSON.parse(last(sql(`${owner(id)} SELECT coalesce(jsonb_agg(x),'[]'::jsonb) FROM list_tutoring_requests_v1() x;`)));
  const pending=rows(tutor)[0];
  assert.equal(pending.ratePerHour,30000); assert.equal(pending.studentId,student);
  assert.equal(pending.totalEstimated,30000);
  assert.ok(!JSON.stringify(pending).includes('57300')); assert.ok(!JSON.stringify(pending).includes('DO NOT DISCLOSE'));
  assert.deepEqual(rows(outsider),[]);
  sql(`${owner(student)} SELECT * FROM tutoring_requests;`,'42501');
  sql(`${owner(outsider)} SELECT transition_tutoring_request_v1('${input.id}','accepted');`,'42501');
  sql(`${owner(student)} SELECT transition_tutoring_request_v1('${input.id}','accepted');`,'42501');
  sql(`${owner(tutor)} SELECT transition_tutoring_request_v1('${input.id}','accepted');`);
  assert.equal(rows(student)[0].tutorPhone,offer.phone);
  assert.equal(rows(tutor)[0].studentPhone,studentProfile.guardianPhone);
  const conflicting={...input,id:randomUUID()};
  sql(`${owner(outsider)} SELECT create_tutoring_request_v1('${q(conflicting)}');`);
  sql(`${owner(tutor)} SELECT transition_tutoring_request_v1('${conflicting.id}','accepted');`,'P0001');
  sql(`${owner(student)} SELECT transition_tutoring_request_v1('${input.id}','cancelled');`);
  assert.equal(rows(student)[0].tutorPhone,undefined);
  sql(`${owner(tutor)} SELECT transition_tutoring_request_v1('${input.id}','accepted');`,'P0001');
  const docId=randomUUID(); const path=`${tutor}/${docId}.pdf`;
  sql(`${owner(tutor)} INSERT INTO storage.objects(bucket_id,name) VALUES('tutor-documents','${path}');`);
  sql(`${owner(tutor)} SELECT register_tutor_document_v1('${docId}','Formation','Declared document','pdf');`);
  assert.equal(last(sql(`${owner(student)} SELECT count(*) FROM storage.objects WHERE bucket_id='tutor-documents';`)),'1');
  assert.equal(last(sql(`${owner(otherTutor)} SELECT count(*) FROM tutor_documents;`)),'0');
  sql(`${owner(student)} INSERT INTO storage.objects(bucket_id,name) VALUES('tutor-documents','${student}/${randomUUID()}.pdf');`,'42501');
  sql(`${owner(tutor)} SELECT withdraw_tutor_offer_v1();`);
  assert.deepEqual(JSON.parse(favoriteRows(student)),[tutor], 'Withdrawal must not erase private favorites');
  sql(`${owner(outsider)} SELECT set_student_favorite_v1('${tutor}',true);`,'P0001');
  assert.equal(last(sql(`${owner(student)} SELECT set_student_favorite_v1('${tutor}',false);`)),'f');

  assert.equal(last(sql(`${owner(student)} SELECT count(*) FROM tutor_offers;`)),'0');
  assert.equal(last(sql(`${owner(student)} SELECT count(*) FROM tutor_offer_locations;`)),'0');
  assert.equal(last(sql(`${owner(student)} SELECT count(*) FROM tutor_documents;`)),'0');
  assert.equal(last(sql(`${owner(student)} SELECT count(*) FROM storage.objects WHERE bucket_id='tutor-documents';`)),'0');
  assert.equal(rows(student).length,1);
  assert.equal(last(sql(`${owner(student)} SELECT count(*) FROM storage.objects WHERE bucket_id='profile-avatars';`)),'0');
  sql(`${owner(tutor)} SELECT remove_tutor_document_v1('${docId}');`);
  assert.equal(last(sql(`${owner(tutor)} SELECT count(*) FROM tutor_documents;`)),'0');
  // Enforce the documented bound under database authority, not just the UI.
  sql(`INSERT INTO auth.users SELECT md5('favorite-limit-' || n)::uuid FROM generate_series(1,500) n;
    INSERT INTO user_accounts(id,role,profile) SELECT md5('favorite-limit-' || n)::uuid,'tutor','${q(teacherProfile)}'::jsonb FROM generate_series(1,500) n;
    INSERT INTO tutor_offers(tutor_id,listing,published) SELECT md5('favorite-limit-' || n)::uuid,'{}'::jsonb,true FROM generate_series(1,500) n;
    INSERT INTO student_favorites(student_id,tutor_id) SELECT '${outsider}',md5('favorite-limit-' || n)::uuid FROM generate_series(1,500) n;`);
  sql(`${owner(tutor)} SELECT publish_tutor_offer_v1('${q({...offer,version:2})}');`);
  sql(`${owner(outsider)} SELECT set_student_favorite_v1('${tutor}',true);`,'P0001');
  assert.equal(last(sql(`${owner(outsider)} SELECT set_student_favorite_v1(md5('favorite-limit-1')::uuid,true);`)),'t');
  sql(`${owner(outsider)} SELECT set_student_favorite_v1(md5('favorite-limit-1')::uuid,false);`);
  assert.equal(last(sql(`${owner(outsider)} SELECT set_student_favorite_v1('${tutor}',true);`)),'t');
  console.log('PASS marketplace PostgreSQL: repeatable migration, private favorites/isolation/idempotency/500 limit, publication, private contacts, approximate zones, guardian enforcement, server price/identity, idempotency, participant isolation, transitions, schedule conflicts, document access and withdrawal.');
} finally {
 if(started) assert.equal(docker(['rm','-f',container]).status,0);
}
