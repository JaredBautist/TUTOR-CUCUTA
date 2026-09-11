import { installAccountFixture } from './fixtures/auth-browser.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const profile = await mkdtemp(join(tmpdir(), 'tutorcucuta-browser-'));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
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
  await until(async () => { try { return (await fetch('http://127.0.0.1:4173')).ok; } catch { return false; } }, 'Vite did not start');
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
  // Controlled responses and isolated storage: these tests never read or write hosted user data.
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `
    if (!localStorage.getItem('testInitialized')) {
      localStorage.setItem('testInitialized', 'true');
      localStorage.setItem('tutorcucuta_tutors_v2', JSON.stringify([1,2,3].map(i => ({ id: 'b0000000-0000-0000-0000-00000000000' + i, name: ['Carlos Ramírez','Ing. Diana Peñaranda','Prof. Andrés Villamizar'][i-1] }))));
      localStorage.setItem('testRemoteRows', '[]');
    }
    window.testRequestReads = 0;
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input.url || String(input);
      if (url.includes('/rest/v1/')) {
        if (url.includes('student_requests')) window.testRequestReads++;
        if (localStorage.getItem('testReadError')) return new Response(JSON.stringify({ message: 'Controlled read error' }), { status: 400 });
        return new Response(localStorage.getItem('testRemoteRows'), { headers: { 'Content-Type': 'application/json' } });
      }
      return nativeFetch(input, init);
    };
  ` });
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `(${installAccountFixture.toString()})()` });
  await cdp('Page.navigate', { url: 'http://127.0.0.1:4173' });
  await until(async () => (await body()).includes('Buscar Tutores'), 'App did not render');
  await click('Resultados');
  await until(async () => (await body()).includes('0 tutores disponibles'), 'Catalog did not become empty');
  assert.doesNotMatch(await body(), /Carlos|Diana|Andrés|90%|92%|Tu ubicación/);
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("tutorcucuta_tutors_v2")).length'), 3, 'Original cache must remain intact');
  assert.equal(await evaluate('window.testRequestReads'), 0, 'No participant requests without identity');
  await screenshot('/tmp/tutorcucuta-clean-results-desktop.png');
  await click('Mi Perfil');
  assert.doesNotMatch(await body(), /Borrador local|Guardar en este navegador/, 'Profile chrome must use the requested neutral labels');
  assert.equal(await evaluate(`(() => { const title = [...document.querySelectorAll('span')].find(element => element.textContent.trim() === 'Vista Previa del Perfil'); const card = title?.closest('div.rounded-2xl'); return card && getComputedStyle(card).backgroundColor; })()`), 'rgb(255, 255, 255)', 'Profile preview must use the light surface');
  await evaluate(`(() => { const input = document.querySelector('input[placeholder="Ej. Nombre y Apellido"]'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, 'Persona real'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await screenshot('/tmp/tutorcucuta-student-profile-light.png');
  await click('Guardar');
  assert.match(await body(), /Perfil guardado./);
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("test-account-10000000-0000-4000-8000-000000000001")).profile.name'), 'Persona real');
  await click('Salir');
  assert.doesNotMatch(await body(), /Sin comisiones|Carlos|90%/);
  await click('Soy tutor');
  await evaluate(`(() => { const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; for(const [type,value] of [['email','tutor@example.invalid'],['password','test-password']]) { const input=document.querySelector('input[type='+type+']'); setter.call(input,value); input.dispatchEvent(new Event('input',{bubbles:true})); } })()`);
  await click('Entrar');
  await until(async () => (await body()).includes('Solicitudes Recibidas'), 'Teacher login failed');
  assert.doesNotMatch(await body(), /Carlos|90%|Miércoles|4:30/);
  await click('Mi Perfil Docente');
  assert.doesNotMatch(await body(), /Carlos|Diana|30000|Los Caobos/);
  assert.ok(await evaluate('[...document.querySelectorAll("button")].some(b => !b.disabled && /Guardar/.test(b.innerText))'));
  console.log('PASS desktop: preserved cache, empty catalog, authenticated private profiles');
  await click('Salir');
  await evaluate(`(() => { const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; for(const [type,value] of [['email','student@example.invalid'],['password','test-password']]) { const input=document.querySelector('input[type='+type+']'); setter.call(input,value); input.dispatchEvent(new Event('input',{bubbles:true})); } })()`);
  await click('Entrar');
  await until(async () => (await body()).includes('Buscar Tutores'), 'Student login failed');

  // A real same-name tutor must be retained without invented match/geo/verification values.
  const row = { id: 'real-carlos', profiles: { full_name: 'Carlos Ramírez', avatar_url: null }, title: 'Docente', institution: '', experience_years: 2, rate_per_hour: 22000, verified: false, sector: 'Sector registrado', next_available: null, modalities: ['presencial'], subjects: ['Álgebra'], levels: [], specialties: [], bio: '', methodology_steps: [] };
  await evaluate(`localStorage.setItem('testRemoteRows', ${JSON.stringify(JSON.stringify([row]))})`);
  await cdp('Page.reload');
  await pause(400);
  await until(async () => (await body()).includes('Buscar Tutores'), 'Reload failed');
  await click('Resultados');
  await until(async () => (await body()).includes('Carlos Ramírez'), 'Real tutor missing');
  assert.match(await body(), /1 tutor disponible/);
  assert.doesNotMatch(await body(), /90%|92%|Verificado|2\.4 km|Miércoles|Horario flexible/);
  await click('Ver perfil completo');
  const bookmark = await evaluate(`(() => { const b = document.querySelector('button[aria-label="Guardar en favoritos"]'); if (b) b.click(); return !!b; })()`);
  assert.ok(bookmark, 'Profile favorite button missing');
  await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => /Volver/.test(b.innerText)); b.click(); })()`);
  await click('Favoritos (1)');
  assert.match(await body(), /Carlos Ramírez/);
  await click('Solicitar tutoría');
  assert.ok(await evaluate('document.querySelector("[role=dialog] button[type=submit]").disabled'));
  assert.doesNotMatch(await body(), /Sin comisiones|enviada con éxito/);
  await evaluate(`document.querySelector('button[aria-label="Cerrar solicitud"]').click()`);
  console.log('PASS populated: real same-name tutor, shared favorites, unavailable request submission');

  await evaluate('localStorage.setItem("testRemoteRows", "[]")');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cdp('Page.reload');
  await pause(400);
  await until(async () => (await body()).includes('Buscar'), 'Mobile render failed');
  await click('Tutores');
  await until(async () => (await body()).includes('0 tutores disponibles'), 'Mobile catalog not empty');
  assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Mobile horizontal overflow');
  await screenshot('/tmp/tutorcucuta-clean-results-mobile.png');
  await click('Ver mapa interactivo');
  assert.match(await body(), /Sin ubicaciones registradas/);
  assert.doesNotMatch(await body(), /Tu ubicación|2\.4 km|8 min/);
  await click('Lista de tutores (0)');
  console.log('PASS mobile: empty Results, map, and no horizontal overflow');

  await evaluate('localStorage.setItem("testReadError", "true")');
  await cdp('Page.reload');
  await pause(400);
  await until(async () => (await body()).includes('Buscar'), 'Error scenario reload failed');
  await click('Tutores');
  await until(async () => (await body()).includes('Reintentar'), 'Read error not shown');
  await evaluate('localStorage.removeItem("testReadError")');
  await click('Reintentar');
  await until(async () => (await body()).includes('0 tutores disponibles'), 'Retry did not recover');
  assert.deepEqual(runtimeErrors, []);
  console.log('PASS read failure/retry, no uncaught browser exceptions');
} finally {
  socket?.close();
  chromium.kill('SIGTERM');
  vite.kill('SIGTERM');
  await pause(400);
  await rm(profile, { recursive: true, force: true, maxRetries: 3 });
}
