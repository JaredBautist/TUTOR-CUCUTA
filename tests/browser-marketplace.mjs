import {installMarketplaceFixture} from './fixtures/marketplace-browser.mjs';
import { installAccountFixture } from './fixtures/auth-browser.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const profile = await mkdtemp(join(tmpdir(), 'tutorcucuta-browser-'));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4176', '--strictPort'], {
  stdio: 'ignore',
  env: { ...process.env, VITE_SUPABASE_URL: 'https://catalog.invalid', VITE_SUPABASE_ANON_KEY: 'isolated-browser-test-key-only' },
});
const chromium = spawn('chromium', ['--headless=new', '--disable-gpu', '--disable-dev-shm-usage', '--no-sandbox', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let browserLog = '';
chromium.stderr.on('data', (chunk) => { browserLog += chunk.toString(); });
let socket;
let captureFailure=async()=>{};
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
  await until(async () => { try { return (await fetch('http://127.0.0.1:4176')).ok; } catch { return false; } }, 'Vite did not start');
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
    const clicked = await until(() => evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(b => b.getBoundingClientRect().width && b.innerText.trim() === ${JSON.stringify(label)}); if (!button || button.disabled) return false; button.focus(); button.click(); return true; })()`), `Visible button missing: ${label}`);
    assert.ok(clicked, `Visible button missing: ${label}`);
    await pause(120);
    await until(async () => !(await body()).includes('Cargando vista…'), 'Screen module did not load');
  };
  const screenshot = async (path) => {
    const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
    await writeFile(path, Buffer.from(data, 'base64'));
  };

  captureFailure=async()=>{await screenshot('/tmp/mobile-failure.png');await writeFile('/tmp/mobile-failure.txt',JSON.stringify({body:await body(),runtimeErrors},null,2));};
  const verifyWidths = async name => {
    for (const width of [320,360,390,430,768,1280]) {
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<768});
      await pause(100);
      assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'), `${name} overflow at ${width}`);
      const small=await evaluate(`([...document.querySelectorAll('button,summary')].filter(n=>{const r=n.getBoundingClientRect();return r.width>0 && r.height>0 && (r.width<43.5 || r.height<43.5)}).map(n=>n.textContent || n.getAttribute('aria-label'))) `);
      assert.deepEqual(small,[], `${name} small touch targets at ${width}`);
      if(width===390){
        await screenshot(`/tmp/tutorcucuta-mobile-${name}.png`);
        await evaluate('document.documentElement.style.fontSize="200%"');await pause(100);
        assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'), `${name} overflow with 200% text`);
        await evaluate('document.documentElement.style.fontSize=""');
      }
    }
    await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  };
  await cdp('Page.enable');await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`(${installAccountFixture.toString()})({signedIn:false});(${installMarketplaceFixture.toString()})();
    if(!localStorage.getItem('marketplace-test-seeded')) {
      localStorage.setItem('marketplace-test-seeded','true');
      const tutor={name:'Tutor conectado',title:'Profesor',institution:'',experienceYears:2,ratePerHour:30000,coverageRadiusKm:5,bio:'',subjects:['Álgebra'],specialties:[]};
      const student={name:'Estudiante conectado',age:16,grade:'Universidad',school:'',sector:'',address:'',phone:'',guardianName:'Acudiente',guardianPhone:'+573001234567',guardianRelation:'Padre',guardianAuthorized:false,academicGoal:'Aprender',difficultiesOrTopics:'',learningStyles:[],preferredModality:'virtual',preferredSchedule:'',bioNote:''};
      for(const role of ['tutor','student']) {const id=window.__authFixture.session(role).user.id;localStorage.setItem('test-account-'+id,JSON.stringify({id,role,profile:role==='tutor'?tutor:student,avatar_path:null,avatar_url:null,version:1}));}
    }`});
  const fill=async(selector,value)=>{await until(()=>evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`),`Field missing: ${selector}`);return evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});const prototype=input.tagName==='SELECT'?HTMLSelectElement.prototype:input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event(input.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);};
  const labelInput=async(label,value)=>evaluate(`(()=>{const parent=[...document.querySelectorAll('label')].find(node=>node.textContent.includes(${JSON.stringify(label)}));const input=parent.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const check=async(label)=>evaluate(`(()=>{const input=[...document.querySelectorAll('label')].find(node=>node.textContent.trim()===${JSON.stringify(label)}).querySelector('input');input.click();})()`);
  const login=async(role)=>{await fill('input[type=email]',role+'@example.invalid');await fill('input[type=password]','test-password');await click('Entrar');};
  await cdp('Page.navigate',{url:'http://127.0.0.1:4176'});
  await until(async()=>(await body()).includes('Continuar con Google'),'Login screen missing');
  await verifyWidths('login');
  await login('tutor');await until(async()=>(await body()).includes('Mi Perfil Docente'),'Tutor session missing');
  await click('Mi Perfil Docente');await until(async()=>(await body()).includes('Oferta y disponibilidad'),'Offer panel missing');
  await check('Universidad');await check('Virtual');await labelInput('Teléfono con código de país','+573009999999');await click('Agregar horario');
  await click('Guardar perfil y publicar oferta');
  await until(async()=>(await body()).includes('Oferta publicada en Supabase'),'Publication not acknowledged');
  await writeFile('/tmp/tutorcucuta-review-document.pdf','%PDF-1.7\n%%EOF');
  const root=await cdp('DOM.getDocument');
  const fileNode=await cdp('DOM.querySelector',{nodeId:root.root.nodeId,selector:'input[accept="application/pdf,image/jpeg,image/png"]'});
  await cdp('DOM.setFileInputFiles',{nodeId:fileNode.nodeId,files:['/tmp/tutorcucuta-review-document.pdf']});
  await evaluate('window.__marketplaceFixture.failDocument=true');await click('Guardar documento');
  await until(async()=>(await body()).includes('No se pudo confirmar'),'Document failure not exposed');
  assert.doesNotMatch(await body(),/Documento guardado en Supabase/);
  await evaluate('window.__marketplaceFixture.failDocument=false');await click('Guardar documento');
  await until(async()=>(await body()).includes('Documento guardado en Supabase'),'Document save not acknowledged');
  await screenshot('/tmp/tutorcucuta-marketplace-teacher.png');
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate("[...document.querySelectorAll('section')].find(node=>node.innerText.includes('Oferta y disponibilidad')).scrollIntoView()");
  await pause(200);
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'Publication/document forms overflow mobile width');
  await screenshot('/tmp/tutorcucuta-marketplace-mobile.png');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  for (const width of [320,360,390,430,768,1280]) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<768});
    await pause(100);
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'), `Tutor profile overflow at ${width}`);
  }
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await click('Salir');await until(async()=>(await body()).includes('Continuar con Google'),'Logout missing');
  await login('student');await until(async()=>(await body()).includes('Buscar Tutores'),'Student session missing');
  await until(async()=>await evaluate(`Boolean([...document.querySelectorAll('button')].find(node=>node.innerText==='Ver tutores'))`),'Search screen not ready');
  await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(node=>node.innerText.includes('Virtual'));button.click();})()`);
  await fill('input[aria-label="Tema específico a reforzar"]','Límites');
  await fill('#studentsearchview-field-1','Preparar bimestral.');
  await verifyWidths('search');
  await click('Ver tutores');await until(async()=>(await body()).includes('Tutor conectado'),'Published offer missing');
  assert.ok(await evaluate(`Boolean(document.querySelector('option[value="match"]'))`),'Match sorting missing');
  const favoriteButton=()=>evaluate(`document.querySelector('button[aria-label="Guardar a Tutor conectado en favoritos"],button[aria-label="Quitar a Tutor conectado de favoritos"]')?.getAttribute('aria-pressed')`);
  const toggleFavorite=()=>evaluate(`document.querySelector('button[aria-label="Guardar a Tutor conectado en favoritos"],button[aria-label="Quitar a Tutor conectado de favoritos"]').click()`);
  await until(async()=>await evaluate(`!document.querySelector('button[aria-label="Guardar a Tutor conectado en favoritos"]')?.disabled`),'Favorites not ready');
  await evaluate('window.__marketplaceFixture.failFavorite=true');await toggleFavorite();
  await until(async()=>(await body()).includes('No se pudo confirmar el favorito'),'Favorite write failure missing');
  assert.equal(await favoriteButton(),'false','Failed favorite must not appear saved');
  await evaluate('window.__marketplaceFixture.failFavorite=false');await click('Actualizar favoritos');
  await toggleFavorite();await until(async()=>await favoriteButton()==='true','Favorite not saved');
  await cdp('Page.reload');await pause(500);await until(async()=>(await body()).includes('Buscar Tutores'),'Favorite session restore missing');
  await until(async()=>await evaluate(`Boolean([...document.querySelectorAll('button')].find(node=>node.innerText==='Ver tutores'))`),'Search screen not ready');
  await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(node=>node.innerText.includes('Virtual'));button.click();})()`);
  await click('Ver tutores');await until(async()=>await favoriteButton()==='true','Favorite lost on reload');
  await evaluate('window.__marketplaceFixture.failFavoriteRead=true;window.dispatchEvent(new Event("focus"))');
  await until(async()=>(await body()).includes('Actualizar favoritos'),'Favorite read failure missing');
  assert.equal(await favoriteButton(),'true','Failed read erased confirmed favorite');
  await evaluate('window.__marketplaceFixture.failFavoriteRead=false');await click('Actualizar favoritos');
  // Simulate a separate device changing the fake server, then refocus this client.
  await evaluate(`localStorage.setItem('marketplace-test-favorites-'+window.__authFixture.session('student').user.id,'[]');window.dispatchEvent(new Event('focus'));`);
  await until(async()=>await favoriteButton()==='false','Other-device change not recovered on focus');
  await toggleFavorite();await until(async()=>await favoriteButton()==='true','Favorite retry missing');
  await click('Ver perfil completo');await until(async()=>(await body()).includes('tutorcucuta-review-document.pdf'),'Shared document missing');
  await until(async()=>await evaluate(`Boolean([...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Ver soporte' && !b.disabled))`),'Document actions not ready');
  await click('Ver soporte');await until(async()=>await evaluate('Boolean(document.querySelector("dialog[open] iframe"))'),'Private PDF viewer missing');
  await evaluate(`document.querySelector('button[aria-label="Cerrar documento"]').click()`);
  await verifyWidths('tutor-detail');
  await click('Solicitar tutoría con Tutor');
  assert.ok(await evaluate('document.querySelector("[role=dialog] button[type=submit]").disabled'),'Minor without authorization can submit');
  await evaluate(`document.querySelector('button[aria-label="Cerrar solicitud"]').click()`);
  await click('Mi Perfil');await until(async()=>(await body()).includes('Foto de Perfil y Datos Personales'),'Student profile missing');await verifyWidths('student-profile');
  // The dedicated profile suite tests acknowledged cloud profile saves. Change the fake
  // server record, then restore a fresh session to verify that authorization is consumed.
  await evaluate(`(()=>{const id=window.__authFixture.session('student').user.id;const key='test-account-'+id;const row=JSON.parse(localStorage.getItem(key));row.profile.guardianAuthorized=true;localStorage.setItem(key,JSON.stringify(row));})()`);
  await cdp('Page.reload');await pause(500);await until(async()=>(await body()).includes('Buscar Tutores'),'Restore missing');
  await until(async()=>await evaluate(`Boolean([...document.querySelectorAll('button')].find(node=>node.innerText==='Ver tutores'))`),'Search screen not ready');
  await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(node=>node.innerText.includes('Virtual'));button.click();})()`);
  await fill('input[aria-label="Tema específico a reforzar"]','Límites');await fill('#studentsearchview-field-1','Preparar bimestral.');
  await click('Ver tutores');await until(async()=>(await body()).includes('Tutor conectado'),'Restored offer missing');
  for (const width of [320,360,390,430,768,1280]) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<768});
    await pause(100);
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'), `Results overflow at ${width}`);
  }
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await fill('input[aria-label="Buscar en los resultados"]','conectado');
  await evaluate('window.scrollTo(0,200)'); await pause(100);
  const listScroll=await evaluate('window.scrollY');
  await click('Ver perfil completo');await click('Volver a resultados');await pause(250);
  assert.equal(await evaluate(`document.querySelector('input[aria-label="Buscar en los resultados"]').value`),'conectado');
  assert.ok(Math.abs(await evaluate('window.scrollY')-listScroll)<5,`Results scroll was not restored: before ${listScroll}, after ${await evaluate('window.scrollY')}`);
  await screenshot('/tmp/tutorcucuta-mobile-results-after.png');
  await click('Solicitar tutoría');
  assert.ok(await evaluate('document.querySelector("dialog[open]").contains(document.activeElement)'), 'Dialog focus missing');
  assert.equal(await evaluate('document.querySelector("#request-note").value'),'Tema: Límites\n\nPreparar bimestral.');
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:1});
  await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert.ok(await evaluate('document.querySelector("dialog[open]").contains(document.activeElement)'), 'Keyboard escaped modal');
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await pause(100); assert.equal(await evaluate('Boolean(document.querySelector("dialog[open]"))'),false);
  assert.equal(await evaluate('document.activeElement.textContent.trim()'),'Solicitar tutoría','Focus did not return to trigger');
  await click('Solicitar tutoría');
  await fill('#request-subject','Álgebra');
  const nextMonday=new Date(); nextMonday.setUTCDate(nextMonday.getUTCDate()+((8-nextMonday.getUTCDay())%7 || 7)); const date=nextMonday.toISOString().slice(0,10);
  await fill('input[type=date]',date);await fill('#request-time','11:00');await fill('#request-duration','180');await pause(100);
  assert.equal(await evaluate('document.querySelector("#request-time").value'),'','Invalidated time remained selected');
  assert.match(await body(),/ya no encaja/);
  await fill('#request-duration','60');await fill('#request-time','09:00');
  await fill('#request-note','a'.repeat(2001));
  assert.ok(await evaluate('document.querySelector("[role=dialog] button[type=submit]").disabled'),'Oversized note allowed');
  await fill('#request-note','Repasar límites para la bimestral.');
  await screenshot('/tmp/tutorcucuta-mobile-booking-after.png');
  await evaluate('window.__marketplaceFixture.holdRequest=true;window.__marketplaceFixture.failRequest=true;document.querySelector("[role=dialog] form").requestSubmit();document.querySelector("[role=dialog] form").requestSubmit()');
  await until(()=>evaluate('Boolean(window.__marketplaceFixture.releaseRequest)'), 'Pending request not reached');
  assert.ok(await evaluate(`document.querySelector('button[aria-label="Cerrar solicitud"]').disabled`),'Pending dialog allowed dismissal');
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert.ok(await evaluate('Boolean(document.querySelector("dialog[open]"))'),'Pending Escape dismissed dialog');
  await evaluate('window.__marketplaceFixture.holdRequest=false;window.__marketplaceFixture.releaseRequest()');
  await until(async()=>(await body()).includes('No se pudo confirmar'),'Request failure missing');
  assert.doesNotMatch(await body(),/Solicitud guardada en Supabase/);
  assert.equal(await evaluate('window.__marketplaceFixture.requestInputs.length'),1,'Rapid taps issued duplicate writes');
  await fill('#request-note','Changed after uncertain response');
  await evaluate('document.querySelector("[role=dialog] form").requestSubmit()');
  assert.equal(await evaluate('window.__marketplaceFixture.requestInputs.length'),1,'Changed payload reused an uncertain id');
  await fill('#request-note','Repasar límites para la bimestral.');
  await evaluate('window.__marketplaceFixture.failRequest=false;document.querySelector("[role=dialog] form").requestSubmit()');
  await until(async()=>(await body()).includes('Solicitud guardada en Supabase'),'Request not acknowledged');
  assert.ok(await evaluate('window.__marketplaceFixture.requestInputs[0].id===window.__marketplaceFixture.requestInputs[1].id'),'Retry changed id');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await click('Mis Solicitudes');await until(async()=>(await body()).includes('Tutor conectado'),'Student request missing');
  await verifyWidths('student-requests');
  assert.equal(await evaluate(`document.querySelectorAll('a[href^="tel:"],a[href^="https://wa.me/"]').length`),0);
  await click('Salir');await until(async()=>(await body()).includes('Continuar con Google'),'Student logout missing');
  await login('tutor');await until(async()=>(await body()).includes('Estudiante conectado'),'Tutor did not receive request');
  await verifyWidths('teacher-requests');
  await click('Ver solicitud completa');await verifyWidths('teacher-request-detail');
  await click('Aceptar solicitud');await until(async()=>(await body()).includes('Estado de la solicitud guardado'),'Acceptance missing');
  await click('Salir');await until(async()=>(await body()).includes('Continuar con Google'),'Tutor logout missing');
  await login('student');await until(async()=>(await body()).includes('Buscar Tutores'),'Student restore missing');
  await until(async()=>await evaluate(`Boolean([...document.querySelectorAll('button')].find(node=>node.innerText==='Ver tutores'))`),'Restored search screen missing');
  await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(node=>node.innerText.includes('Virtual'));button.click();})()`);
  await click('Ver tutores');await until(async()=>await favoriteButton()==='true','Favorite lost across logout and login');
  await toggleFavorite();await until(async()=>await favoriteButton()==='false','Favorite removal not acknowledged');

  await click('Mis Solicitudes');await until(async()=>await evaluate(`Boolean(document.querySelector('a[href="tel:+573009999999"]'))`),'Accepted tutor contact missing');
  await screenshot('/tmp/tutorcucuta-marketplace-request.png');
  await click('Cancelar solicitud');await until(async()=>(await body()).includes('Cancelada'),'Cancellation missing');
  assert.equal(await evaluate(`document.querySelectorAll('a[href^="tel:"]').length`),0);
  assert.deepEqual(runtimeErrors,[]);
  console.log('PASS marketplace browser: favorite write/read failure, reload, focus sync, logout/login and removal; tutor publication, document failure/retry/private viewer, guardian block, request failure/retry, persisted participant flow and accepted contact. Controlled backend, not hosted delivery.');
} catch(error) {await captureFailure();throw error;} finally {
 socket?.close();chromium.kill('SIGTERM');vite.kill('SIGTERM');await pause(250);await rm(profile,{recursive:true,force:true});
}
