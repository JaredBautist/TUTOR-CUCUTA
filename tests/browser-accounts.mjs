import { installAccountFixture } from './fixtures/auth-browser.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const profile = await mkdtemp(join(tmpdir(), 'tutorcucuta-browser-'));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], {
  stdio: 'ignore',
  env: { ...process.env, VITE_SUPABASE_URL: 'https://catalog.invalid', VITE_SUPABASE_ANON_KEY: 'isolated-browser-test-key-only' },
});
const chromium = spawn('chromium', ['--headless=new', '--disable-gpu', '--disable-dev-shm-usage', '--no-sandbox', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let browserLog = '';
chromium.stderr.on('data', (chunk) => { browserLog += chunk.toString(); });
let socket;
const runtimeErrors = [];

async function until(check, message) {
  for (let attempt = 0; attempt < 150; attempt++) {
    const result = await check();
    if (result) return result;
    await pause(100);
  }
  throw new Error(message);
}

try {
  await until(async () => { try { return (await fetch('http://127.0.0.1:4175')).ok; } catch { return false; } }, 'Vite did not start');
  const debugUrl = await until(() => browserLog.match(/ws:\/\/127\.0\.0\.1:\d+/)?.[0], 'Chromium did not start');
  const targets = await (await fetch(debugUrl.replace('ws:', 'http:') + '/json/list')).json();
  socket = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
  const pending = new Map();
  let id = 0;
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.text);
    if (message.id) {
      const callbacks = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) callbacks.reject(new Error(message.error.message));
      else callbacks.resolve(message.result);
    }
  });
  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const response = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
  };
  const body = () => evaluate('document.body?.innerText || ""');
  const click = async (label) => {
    const clicked = await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(b => b.getBoundingClientRect().width && b.innerText.trim() === ${JSON.stringify(label)}); if (!button) return false; button.click(); return true; })()`);
    assert.ok(clicked, `Visible button missing: ${label}`);
    await pause(120);
  };
  const screenshot = async (path) => {
    const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
    await writeFile(path, Buffer.from(data, 'base64'));
  };

  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `(${installAccountFixture.toString()})({signedIn:false});
    const originalFetch=window.fetch.bind(window); window.fetch=(input,init)=>String(input).includes('/rest/v1/tutors')||String(input).includes('/rest/v1/tutor_map_locations') ? Promise.resolve(new Response('[]',{headers:{'Content-Type':'application/json'}})) : originalFetch(input,init);
    localStorage.setItem('tutorcucuta_student_profile_v2',JSON.stringify({name:'Legacy private draft'}));` });
  const fill = async (selector, value) => evaluate(`(() => { const input=document.querySelector(${JSON.stringify(selector)}); const setter=Object.getOwnPropertyDescriptor(input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set; setter.call(input,${JSON.stringify(value)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  const login = async (role='student',password='test-password') => { await fill('input[type=email]',`${role}@example.invalid`); await fill('input[type=password]',password); await click('Entrar'); };
  await cdp('Page.navigate', { url: 'http://127.0.0.1:4175' });
  await until(async ()=>(await body()).includes('Continuar con Google'),'Access screen missing');
  assert.doesNotMatch(await body(),/Buscar Tutores|Legacy private draft/);
  await login('student','wrong-password');
  await until(async ()=>(await body()).includes('no son correctos'),'Invalid login not reported');
  await click('Crear cuenta'); await fill('input[type=password]','test-password'); await click('Registrarme');
  await until(async ()=>(await body()).includes('Revisa tu correo'),'Confirmation not reported');
  assert.equal(await evaluate('window.__authFixture.signupRole'),'student');
  assert.doesNotMatch(await body(),/Buscar Tutores/);
  await click('Iniciar sesión'); await login();
  await until(async ()=>(await body()).includes('Buscar Tutores'),'Login failed');
  await click('Mi Perfil');
  assert.equal(await evaluate(`document.querySelector('input[placeholder="Ej. Nombre y Apellido"]').value`),'');
  assert.equal(await evaluate('document.querySelector("input[type=email]").readOnly'),true);
  await fill('input[placeholder="Ej. Nombre y Apellido"]','Saved student');
  await evaluate('window.__authFixture.failSave=true'); await click('Guardar');
  await until(async ()=>(await body()).includes('No se pudo confirmar el guardado'),'Failed save missing');
  assert.doesNotMatch(await body(),/Perfil guardado/);
  assert.equal(await evaluate(`document.querySelector('input[placeholder="Ej. Nombre y Apellido"]').value`),'Saved student');
  await evaluate('window.__authFixture.failSave=false'); await click('Guardar');
  await until(async ()=>(await body()).includes('Perfil guardado'),'Save acknowledgement missing');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("tutorcucuta_student_profile_v2")).name'),'Legacy private draft');
  await screenshot('/tmp/tutorcucuta-auth-profile-desktop.png');
  await cdp('Page.reload'); await pause(400);
  await until(async ()=>(await body()).includes('Buscar Tutores'),'Session restore failed');
  await click('Mi Perfil');
  assert.equal(await evaluate(`document.querySelector('input[placeholder="Ej. Nombre y Apellido"]').value`),'Saved student');
  await evaluate('window.__authFixture.conflict=true'); await fill('input[placeholder="Ej. Nombre y Apellido"]','Unsaved stale edit'); await click('Guardar');
  await until(async ()=>(await body()).includes('otra sesión'),'Stale save not rejected');
  await click('Salir'); await until(async ()=>(await body()).includes('Continuar con Google'),'Logout failed');
  await cdp('Page.reload'); await pause(400); await until(async ()=>(await body()).includes('Continuar con Google'),'Logged-out session restored unexpectedly');
  await click('Soy tutor'); await login('tutor');
  await until(async ()=>(await body()).includes('Solicitudes Recibidas'),'Teacher login failed');
  assert.doesNotMatch(await body(),/Saved student|Unsaved stale edit/);
  await click('Mi Perfil Docente'); await click('Guardar');
  await until(async ()=>(await body()).includes('Perfil guardado'),'Incomplete teacher profile did not save');
  await cdp('Page.reload'); await pause(400); await until(async ()=>(await body()).includes('Solicitudes Recibidas'),'Teacher role not restored');
  await click('Salir'); await click('Olvidé mi contraseña'); await fill('input[type=email]','student@example.invalid'); await click('Enviar enlace de recuperación');
  await until(async ()=>(await body()).includes('Si existe una cuenta'),'Recovery request missing');
  // Exercise PKCE recovery with the SDK-generated verifier from the preceding request.
  assert.ok(await evaluate('localStorage.getItem("sb-catalog-auth-token-code-verifier")'),'Recovery must persist a PKCE verifier');
  await cdp('Page.navigate',{url:'http://127.0.0.1:4175/?code=controlled-recovery-code&auth=recovery'});
  await until(async ()=>(await body()).includes('Nueva contraseña'),'Password recovery callback missing');
  await fill('input[type=password]','new-test-password'); await click('Guardar contraseña');
  await until(async ()=>(await body()).includes('Buscar Tutores'),'Password recovery did not finish');
  await click('Salir');
  await cdp('Page.navigate',{url:'http://127.0.0.1:4175/?code=expired'});
  await until(async ()=>(await body()).includes('ha caducado'),'Expired link not explained');
  assert.equal(await evaluate('new URL(location.href).searchParams.has("code")'),false,'A failed callback must not replay on later login');
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await until(async ()=>(await body()).includes('Continuar con Google'),'Mobile access missing');
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'Mobile access overflows');
  await screenshot('/tmp/tutorcucuta-auth-mobile.png');
  assert.deepEqual(runtimeErrors,[]);
  console.log('PASS browser auth: confirmation, invalid credentials, sign-in, cloud save/reload, failures/conflicts, immutable restored role, account separation, logout, recovery, mobile layout. Controlled backend only.');
} finally {
  socket?.close();
  chromium.kill('SIGTERM');
  vite.kill('SIGTERM');
  await pause(400);
  await rm(profile, { recursive: true, force: true, maxRetries: 3 });
}
