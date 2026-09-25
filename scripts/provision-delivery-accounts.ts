import 'dotenv/config';
import {config} from 'dotenv';
import {createClient} from '@supabase/supabase-js';
import {randomBytes} from 'node:crypto';
import {chmod,mkdir,open,readFile,rename,unlink,writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {deliveryAccounts,deliveryScenarios,DELIVERY_SET,assertOwnedIdentity} from './delivery/accounts';
import {createAccountRepository} from '../src/features/accounts/infrastructure/supabaseAccounts';
import {createMarketplaceRepository} from '../src/features/marketplace/infrastructure/supabaseMarketplace';
import {recommendTutors} from '../src/features/recommender/domain/recommender';
import {validateOffer} from '../src/features/marketplace/domain/contracts';
import {emptyProfile,validateProfile} from '../src/features/accounts/domain/profile';

type Entry={email:string;password:string;pendingPassword?:string;id?:string;profileSaved?:boolean;published?:boolean};
type Journal={set:string;url:string;accounts:Record<string,Entry>};
const folder=join(homedir(),'.local/share/tutorcucuta',DELIVERY_SET);
const journalPath=join(folder,'accounts.json');
const credentialsPath=join(folder,'CREDENCIALES_ENTREGA.md');
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const phoneVariables:Record<string,string>={
 'sebastian-mendoza':'DELIVERY_PHONE_SEBASTIAN_MENDOZA',
 'valentina-duarte':'DELIVERY_PHONE_VALENTINA_DUARTE',
 'camilo-becerra':'DELIVERY_PHONE_CAMILO_BECERRA',
 'laura-quintero':'DELIVERY_PHONE_LAURA_QUINTERO',
};

/** Explicit operator utility. Default mode never connects or changes remote data. */
async function main(){
 const args=process.argv.slice(2);
 if(args.some(arg=>!['--apply','--verify','--rotate'].includes(arg)) || args.length>1)throw new Error('Use no arguments, --apply, --verify, or --rotate.');
 for(const account of deliveryAccounts)validateProfile(account.role,account.profile);
 if(!args.length){
  console.table(deliveryAccounts.map(a=>({role:a.role,name:a.profile.name,rate:a.profile.ratePerHour ?? '',modalities:a.offer?.modalities.join(',') ?? ''})));
  console.log('PLAN ONLY: 4 tutors + 4 students. No remote changes. Apply requires .env.admin with SUPABASE_SERVICE_ROLE_KEY and the four DELIVERY_PHONE_* contacts.');
  return;
 }
 config({path:'.env.admin',quiet:true});
 const url=process.env.VITE_SUPABASE_URL;
 const publicKey=process.env.VITE_SUPABASE_ANON_KEY;
 if(!url || !publicKey)throw new Error('Public Supabase configuration is missing.');
 const apply=args[0]==='--apply';
 const rotate=args[0]==='--rotate';
 const adminKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const tutorPhones=Object.fromEntries(Object.entries(phoneVariables).map(([key,variable])=>[key,process.env[variable]?.trim()]));
 if((apply || rotate) && !adminKey)throw new Error('Set SUPABASE_SERVICE_ROLE_KEY in .env.admin. Nothing was changed.');
 if(apply)for(const a of deliveryAccounts)if(a.offer){
  const contactPhone=tutorPhones[a.key];
  if(!contactPhone || !/^\+57\d{10}$/.test(contactPhone))throw new Error(`Valid phone (+57 followed by 10 digits) required for ${a.key}`);
  validateOffer({...a.offer,phone:contactPhone,version:0,published:false});
 }
 await mkdir(folder,{recursive:true,mode:0o700});
 const lockPath=join(folder,'operator.lock');
 const lock=await open(lockPath,'wx',0o600).catch(()=>{throw new Error(`Another run or unresolved lock exists: ${lockPath}`);});
 try{
  let journal:Journal;
  try{journal=JSON.parse(await readFile(journalPath,'utf8'));}
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;journal={set:DELIVERY_SET,url,accounts:{}};}
  if(journal.set!==DELIVERY_SET || journal.url!==url)throw new Error('Journal belongs to another delivery or Supabase project.');
  const saveJournal=async()=>{
   const temporary=await open(`${journalPath}.tmp`,'w',0o600);
   try{await temporary.writeFile(JSON.stringify(journal,null,2));await temporary.sync();}finally{await temporary.close();}
   await rename(`${journalPath}.tmp`,journalPath);
  };
  const saveCredentials=async()=>{
   const sections=deliveryAccounts.map(account=>{
    const entry=journal.accounts[account.key];
    if(!entry?.password)return '';
    return `## ${account.profile.name}\n\n- Rol: ${account.role==='tutor'?'Docente':'Estudiante'}\n- Correo: ${entry.email}\n- Contrase\u00f1a: ${entry.password}\n`;
   }).filter(Boolean).join('\n');
   await writeFile(credentialsPath,`# Credenciales locales de entrega — TutorC\u00facuta\n\nArchivo privado. No versionar ni compartir p\u00fablicamente.\n\n${sections}`,{mode:0o600});
   await chmod(credentialsPath,0o600);
  };
  if(apply){
   const admin=createClient(url,adminKey!,options);
   const existing=new Map<string,Awaited<ReturnType<typeof admin.auth.admin.listUsers>>['data']['users'][number]>();
   let page=1;
   for(;;){
    const result=await admin.auth.admin.listUsers({page,perPage:1000});
    if(result.error)throw new Error(`Admin Auth unavailable: ${result.error.message}`);
    for(const user of result.data.users)if(deliveryAccounts.some(a=>a.email===user.email))existing.set(user.email!,user);
    if(result.data.users.length<1000)break;
    if(++page>100)throw new Error('Account inventory limit reached; no identities created.');
   }
   // Check all collisions before creating any identity.
   for(const account of deliveryAccounts){
    const user=existing.get(account.email);
    if(user){assertOwnedIdentity(account,user);if(!journal.accounts[account.key])throw new Error(`Missing private credential journal for ${account.key}; refusing password reset.`);}
   }
   for(const account of deliveryAccounts){
    const entry=journal.accounts[account.key] ?? {email:account.email,password:randomBytes(24).toString('base64url')};
    if(entry.email!==account.email)throw new Error('Credential journal email mismatch.');
    journal.accounts[account.key]=entry;
    await saveJournal(); // Persist recovery information before the first remote mutation.
    let user=existing.get(account.email);
    if(!user){
     const result=await admin.auth.admin.createUser({email:account.email,password:entry.password,email_confirm:true,
      app_metadata:{delivery_set:DELIVERY_SET,fictional:true},user_metadata:{account_role:account.role,full_name:account.profile.name}});
     if(result.error || !result.data.user)throw new Error(`Could not create ${account.key}: ${result.error?.message || 'No identity returned'}`);
     user=result.data.user;
    }
    assertOwnedIdentity(account,user);
    if(entry.id && entry.id!==user.id)throw new Error(`Identity changed for ${account.key}.`);
    entry.id=user.id;await saveJournal();
    const client=createClient(url,publicKey,options);
    try{
     const login=await client.auth.signInWithPassword({email:entry.email,password:entry.password});
     if(login.error)throw new Error(`Sign-in failed for ${account.key}: ${login.error.message}`);
     const owner={id:user.id,email:account.email,name:String(account.profile.name)};
     const repository=createAccountRepository(client);
     let saved=await repository.read(owner);
     if(saved && saved.role!==account.role)throw new Error(`Private role mismatch for ${account.key}.`);
     if(!saved)saved=await repository.create(owner,account.role);
     if(!entry.profileSaved){
      const untouched={...emptyProfile(account.role),name:account.profile.name};
      if(!isDeepStrictEqual(saved.profile,untouched) && !isDeepStrictEqual(saved.profile,account.profile)){
       throw new Error(`Profile was edited outside this run: ${account.key}; refusing overwrite.`);
      }
      saved=await repository.save(saved,account.profile,saved.displayAvatarUrl);
      entry.profileSaved=true;await saveJournal();
     }
     if(account.offer && !entry.published){
      const marketplace=createMarketplaceRepository(client);
      const prior=await marketplace.ownOffer();
      if(!prior?.published)await marketplace.publish({...account.offer,phone:tutorPhones[account.key]!,version:prior?.version ?? 0,published:false});
      entry.published=true;await saveJournal();
     }
     console.log(`Ready: ${account.role} ${account.profile.name}`);
    }finally{await client.auth.signOut({scope:'local'});}
   }
  }
  if(rotate){
   const admin=createClient(url,adminKey!,options);
   for(const account of deliveryAccounts){
    const entry=journal.accounts[account.key];
    if(!entry?.id)throw new Error(`Not provisioned: ${account.key}`);
    const lookup=await admin.auth.admin.getUserById(entry.id);
    if(lookup.error || !lookup.data.user)throw new Error(`Could not verify identity ${account.key}: ${lookup.error?.message || 'No identity returned'}`);
    assertOwnedIdentity(account,lookup.data.user);
    entry.pendingPassword ||= randomBytes(24).toString('base64url');
    await saveJournal();
    const changed=await admin.auth.admin.updateUserById(entry.id,{password:entry.pendingPassword});
    if(changed.error)throw new Error(`Could not rotate ${account.key}: ${changed.error.message}`);
    entry.password=entry.pendingPassword;
    delete entry.pendingPassword;
    await saveJournal();
    console.log(`Rotated: ${account.role} ${account.profile.name}`);
   }
   await saveCredentials();
  }
  // Verify real sign-in and stored fields independently of provisioning receipts.
  for(const account of deliveryAccounts){
   const entry=journal.accounts[account.key];
   if(!entry?.id)throw new Error(`Not provisioned: ${account.key}`);
   const client=createClient(url,publicKey,options);
   try{
    const login=await client.auth.signInWithPassword({email:entry.email,password:entry.password});
    if(login.error || login.data.user?.id!==entry.id)throw new Error(`Verification login failed: ${account.key}`);
    assertOwnedIdentity(account,login.data.user);
    const saved=await createAccountRepository(client).read({id:entry.id,email:entry.email,name:String(account.profile.name)});
    assert.equal(saved?.role,account.role);assert.deepEqual(saved?.profile,account.profile);
    if(account.role==='tutor')assert.equal((await createMarketplaceRepository(client).ownOffer())?.published,true);
    if(account.key==='mateo-rojas'){
     const ids=deliveryAccounts.filter(a=>a.offer).map(a=>journal.accounts[a.key].id!);
     const all=await createMarketplaceRepository(client).catalog();
     const zones=await client.from('tutor_offer_locations').select('tutor_id,latitude,longitude').in('tutor_id',ids);
     if(zones.error)throw new Error('Published zones could not be verified.');
     const tutors=all.filter(t=>ids.includes(t.id)).map(t=>{
      const key=deliveryAccounts.find(a=>journal.accounts[a.key]?.id===t.id)!.key;
      const location=zones.data.find(z=>z.tutor_id===t.id);
      return {...t,id:key,location:location?{latitude:Number(location.latitude),longitude:Number(location.longitude)}:undefined};
     });
     assert.equal(tutors.length,4);
     for(const scenario of deliveryScenarios){
      const matches=recommendTutors(tutors,scenario.filters,scenario.origin);
      assert.deepEqual(matches.map(t=>t.id).sort(),[...scenario.expected].sort());
      assert.ok(matches.every(t=>t.matchReasons.length>=3));
      console.log(`PASS hosted search: ${scenario.name} -> ${matches.map(t=>t.name).join(', ') || 'no matches'}`);
     }
    }
   }finally{await client.auth.signOut({scope:'local'});}
  }
  console.log(`VERIFIED: 8 hosted accounts, 4 published offers, 6 recommendation scenarios. Private login journal: ${journalPath}`);
  if(apply){await saveCredentials();console.log(`Private delivery credentials: ${credentialsPath}`);}
 }finally{await lock.close();await unlink(lockPath);}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Delivery provisioning failed.');process.exitCode=1;});
