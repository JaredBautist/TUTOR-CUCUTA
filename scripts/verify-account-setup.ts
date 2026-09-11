import 'dotenv/config';
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Missing Supabase public configuration.');
const headers = { apikey: key, Authorization: `Bearer ${key}` };
async function probe(path: string) {
  const response = await fetch(`${url}${path}`, { headers });
  const result = await response.json();
  return { status: response.status, result };
}
// Read-only metadata/zero-row probes; never output account data or environment values.
const settings = await probe('/auth/v1/settings');
console.log(JSON.stringify({ settingsStatus: settings.status, googleEnabled: settings.result.external?.google, emailEnabled: settings.result.external?.email, emailConfirmationRequired: settings.result.mailer_autoconfirm === false }));
const checks = [
  ['private_accounts', '/rest/v1/user_accounts?select=id&limit=0', false],
  ['legacy_private_email', '/rest/v1/profiles?select=email&limit=0', false],
  ['public_catalog', '/rest/v1/tutors?select=id,profiles!inner(full_name,avatar_url)&limit=0', true],
] as const;
let blocked = false;
for (const [name, path, publicRead] of checks) {
  const { status, result } = await probe(path);
  const passed = publicRead ? status === 200 : result.code === '42501';
  console.log(JSON.stringify({ check: name, passed, status, code: result.code || null }));
  blocked ||= !passed;
}
if (blocked || !settings.result.external?.google) process.exitCode = 1;
