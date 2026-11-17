import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {DELIVERY_SET,deliveryAccounts} from './delivery/accounts';
import {createAccountRepository} from '../src/features/accounts/infrastructure/supabaseAccounts';
import {createMarketplaceRepository} from '../src/features/marketplace/infrastructure/supabaseMarketplace';
import {createFavoritesRepository} from '../src/features/favorites/infrastructure/supabaseFavorites';

/** Explicit demo-only hosted writes. Restores temporary state; cancelled request remains. */
async function main() {
 assert.deepEqual(process.argv.slice(2),['--apply'],'Explicit --apply required for demo lifecycle writes');
 const url=process.env.VITE_SUPABASE_URL!,key=process.env.VITE_SUPABASE_ANON_KEY!;
 assert.ok(url && key,'Missing public configuration');
 const journal=JSON.parse(await readFile(join(homedir(),'.local/share/tutorcucuta',DELIVERY_SET,'accounts.json'),'utf8'));
 assert.equal(journal.set,DELIVERY_SET);assert.equal(journal.url,url);
 const clients:SupabaseClient[]=[];
 async function login(accountKey:string) {
  const declared=deliveryAccounts.find(a=>a.key===accountKey)!;
  const entry=journal.accounts[accountKey];assert.equal(entry.email,declared.email);
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});clients.push(client);
  const result=await client.auth.signInWithPassword({email:entry.email,password:entry.password});
  assert.ok(!result.error,'Demo sign-in failed');assert.equal(result.data.user?.id,entry.id);
  assert.equal(result.data.user?.email,declared.email);
  return {client,identity:{id:entry.id,email:entry.email,name:String(declared.profile.name)}};
 }
 let restoreProfile:(()=>Promise<void>)|undefined;
 let restoreFavorite:(()=>Promise<void>)|undefined;
 let cancelRequest:(()=>Promise<void>)|undefined;
 const cleanupErrors:string[]=[];
 try {
  const student=await login('santiago-suarez'),teacher=await login('camilo-becerra'),outsider=await login('mariana-castro');
  const accounts=createAccountRepository(student.client),own=await accounts.read(student.identity);
  assert.ok(own && own.role==='student' && Number(own.profile.age)>=18);
  const tutorRepo=createMarketplaceRepository(teacher.client),studentRepo=createMarketplaceRepository(student.client);
  const offer=await tutorRepo.ownOffer();assert.ok(offer?.published && offer.modalities.includes('virtual'));
  if(!own.profile.phone) {
   restoreProfile=async()=>{
    const current=await accounts.read(student.identity);assert.ok(current);
    await accounts.save(current,own.profile,current.displayAvatarUrl);
    assert.deepEqual((await accounts.read(student.identity))?.profile,own.profile);
   };
   await accounts.save(own,{...own.profile,phone:offer.phone},own.displayAvatarUrl);
  }
  const favorites=createFavoritesRepository(student.client),originalFavorites=await favorites.list();
  restoreFavorite=async()=>{await favorites.set(teacher.identity.id,originalFavorites.includes(teacher.identity.id));assert.deepEqual((await favorites.list()).sort(),originalFavorites.sort());};
  await favorites.set(teacher.identity.id,true);
  assert.ok((await createFavoritesRepository(student.client).list()).includes(teacher.identity.id));
  console.log('PASS demo favorite persistence');
  const existing=await tutorRepo.requests();
  const slot=offer.availability[0];assert.ok(slot);
  let startsAt='';
  for(let offset=1;offset<60;offset++) {
   const date=new Date(Date.now()+offset*86400000);const day=date.getUTCDay()||7;
   if(day!==slot.day)continue;
   const start=`${date.toISOString().slice(0,10)}T${slot.start}:00-05:00`;
   const time=Date.parse(start);
   if(!existing.some(r=>r.status==='accepted' && Date.parse(r.startsAt!)<time+3600000 && Date.parse(r.startsAt!)+r.durationHours!*3600000>time)){startsAt=start;break;}
  }
  assert.ok(startsAt,'No available demo interval found');
  const id=randomUUID();
  cancelRequest=async()=>{
   const row=(await studentRepo.requests()).find(r=>r.id===id);
   if(row && ['pending','accepted'].includes(row.status))await studentRepo.transition(id,'cancelled');
  };
  await studentRepo.request({id,tutorId:teacher.identity.id,subject:'Matemáticas',modality:'virtual',startsAt,durationHours:1,note:'Verificación técnica de demostración: límites. Sin coordinación real.'});
  const pending=(await tutorRepo.requests()).find(r=>r.id===id);assert.equal(pending?.status,'pending');assert.ok(!pending?.studentPhone);
  assert.ok(!(await createMarketplaceRepository(outsider.client).requests()).some(r=>r.id===id));
  await assert.rejects(()=>studentRepo.transition(id,'accepted'));
  console.log('PASS demo delivery, participant isolation and denied student acceptance');
  await tutorRepo.transition(id,'accepted');
  const accepted=(await studentRepo.requests()).find(r=>r.id===id);assert.equal(accepted?.status,'accepted');assert.ok(accepted?.tutorPhone);
  await studentRepo.transition(id,'cancelled');
  for(const repo of [studentRepo,tutorRepo]) {
   const cancelled=(await repo.requests()).find(r=>r.id===id);assert.equal(cancelled?.status,'cancelled');
   assert.ok(!cancelled?.tutorPhone && !cancelled?.studentPhone);
  }
  console.log('PASS demo acceptance, cancellation and contact revocation');
 } finally {
  for(const [label,action] of [['request',cancelRequest],['favorite',restoreFavorite],['profile',restoreProfile]] as const) {
   try{await action?.();}catch{cleanupErrors.push(label);}
  }
  for(const client of clients){try{const result=await client.auth.signOut({scope:'local'});if(result.error)cleanupErrors.push('session');}catch{cleanupErrors.push('session');}}
  assert.deepEqual(cleanupErrors,[],'Demo cleanup failed; inspect operator state before retry');
  console.log('PASS temporary profile/favorite restoration and local sign-out; cancelled request retained');
 }
}
main().catch(()=>{console.error('FAIL demo lifecycle. No secrets logged. Check prerequisites and cleanup status before retry.');process.exitCode=1;});
