import 'dotenv/config';
/** Read-only zero-row availability/permission probes; no identities, records or keys printed. */
const base=process.env.VITE_SUPABASE_URL;
const key=process.env.VITE_SUPABASE_ANON_KEY;
if(!base || !key)throw new Error('Configure Supabase public environment first.');
let passed=true;
for(const table of ['tutor_offers','tutor_offer_contacts','tutor_offer_locations','tutor_documents','tutoring_requests']) {
 const response=await fetch(`${base}/rest/v1/${table}?select=*&limit=0`,{headers:{apikey:key,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000)});
 const result=await response.json();
 const protectedTable=result.code==='42501';passed&&=protectedTable;
 console.log(JSON.stringify({table,availableAndAnonymousDenied:protectedTable,status:response.status,code:result.code || null}));
}
if(!passed){console.error('Apply supabase/migrations/20260912000000_cloud_marketplace.sql in SQL Editor, then rerun this check.');process.exitCode=1;}
else console.log('PASS anonymous protection probes. Authenticated publication, Storage and participant delivery require real-account validation.');
