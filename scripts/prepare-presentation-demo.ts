import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile,open,rename,unlink} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {deliveryAccounts,DELIVERY_SET} from './delivery/accounts';
import {createAccountRepository} from '../src/features/accounts/infrastructure/supabaseAccounts';
import {createMarketplaceRepository} from '../src/features/marketplace/infrastructure/supabaseMarketplace';
import {createFavoritesRepository} from '../src/features/favorites/infrastructure/supabaseFavorites';
import type {RequestInput} from '../src/features/marketplace/domain/contracts';

const scenarios=[
 {key:'pending-math',student:'santiago-suarez',tutor:'camilo-becerra',subject:'Matemáticas',status:'pending'},
 {key:'accepted-english',student:'mariana-castro',tutor:'laura-quintero',subject:'Inglés',status:'accepted'},
 {key:'rejected-math',student:'santiago-suarez',tutor:'camilo-becerra',subject:'Matemáticas',status:'rejected'},
 {key:'cancelled-english',student:'mariana-castro',tutor:'laura-quintero',subject:'Inglés',status:'cancelled'},
] as const;

/** Small valid PDF: study material explicitly identified as fictional demonstration content. */
function studyPdf():File {
 const content='BT /F1 18 Tf 50 740 Td (TutorCucuta - Material de demostracion) Tj 0 -35 Td /F1 12 Tf (Limites: ejemplos para practicar durante una tutoria.) Tj 0 -25 Td (Contenido ficticio. No es diploma ni certificacion.) Tj ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
 let pdf='%PDF-1.4\n';const offsets=[0];
 objects.forEach((object,index)=>{offsets.push(pdf.length);pdf+=`${index+1} 0 obj\n${object}\nendobj\n`;});
 const xref=pdf.length;pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 return new File([pdf],'guia-demo-limites.pdf',{type:'application/pdf'});
}

async function main() {
 if(!process.argv.includes('--apply')){console.log('PLAN: existing 4 tutors/4 students, adult contacts, favorites, 4 request states and one fictional study PDF. Use --apply to persist.');return;}
 assert.deepEqual(process.argv.slice(2),['--apply']);
 const url=process.env.VITE_SUPABASE_URL!,key=process.env.VITE_SUPABASE_ANON_KEY!;assert.ok(url && key);
 const folder=join(homedir(),'.local/share/tutorcucuta',DELIVERY_SET);
 const journal=JSON.parse(await readFile(join(folder,'accounts.json'),'utf8'));assert.equal(journal.set,DELIVERY_SET);assert.equal(journal.url,url);
 const lockPath=join(folder,'operator.lock');const lock=await open(lockPath,'wx',0o600);
 const clients=new Map<string,{client:SupabaseClient;id:string;email:string}>();
 const ledgerPath=join(folder,'presentation-scenarios.json');
 let ledger:{url:string;requests:Record<string,RequestInput>}={url,requests:{}};
 try {
  try{ledger=JSON.parse(await readFile(ledgerPath,'utf8'));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  assert.equal(ledger.url,url);
  for(const definition of deliveryAccounts) {
   const entry=journal.accounts[definition.key];assert.equal(entry.email,definition.email);
   const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
   clients.set(definition.key,{client,id:entry.id,email:entry.email});
   const result=await client.auth.signInWithPassword({email:entry.email,password:entry.password});assert.ok(!result.error,'Demo login failed');assert.equal(result.data.user?.id,entry.id);
   const account=await createAccountRepository(client).read({id:entry.id,email:entry.email,name:''});assert.equal(account?.role,definition.role);
  }
  const actor=(name:string)=>{const account=clients.get(name);assert.ok(account);return account;};
  const repo=(name:string)=>createMarketplaceRepository(actor(name).client);
  for(const name of ['santiago-suarez','mariana-castro']) {
   const user=actor(name),accounts=createAccountRepository(user.client),account=await accounts.read({...user,name:''});assert.ok(account && Number(account.profile.age)>=18);
   if(!account.profile.phone){const offer=await repo('camilo-becerra').ownOffer();assert.ok(offer?.phone);await accounts.save(account,{...account.profile,phone:offer.phone},account.displayAvatarUrl);}
   await createFavoritesRepository(user.client).set(actor(name==='santiago-suarez'?'camilo-becerra':'laura-quintero').id,true);
  }
  for(const [index,scenario] of scenarios.entries()) {
   const student=repo(scenario.student),teacher=repo(scenario.tutor),teacherId=actor(scenario.tutor).id;
   if(!ledger.requests[scenario.key]) {
    const offer=await teacher.ownOffer();assert.ok(offer?.published && offer.modalities.includes('virtual'));
    const slot=offer.availability[0];assert.ok(slot);
    let date=new Date(Date.now()+(8+index*7)*86400000);
    while((date.getUTCDay()||7)!==slot.day)date=new Date(date.getTime()+86400000);
    const startsAt=new Date(`${date.toISOString().slice(0,10)}T${slot.start}:00-05:00`).toISOString();
    ledger.requests[scenario.key]={id:randomUUID(),tutorId:teacherId,subject:scenario.subject,modality:'virtual',startsAt,durationHours:1,note:scenario.subject==='Matemáticas'?'Preparar límites por sustitución y factorización con ejercicios guiados.':'Practicar conversación y comprensión lectora para una exposición.'};
    await writeFile(ledgerPath+'.tmp',JSON.stringify(ledger,null,2),{mode:0o600});await rename(ledgerPath+'.tmp',ledgerPath);
   }
   const input=ledger.requests[scenario.key];assert.equal(input.tutorId,teacherId);
   let row=(await student.requests()).find(request=>request.id===input.id);
   if(!row){await student.request(input);row=(await student.requests()).find(request=>request.id===input.id);assert.ok(row);}
   if(row.status==='pending' && scenario.status!=='pending') {
    await (scenario.status==='cancelled'?student:teacher).transition(input.id,scenario.status);
   }
   const fromStudent=(await student.requests()).find(request=>request.id===input.id),fromTutor=(await teacher.requests()).find(request=>request.id===input.id);
   assert.ok(fromStudent && fromTutor);assert.equal(fromStudent.status,fromTutor.status);
   console.log(`READY ${scenario.key}: ${fromStudent.status}`);
  }
  const documentTitle='Guía de práctica: límites (demostración)';
  const documents=await repo('camilo-becerra').documents(actor('camilo-becerra').id);
  if(!documents.some(document=>document.name===documentTitle))await repo('camilo-becerra').uploadDocument(actor('camilo-becerra').id,studyPdf(),documentTitle,'Material ficticio de apoyo para demostrar el visor. No es un título ni acredita formación.');
  const studentDocuments=await repo('santiago-suarez').documents(actor('camilo-becerra').id);const document=studentDocuments.find(item=>item.name===documentTitle);assert.ok(document);
  const signed=await repo('santiago-suarez').documentUrl(document);const response=await fetch(signed);assert.equal(response.status,200);assert.ok((await response.text()).startsWith('%PDF'));
  console.log('READY private demonstration PDF: student signed access verified');
  console.log('READY presentation data persisted; no duplicate accounts created.');
 } finally {
  const results=await Promise.allSettled([...clients.values()].map(async({client})=>{const result=await client.auth.signOut({scope:'local'});if(result.error)throw result.error;}));
  await lock.close();await unlink(lockPath);assert.ok(results.every(result=>result.status==='fulfilled'),'Some demo sessions did not sign out');
 }
}
main().catch(()=>{console.error('Demo preparation failed. Partial state retained safely in private ledger; inspect before retry.');process.exitCode=1;});
