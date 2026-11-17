import 'dotenv/config';
import {config} from 'dotenv';
import assert from 'node:assert/strict';
import {readFile,writeFile,rename,open,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {randomUUID,randomBytes} from 'node:crypto';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {presentationAccounts} from './delivery/expandedAccounts';
import {DELIVERY_SET,assertOwnedIdentity} from './delivery/accounts';
import {createAccountRepository} from '../src/features/accounts/infrastructure/supabaseAccounts';
import {createMarketplaceRepository} from '../src/features/marketplace/infrastructure/supabaseMarketplace';
import {createFavoritesRepository} from '../src/features/favorites/infrastructure/supabaseFavorites';
import type {RequestInput} from '../src/features/marketplace/domain/contracts';

type Entry={email:string;password:string;id?:string;profileSaved?:boolean;published?:boolean};
type Journal={set:string;url:string;accounts:Record<string,Entry>};

/** Explicit operator-only expansion. Existing profiles and already-published offers are preserved. */
async function main() {
 if(!process.argv.includes('--apply')){console.log('PLAN: totals 10 tutors + 10 students; ten teacher inboxes. Existing minors preserved. --apply persists demo data.');return;}
 assert.deepEqual(process.argv.slice(2),['--apply']);config({path:'.env.admin',quiet:true});
 const url=process.env.VITE_SUPABASE_URL!,key=process.env.VITE_SUPABASE_ANON_KEY!,adminKey=process.env.SUPABASE_SERVICE_ROLE_KEY!;
 assert.ok(url && key && adminKey,'Administrative demo provisioning configuration missing');
 const folder=join(homedir(),'.local/share/tutorcucuta',DELIVERY_SET),journalPath=join(folder,'accounts.json');
 const journal:Journal=JSON.parse(await readFile(journalPath,'utf8'));assert.equal(journal.set,DELIVERY_SET);assert.equal(journal.url,url);
 const lockPath=join(folder,'operator.lock'),lock=await open(lockPath,'wx',0o600);
 const clients=new Map<string,SupabaseClient>();
 const save=async(path:string,value:unknown)=>{await writeFile(path+'.tmp',JSON.stringify(value,null,2),{mode:0o600});await rename(path+'.tmp',path);};
 try {
  const admin=createClient(url,adminKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const users=new Map<string,Awaited<ReturnType<typeof admin.auth.admin.listUsers>>['data']['users'][number]>();
  for(let page=1;page<=100;page++) {
   const result=await admin.auth.admin.listUsers({page,perPage:1000});assert.ok(!result.error,'Admin inventory failed');
   for(const user of result.data.users)if(user.email && presentationAccounts.some(a=>a.email===user.email))users.set(user.email,user);
   if(result.data.users.length<1000)break;assert.ok(page<100,'Inventory limit');
  }
  for(const account of presentationAccounts)if(users.has(account.email)){assertOwnedIdentity(account,users.get(account.email)!);assert.ok(journal.accounts[account.key],'Missing owned credential journal');}
  for(const account of presentationAccounts) {
   let entry=journal.accounts[account.key];
   if(!entry){entry={email:account.email,password:randomBytes(24).toString('base64url')};journal.accounts[account.key]=entry;await save(journalPath,journal);}
   assert.equal(entry.email,account.email);
   let user=users.get(account.email);
   if(!user) {
    const result=await admin.auth.admin.createUser({email:entry.email,password:entry.password,email_confirm:true,app_metadata:{delivery_set:DELIVERY_SET,fictional:true},user_metadata:{account_role:account.role,full_name:account.profile.name}});
    assert.ok(!result.error && result.data.user,'Demo creation failed');user=result.data.user;
   }
   assertOwnedIdentity(account,user);if(entry.id)assert.equal(entry.id,user.id);entry.id=user.id;await save(journalPath,journal);
   const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});clients.set(account.key,client);
   const login=await client.auth.signInWithPassword({email:entry.email,password:entry.password});assert.ok(!login.error,'Demo sign-in failed');assert.equal(login.data.user?.id,entry.id);
  }
  const repo=(name:string)=>createMarketplaceRepository(clients.get(name)!);
  const controlledContact=(await repo('camilo-becerra').ownOffer())?.phone;assert.ok(controlledContact);
  for(const definition of presentationAccounts) {
   const entry=journal.accounts[definition.key],client=clients.get(definition.key)!,accounts=createAccountRepository(client);
   const identity={id:entry.id!,email:entry.email,name:String(definition.profile.name)};
   let account=await accounts.read(identity);
   if(!account)account=await accounts.create(identity,definition.role);
   assert.equal(account.role,definition.role);
   if(!entry.profileSaved) {
    // Freshly provisioned entries only; refuse replacing a populated edited profile.
    assert.ok(!account.profile.name || account.profile.name===definition.profile.name);
    account=await accounts.save(account,{...definition.profile,...(definition.role==='student'?{phone:controlledContact}:{})},account.displayAvatarUrl);
    entry.profileSaved=true;await save(journalPath,journal);
   }
   if(definition.offer && !entry.published) {
    const existing=await repo(definition.key).ownOffer();
    if(!existing?.published)await repo(definition.key).publish({...definition.offer,phone:controlledContact,version:existing?.version??0,published:false});
    entry.published=true;await save(journalPath,journal);
   }
  }
  const ledgerPath=join(folder,'expanded-inboxes.json');let ledger:{url:string;requests:Record<string,RequestInput>}={url,requests:{}};
  try{ledger=JSON.parse(await readFile(ledgerPath,'utf8'));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}assert.equal(ledger.url,url);
  const teachers=presentationAccounts.filter(a=>a.role==='tutor'),students=presentationAccounts.filter(a=>a.role==='student' && Number(a.profile.age)>=18);
  for(const [index,teacher] of teachers.entries()) {
   const student=students[index%students.length],teacherId=journal.accounts[teacher.key].id!,studentRepo=repo(student.key),teacherRepo=repo(teacher.key);
   const offer=await teacherRepo.ownOffer();assert.ok(offer?.published);
   let input=ledger.requests[teacher.key];
   if(!input) {
    const slot=offer.availability[0];assert.ok(slot);
    const accepted=(await teacherRepo.requests()).filter(r=>r.status==='accepted');let startsAt='';
    for(let offset=8;offset<170;offset++) {
     const date=new Date(Date.now()+offset*86400000);if((date.getUTCDay()||7)!==slot.day)continue;
     const candidate=`${date.toISOString().slice(0,10)}T${slot.start}:00-05:00`,time=Date.parse(candidate);
     if(!accepted.some(r=>Date.parse(r.startsAt!)<time+3600000 && Date.parse(r.startsAt!)+r.durationHours!*3600000>time)){startsAt=candidate;break;}
    }
    assert.ok(startsAt);input={id:randomUUID(),tutorId:teacherId,subject:(teacher.profile.subjects as string[])[0],modality:offer.modalities.includes('virtual')?'virtual':'presencial',startsAt,durationHours:1,note:'Necesito reforzar el tema y resolver ejercicios para una evaluación. Acompañamiento paso a paso.'};
    ledger.requests[teacher.key]=input;await save(ledgerPath,ledger);
   }
   assert.equal(input.tutorId,teacherId);
   let row=(await studentRepo.requests()).find(r=>r.id===input.id);
   if(!row){await studentRepo.request(input);row=(await studentRepo.requests()).find(r=>r.id===input.id);}
   const received=(await teacherRepo.requests()).find(r=>r.id===input.id);assert.ok(row && received);assert.equal(row.status,received.status);
   await createFavoritesRepository(clients.get(student.key)!).set(teacherId,true);
   console.log(`READY ${teacher.profile.name}: ${received.status}`);
  }
  const sections=presentationAccounts.map(a=>{const e=journal.accounts[a.key];return `## ${a.role==='tutor'?'Docente':'Estudiante'} — ${a.profile.name}\n\nCorreo: ${e.email}\nContraseña: ${e.password}\n`;});
  await writeFile(join(folder,'CREDENCIALES_ENTREGA.md'),`# Credenciales privadas de demostración\n\nNo publicar ni compartir en capturas.\n\n${sections.join('\n')}`,{mode:0o600});
  assert.equal(teachers.length,10);assert.equal(presentationAccounts.filter(a=>a.role==='student').length,10);
  console.log('VERIFIED 10 tutors, 10 students and 10 owned teacher inbox scenarios. Credentials updated privately.');
 } finally {
  const results=await Promise.allSettled([...clients.values()].map(async client=>{const result=await client.auth.signOut({scope:'local'});if(result.error)throw result.error;}));
  await lock.close();await unlink(lockPath);assert.ok(results.every(r=>r.status==='fulfilled'),'Demo session cleanup failed');
 }
}
main().catch(()=>{console.error('Expansion failed; private journal retains partial progress. No credentials logged.');process.exitCode=1;});
