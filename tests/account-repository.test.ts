import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountRepository } from '../src/features/accounts/infrastructure/supabaseAccounts';
import { emptyProfile, validateAvatarUrl } from '../src/features/accounts/domain/profile';
import type { OwnAccount } from '../src/features/accounts/domain/profile';
import type { SupabaseClient } from '@supabase/supabase-js';
const id='10000000-0000-4000-8000-000000000001';
const owner: OwnAccount={id,role:'student',email:'student@example.invalid',profile:emptyProfile('student'),avatarPath:null,avatarUrl:null,displayAvatarUrl:'',version:1};
function harness() {
  const trace = { writes:0, upload:0, deleted:[] as string[], signedError:false, saveError:false, conflict:false, filters:[] as [string,unknown][], payload: null as any, cleanupError:false };
  const client={
    from() { return {
      update(payload) { trace.payload=payload; trace.writes++; return this; },
      select() { return this; }, eq(key,value) { trace.filters.push([key,value]); return this; },
      async maybeSingle() { return {data:trace.conflict?null:{id,role:'student',profile:trace.payload.profile,avatar_path:trace.payload.avatar_path,avatar_url:trace.payload.avatar_url,version:2},error:trace.saveError?{message:'offline'}:null}; },
    }; },
    storage:{from() { return {
      async upload() { trace.upload++; return {error:null}; },
      async createSignedUrl(path) { return {data:{signedUrl:`https://private.example.invalid/${path}?token=test`},error:trace.signedError?{message:'signing failed'}:null}; },
      async remove(paths) { trace.deleted.push(...paths); return {error:trace.cleanupError?{message:'cleanup failed'}:null}; },
    }; }},
  } as unknown as SupabaseClient;
  return {trace,repository:createAccountRepository(client)};
}
test('repository saves editable fields only with identity and optimistic version filters', async () => {
  const {trace,repository}=harness();const result=await repository.save(owner,{...owner.profile,name:'Saved'},'');
  assert.equal(result.version,2);assert.equal(result.profile.name,'Saved');
  assert.deepEqual(trace.filters,[['id',id],['version',1]]);assert.deepEqual(Object.keys(trace.payload).sort(),['avatar_path','avatar_url','profile']);
});
test('a stale save is rejected rather than announced successful',async()=>{
  const {trace,repository}=harness();trace.conflict=true;
  await assert.rejects(repository.save(owner,owner.profile,''),/otra sesión/);
});
test('invalid image data or URLs are rejected before writing profile rows',async()=>{
  const {trace,repository}=harness();
  for(const photo of ['javascript:alert(1)','http://unsafe.example/a.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,YWJj']) await assert.rejects(repository.save(owner,owner.profile,photo));
  assert.equal(trace.writes,0); assert.equal(trace.upload,0);
  assert.throws(()=>validateAvatarUrl('https://user:password@example.invalid/a.png'));
});
test('photo signing precedes the acknowledged save and cleanup failure cannot undo that acknowledgement',async()=>{
  const {trace,repository}=harness();const withPhoto={...owner,avatarPath:`${id}/10000000-0000-4000-8000-000000000005.png`,displayAvatarUrl:'https://private.example/old'};
  trace.signedError=true;
  await assert.rejects(repository.save(withPhoto,owner.profile,withPhoto.displayAvatarUrl),/foto/); assert.equal(trace.writes,0);
  trace.signedError=false;trace.cleanupError=true;
  const saved=await repository.save(withPhoto,owner.profile,'https://example.invalid/new.png');
  assert.equal(saved.version,2);assert.match(saved.notice!,/Perfil guardado/);assert.deepEqual(trace.deleted,[withPhoto.avatarPath]);
});
test('uploaded PNG is stored under the owner path and profile rows contain no image bytes',async()=>{
  const {trace,repository}=harness();
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=';
  const saved=await repository.save(owner,owner.profile,png);
  assert.equal(trace.upload,1);assert.match(saved.avatarPath!,new RegExp(`^${id}/[a-f0-9-]+\\.png$`));
  assert.match(saved.displayAvatarUrl,/https:\/\/private/);assert.equal(saved.avatarUrl,null);
  assert.ok(!JSON.stringify(trace.payload).includes('base64'));
});
