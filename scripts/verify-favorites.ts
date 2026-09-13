import 'dotenv/config';
/** Read-only zero-row availability/permission probes; no identities, records or keys printed. */
const base=process.env.VITE_SUPABASE_URL;
const key=process.env.VITE_SUPABASE_ANON_KEY;
if(!base || !key)throw new Error('Configure Supabase public environment first.');
let passed=true;
for(const table of ['student_favorites']) {
 const response=await fetch(`${base}/rest/v1/${table}?select=*&limit=0`,{headers:{apikey:key,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000)});
 const result=await response.json();
 const protectedTable=result.code==='42501';passed&&=protectedTable;
 console.log(JSON.stringify({table,availableAndAnonymousDenied:protectedTable,status:response.status,code:result.code || null}));
}
if(!passed){console.error('Apply supabase/migrations/20260912010000_student_favorites.sql in SQL Editor, then rerun this check.');process.exitCode=1;}
else console.log('PASS anonymous protection probes. Authenticated favorite saves and cross-device recovery require real-account validation.');
