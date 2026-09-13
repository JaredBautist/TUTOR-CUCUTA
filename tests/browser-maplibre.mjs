import { installAccountFixture } from './fixtures/auth-browser.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Real MapLibre SDK and OpenFreeMap cartography; device and database responses are
// controlled. Instrumentation is injected by this test only, never by production code.
const port = 4174;
const origin = `http://127.0.0.1:${port}`;
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const profile = await mkdtemp(join(tmpdir(), 'tutorcucuta-maplibre-browser-'));
const tutorIds = [
  '19a1b2c3-0000-4000-8000-000000000001',
  '19a1b2c3-0000-4000-8000-000000000002',
  '19a1b2c3-0000-4000-8000-000000000003',
];
const tutorNames = ['Tutor de prueba A', 'Tutora de prueba B', 'Tutor fuera del radio'];
const tutors = tutorIds.map((id, index) => ({
  id, profiles: { full_name: tutorNames[index], avatar_url: null },
  title: 'Docente', institution: '', experience_years: 2, rate_per_hour: 22000,
  verified: false, sector: 'Sector publicado', next_available: null,
  modalities: ['presencial'], subjects: ['Álgebra'], levels: [], specialties: [],
  bio: '', methodology_steps: [],
}));
let locations = tutorIds.map((tutor_id, index) => ({
  tutor_id, latitude: [7.895, 7.889, 8.050][index], longitude: [-72.506, -72.514, -72.500][index],
  precision: 'approximate', updated_at: '2026-09-10T12:00:00.000Z',
}));
const requestLog = [];
const runtimeErrors = [];
const interceptionErrors = [];
const mapResponses = [];
const googleRequests = [];
const browserMessages = [];
let captureFailure;
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    VITE_SUPABASE_URL: 'https://catalog.invalid',
    VITE_SUPABASE_ANON_KEY: 'isolated-browser-test-key-only',
  },
});
let viteLog = '';
vite.stdout.on('data', (chunk) => { viteLog += chunk.toString(); });
vite.stderr.on('data', (chunk) => { viteLog += chunk.toString(); });
const chromium = spawn('chromium', [
  '--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--no-sandbox',
  '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
let browserLog = '';
chromium.stderr.on('data', (chunk) => { browserLog += chunk.toString(); });
let socket;
let diagnostics;

async function until(check, description) {
  for (let attempt = 0; attempt < 200; attempt++) {
    try {
      const result = await check();
      if (result) return result;
    } catch (error) {
      // Reload can destroy a CDP evaluation context between two awaited calls.
      if (!/Inspected target navigated|Cannot find context|Execution context was destroyed/.test(error.message)) throw error;
    }
    await pause(75);
  }
  throw new Error(description);
}

/** Install controllable device observations and a Phoenix transport in this test page only. */
function installBrowserFakes({ mockLocation = true } = {}) {
  localStorage.clear();
  const watchers = new Map();
  let watcherSequence = 0;
  const harness = window.__mapBrowserHarness = {
    watcherStarts: 0, watcherStops: 0, sockets: [],
    get activeWatchers() { return watchers.size; },
    emitPosition(latitude, longitude, accuracy = 18) {
      const pending=[...watchers.values()];watchers.clear();
      for (const { success } of pending) success({
        coords: { latitude, longitude, accuracy, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
        timestamp: Date.now(),
      });
    },
    emitError(code = 1) {
      const pending=[...watchers.values()];watchers.clear();
      for (const { error } of pending) error({ code, message: 'Controlled positioning failure' });
    },
    invalidateLocations() {
      for (const socket of this.sockets) {
        for (const channel of socket.channels.values()) socket.deliver([
          channel.joinRef, null, channel.topic, 'postgres_changes', {
            ids: channel.filters.map((filter) => filter.id),
            data: { schema: 'public', table: 'tutor_offer_locations', type: 'UPDATE',
              commit_timestamp: new Date().toISOString(), columns: [], record: {}, old_record: {} },
          },
        ]);
      }
    },
  };
  if (mockLocation) Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
    watchPosition() { throw new Error('Continuous GPS is outside the project scope'); },
    clearWatch() { throw new Error('Single observations have no native watch to clear'); },
    getCurrentPosition(success,error) {const id=++watcherSequence;watchers.set(id,{success,error});harness.watcherStarts++;},
  } });

  const NativeWebSocket = window.WebSocket;
  class ControlledRealtimeSocket extends EventTarget {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    constructor(url) {
      super();
      this.url = String(url);
      this.readyState = 0;
      this.channels = new Map();
      harness.sockets.push(this);
      setTimeout(() => {
        if (this.readyState !== 0) return;
        this.readyState = 1;
        const event = new Event('open');
        this.onopen?.(event);
        this.dispatchEvent(event);
      }, 10);
    }
    deliver(frame) {
      if (this.readyState !== 1) return;
      const event = new MessageEvent('message', { data: JSON.stringify(frame) });
      this.onmessage?.(event);
      this.dispatchEvent(event);
    }
    send(message) {
      const [joinRef, ref, topic, event, payload] = JSON.parse(message);
      if (event === 'phx_join') {
        const filters = (payload.config?.postgres_changes ?? []).map((filter, index) => ({ ...filter, id: index + 1 }));
        this.channels.set(topic, { joinRef, topic, filters });
        setTimeout(() => this.deliver([joinRef, ref, topic, 'phx_reply', {
          status: 'ok', response: { postgres_changes: filters },
        }]), 10);
      } else if (event === 'heartbeat' || event === 'phx_leave') {
        if (event === 'phx_leave') this.channels.delete(topic);
        setTimeout(() => this.deliver([joinRef, ref, topic, 'phx_reply', { status: 'ok', response: {} }]), 0);
      }
    }
    close(code = 1000) {
      if (this.readyState === 3) return;
      this.readyState = 3;
      this.channels.clear();
      const event = new CloseEvent('close', { code, wasClean: true });
      this.onclose?.(event);
      this.dispatchEvent(event);
    }
  }
  window.WebSocket = class extends NativeWebSocket {
    constructor(url, protocols) {
      if (String(url).includes('catalog.invalid/realtime/')) return new ControlledRealtimeSocket(url);
      super(url, protocols);
    }
  };
}

try {
  await until(async () => {
    if (vite.exitCode !== null) throw new Error(`Isolated Vite exited: ${viteLog}`);
    try { return (await fetch(origin)).ok; } catch { return false; }
  }, 'Isolated Vite did not start');
  const debugAddress = await until(() => browserLog.match(/ws:\/\/127\.0\.0\.1:\d+/)?.[0], 'Chromium did not start');
  const targets = await (await fetch(debugAddress.replace('ws:', 'http:') + '/json/list')).json();
  socket = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
  let sequence = 0;
  const pending = new Map();
  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const callbacks = pending.get(message.id);
      if (!callbacks) return;
      pending.delete(message.id);
      if (message.error) callbacks.reject(new Error(message.error.message));
      else callbacks.resolve(message.result);
    } else if (message.method === 'Network.requestWillBeSent') {
      if (/maps\.googleapis|maps\.gstatic/.test(message.params.request.url)) googleRequests.push(message.params.request.url);
    } else if (message.method === 'Network.responseReceived') {
      const response = message.params.response;
      if (response.url.includes('openfreemap.org')) mapResponses.push({ url: response.url, status: response.status });
    } else if (message.method === 'Runtime.consoleAPICalled') {
      browserMessages.push(message.params.args.map(arg => arg.value ?? arg.description).join(' '));
    } else if (message.method === 'Log.entryAdded') {
      browserMessages.push(message.params.entry.text);
    } else if (message.method === 'Runtime.exceptionThrown') {
      runtimeErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    } else if (message.method === 'Fetch.requestPaused') {
      void (async () => {
        const { requestId, request } = message.params;
        const url = new URL(request.url);
        requestLog.push({ method: request.method, pathname: url.pathname });
        let content;
        let contentType;
        if (url.pathname.endsWith('/mapLibreAdapter.ts')) {
          const source = await (await fetch(request.url)).text();
          content = source.replace('this.map.addControl(', '(window.__mapLibreTestMaps ??= []).push(this.map); this.map.on("remove", () => { this.map.__testRemoved = true; }); this.map.addControl(')
            .replace('return { marker, container, element, position: target, target };', '(window.__mapLibreTestMarkers ??= []).push({ marker, container, map: this.map }); return { marker, container, element, position: target, target };');
          assert.notEqual(content, source, 'Real map instrumentation must be applied');
          contentType = 'text/javascript';
        } else if (request.method === 'OPTIONS') {
          content = '';
          contentType = 'application/json';
        } else {
          assert.equal(request.method, 'GET', 'Browser map checks must perform no remote writes');
          assert.ok(['/rest/v1/tutor_offers', '/rest/v1/tutor_offer_locations', '/rest/v1/student_favorites'].includes(url.pathname), `Unexpected catalog endpoint ${url.pathname}`);
          content = JSON.stringify(url.pathname.endsWith('/student_favorites') ? [] : url.pathname.endsWith('/tutor_offer_locations') ? locations : tutors.map(row=>({listing:{id:row.id,name:row.profiles.full_name,avatar:'',title:row.title,institution:row.institution,experienceYears:row.experience_years,ratePerHour:row.rate_per_hour,sector:row.sector,nextAvailable:'',modalities:row.modalities,subjects:row.subjects,levels:row.levels,specialties:[],bio:'',methodologySteps:[],matchReasons:[],verified:false,availability:[],coverageRadiusKm:15}})));
          contentType = 'application/json';
        }
        await cdp('Fetch.fulfillRequest', {
          requestId, responseCode: 200,
          responseHeaders: [
            { name: 'Content-Type', value: contentType },
            { name: 'Access-Control-Allow-Origin', value: '*' },
            { name: 'Access-Control-Allow-Headers', value: '*' },
            { name: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          ], body: Buffer.from(content).toString('base64'),
        });
      })().catch((error) => interceptionErrors.push(error.message));
    }
  });
  const evaluate = async (expression) => {
    const reply = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.exception?.description ?? reply.exceptionDetails.text);
    return reply.result.value;
  };
  const body = () => evaluate('document.body?.innerText ?? ""');
  const click = async (label, byAria = false) => {
    const clicked = await evaluate(`(() => {
      const button = [...document.querySelectorAll('button')].find(element => element.getBoundingClientRect().width &&
        (${byAria ? 'element.getAttribute("aria-label")' : 'element.innerText.trim()'} === ${JSON.stringify(label)}));
      if (!button) return false; button.click(); return true;
    })()`);
    assert.ok(clicked, `Visible ${byAria ? 'named ' : ''}button missing: ${label}`);
    await pause(80);
    await until(async () => !(await body()).includes('Cargando vista…'), 'Screen module did not load');
  };
  const clickContaining = async (label) => {
    assert.ok(await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(element => element.getBoundingClientRect().width && element.innerText.includes(${JSON.stringify(label)})); if (!button) return false; button.click(); return true; })()`), `Visible button containing '${label}' missing`);
    await pause(80);
    await until(async () => !(await body()).includes('Cargando vista…'), 'Screen module did not load');
  };
  const rangeSelector = 'input[type="range"][step="0.5"]';
  const setRadius = async (radius) => evaluate(`(() => {
    const input = [...document.querySelectorAll(${JSON.stringify(rangeSelector)})].find(element => element.getBoundingClientRect().width);
    if (!input) throw new Error('Visible radius slider missing');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${radius});
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  const mapState = () => evaluate(`(() => {
    const maps = window.__mapLibreTestMaps;
    if (!maps) return null;
    const active = maps.filter(map => !map.__testRemoved && map.getContainer().isConnected);
    const circles = active.flatMap(map => ['search-radius', 'device-accuracy'].flatMap(id => {
      const feature = map.getSource(id)?.serialize().data;
      if (!feature?.properties) return [];
      return [{ radius: feature.properties.radiusMeters, center: { lng: feature.properties.center[0], lat: feature.properties.center[1] } }];
    }));
    return {
      mapCount: maps.length, circles,
      markers: (window.__mapLibreTestMarkers ?? []).filter(entry => entry.container.isConnected && !entry.map.__testRemoved).map(entry => ({
        title: entry.container.title, position: entry.marker.getLngLat(), zIndex: Number(entry.container.style.zIndex),
      })),
    };
  })()`);
  diagnostics = async () => ({
    screen: (await body()).slice(0, 1800),
    map: await mapState(),
    activeWatchers: await evaluate('window.__mapBrowserHarness?.activeWatchers'),
    locationReads: requestLog.filter((request) => request.pathname === '/rest/v1/tutor_offer_locations').length,
    tiles: mapResponses.slice(-8),
    rendering: await evaluate('window.__mapLibreTestMaps?.filter(map => !map.__testRemoved).map(map => ({ removed: map.__testRemoved, loaded: map.loaded(), style: map.isStyleLoaded(), tiles: map.areTilesLoaded(), dirty: map._sourcesDirty, canvas: [map.getCanvas().width, map.getCanvas().height], bounds: map.getBounds(), sources: Object.fromEntries(Object.entries(map.style.tileManagers).map(([id, cache]) => [id, {loaded:cache.loaded(), tiles: Object.values(cache._tiles ?? {}).map(tile => ({state:tile.state, id:tile.tileID.key}))}])) }))'),
  });
  const radiusSettles = (meters) => until(async () => (await mapState())?.circles.some((circle) => circle.radius === meters), `Circle did not settle at ${meters} meters`);
  const activeWatchers = () => evaluate('window.__mapBrowserHarness.activeWatchers');
  const checkOverflow = async () => assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Horizontal viewport overflow');
  const screenshot = async (filename) => {
    const capture = await cdp('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(tmpdir(), filename), Buffer.from(capture.data, 'base64'));
  };

  captureFailure = () => screenshot('tutorcucuta-maplibre-failure.png');
  await cdp('Log.enable');
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Network.enable');
  await cdp('Fetch.enable', { patterns: [
    { urlPattern: '*src/features/maps/infrastructure/mapLibreAdapter.ts*', requestStage: 'Request' },
    { urlPattern: 'https://catalog.invalid/*', requestStage: 'Request' },
  ] });
  const fakeScript = await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `(${installBrowserFakes.toString()})(); (${installAccountFixture.toString()})()` });
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: origin });
  await until(async () => (await body()).includes('Ver tutores'), 'Search did not render');
  await radiusSettles(5000);
  await until(async () => (await activeWatchers()) === 1, 'Visible maps must automatically request native geolocation');
  const initialMapCount = (await mapState()).mapCount;
  assert.ok(await evaluate('window.__mapLibreTestMaps.some(map => !map.__testRemoved && map.getContainer().getBoundingClientRect().height > 200)'), 'MapLibre canvas must fill the existing map height');
  await until(async () => await evaluate('window.__mapLibreTestMaps.some(map => !map.__testRemoved && map.loaded())'), 'Real cartography did not finish loading');
  // Vector requests run in the real worker, outside this page's CDP Network target.
  assert.ok(await evaluate('window.__mapLibreTestMaps.some(map => !map.__testRemoved && map.queryRenderedFeatures().some(feature => feature.source === "openmaptiles"))'), 'Real vector tiles must render geographic features');
  assert.ok(await evaluate('document.querySelector(".maplibregl-ctrl-attrib")?.textContent.includes("OpenStreetMap")'), 'Required attribution must remain present');
  const streetBackground = await evaluate('JSON.stringify(window.__mapLibreTestMaps.find(map => !map.__testRemoved).getStyle().layers.find(layer => layer.type === "background").paint)');
  await click('Cambiar a mapa oscuro', true);
  await until(async () => await evaluate(`window.__mapLibreTestMaps.some(map => !map.__testRemoved && map.loaded() && JSON.stringify(map.getStyle().layers.find(layer => layer.type === "background").paint) !== ${JSON.stringify(streetBackground)})`), 'Dark cartography did not load');
  await radiusSettles(5000);
  await click('Cambiar a mapa de calles', true);
  await radiusSettles(5000);
  await click('Acercar mapa', true);
  await pause(300);
  await click('Alejar mapa', true);
  await pause(300);
  await setRadius(12);
  await radiusSettles(12000);
  await evaluate(`document.querySelector(${JSON.stringify(rangeSelector)}).focus()`);
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
  await radiusSettles(11500);
  for (const radius of [1, 15, 4, 8]) await setRadius(radius);
  await radiusSettles(8000);
  assert.equal((await mapState()).mapCount, initialMapCount, 'Slider changes must reuse the map');
  await click('Limpiar filtros');
  await radiusSettles(5000);
  console.log('PASS real MapLibre/OpenFreeMap: radius meters, keyboard, rapid updates, reset and map reuse');
  await screenshot('tutorcucuta-maplibre-controlled-desktop.png');

  const firstPosition = { latitude: 7.896234, longitude: -72.509876 };
  await until(async () => (await activeWatchers()) === 1, 'Device watcher did not start');
  await evaluate(`window.__mapBrowserHarness.emitPosition(${firstPosition.latitude}, ${firstPosition.longitude}, 18)`);
  await until(async () => (await mapState()).markers.some((marker) => marker.title === 'Tu ubicación actual'), 'Own-position marker missing');
  await until(async () => await evaluate('window.__mapLibreTestMaps.some(map => !map.__testRemoved && Math.abs(map.getCenter().lat - 7.896234) < 0.00001 && Math.abs(map.getCenter().lng + 72.509876) < 0.00001)'), 'The first device fix must automatically center the actual map');
  assert.ok((await mapState()).circles.some((circle) => circle.radius === 18), 'Observed accuracy circle missing');
  await setRadius(2.5);
  await radiusSettles(2500);
  await click('Ver tutores');
  await until(async () => (await body()).includes(tutorNames[0]) && (await body()).includes(tutorNames[1]), 'Published tutors missing in Results');
  await until(async () => (await mapState())?.markers.some((marker) => marker.title === tutorNames[1]), 'Published tutor markers did not load');
  assert.doesNotMatch(await body(), new RegExp(tutorNames[2]), 'Applied radius must exclude the distant in-person tutor card');
  const appliedCircle = (await mapState()).circles.find((circle) => circle.radius === 2500);
  assert.deepEqual(appliedCircle.center, { lat: firstPosition.latitude, lng: firstPosition.longitude }, 'Results must preserve the applied device search origin');
  assert.equal(await activeWatchers(), 1, 'Results requests one new observation after the completed Search observation');
  await click(`Ver tutor ${tutorNames[1]}`, true);
  assert.ok(await evaluate(`(() => { const heading = [...document.querySelectorAll('h2')].find(element => element.innerText === ${JSON.stringify(tutorNames[1])}); return heading?.closest('[class*="cursor-pointer"]')?.classList.contains('border-teal-600'); })()`), 'Marker selection must select the matching tutor card');
  await until(async () => (await activeWatchers()) === 1, 'Results device watcher did not start');
  await evaluate('window.__mapBrowserHarness.emitPosition(7.920345, -72.490123, 25)');
  await until(async () => (await mapState()).markers.some((marker) => marker.title === 'Tu ubicación actual' && marker.position.lat === 7.920345), 'Results own marker did not update');
  assert.deepEqual((await mapState()).circles.find((circle) => circle.radius === 2500).center, appliedCircle.center, 'Later observations must not shift the applied search circle');
  assert.ok(await evaluate(`!Object.values(localStorage).some(value => value.includes('7.896234') || value.includes('-72.509876') || value.includes('7.920345'))`), 'Exact observations must not enter browser persistence');

  const initialLocationReads = requestLog.filter((request) => request.pathname === '/rest/v1/tutor_offer_locations').length;
  locations = locations.map((location) => location.tutor_id === tutorIds[1] ? { ...location, latitude: 7.890, updated_at: '2026-09-10T12:01:00.000Z' } : location);
  await evaluate('window.__mapBrowserHarness.invalidateLocations()');
  await until(async () => (await mapState()).markers.some((marker) => marker.title === tutorNames[1] && marker.position.lat === 7.890), 'Published-location change did not update its marker');
  assert.ok(requestLog.filter((request) => request.pathname === '/rest/v1/tutor_offer_locations').length > initialLocationReads, 'Feed invalidation must refresh its authorized snapshot');
  const resultsMapCount = (await mapState()).mapCount;
  const addedTutor = { ...tutors[0], id: '19a1b2c3-0000-4000-8000-000000000004', profiles: { full_name: 'Nueva docente publicada', avatar_url: null } };
  tutors.push(addedTutor);
  locations.push({ ...locations[0], tutor_id: addedTutor.id, latitude: 7.896 });
  await evaluate('window.__mapBrowserHarness.invalidateLocations()');
  await until(async () => (await mapState())?.markers.some((marker) => marker.title === addedTutor.profiles.full_name), 'A newly published tutor must appear without reloading the page');
  locations = locations.filter((location) => location.tutor_id !== addedTutor.id);
  await evaluate('window.__mapBrowserHarness.invalidateLocations()');
  await until(async () => !(await mapState())?.markers.some((marker) => marker.title === addedTutor.profiles.full_name), 'Withdrawing a teaching point must remove its marker');
  assert.doesNotMatch(await body(), new RegExp(addedTutor.profiles.full_name), 'Unlocated in-person tutor must leave applied results');
  assert.equal((await mapState()).mapCount, resultsMapCount, 'Feed updates must preserve the active map');
  console.log('PASS controlled feed/device: real-coordinate fixtures, radius filtering, card selection, snapshot stability and feed update');

  await click('Mi Perfil');
  await until(async () => (await mapState())?.markers !== undefined && (await body()).includes('Guardar'), 'Student profile did not render');
  await until(async () => (await activeWatchers()) === 1, 'Profile must replace Results tracking with one watcher');
  await until(async () => (await activeWatchers()) === 1, 'Profile own-location watcher did not start');
  await evaluate('window.__mapBrowserHarness.emitPosition(7.897321, -72.510123, 12)');
  await until(async () => (await mapState()).markers.some((marker) => marker.title === 'Tu ubicación actual' && marker.position.lat === 7.897321), 'Own profile position not displayed');
  assert.deepEqual((await mapState()).circles.map((circle) => circle.radius), [12], 'Profile must show accuracy without inventing a search radius');
  await click('Detener ubicación', true);
  await until(async () => (await activeWatchers()) === 0, 'Stop location did not release watcher');
  await click('Salir');
  await click('Soy tutor');
  await evaluate(`(() => { const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; for(const [type,value] of [['email','tutor@example.invalid'],['password','test-password']]) { const input=document.querySelector('input[type='+type+']'); setter.call(input,value); input.dispatchEvent(new Event('input',{bubbles:true})); } })()`);
  await click('Entrar');
  await radiusSettles(5000);
  await setRadius(12);
  await radiusSettles(12000);
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(rangeSelector)}).max`), '12');
  await click('Mi Perfil Docente');
  await radiusSettles(5000);
  await setRadius(15);
  await radiusSettles(15000);
  assert.ok(await evaluate('[...document.querySelectorAll("button")].some(button => !button.disabled && /Guardar/.test(button.innerText))'), 'Authenticated teacher can save their private profile');
  await checkOverflow();
  console.log('PASS profile and teacher maps: local own position, watcher stop, no invented profile radius and existing teacher bounds');

  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cdp('Page.reload');
  await until(async () => (await body()).includes('Formulario de búsqueda'), 'Mobile search did not render');
  await clickContaining('Mapa de cobertura');
  await radiusSettles(5000);
  await until(async () => (await activeWatchers()) === 1, 'Mobile map watcher did not start');
  await evaluate('window.__mapBrowserHarness.emitPosition(7.897321, -72.510123, 12)');
  await click('Formulario de búsqueda');
  await until(async () => (await activeWatchers()) === 0, 'CSS-hidden mobile map must pause the watcher');
  await checkOverflow();
  await clickContaining('Mapa de cobertura');
  await until(async () => (await activeWatchers()) === 1, 'Returning to the active map must resume consented tracking');
  await click('Detener ubicación', true);
  await click('Ver tutores');
  await click('Ver mapa interactivo');
  await checkOverflow();
  assert.deepEqual(googleRequests, [], 'No Google Maps requests are allowed');
  await screenshot('tutorcucuta-maplibre-controlled-mobile.png');
  console.log('PASS mobile: map/form visibility pauses and resumes geolocation, no horizontal overflow');

  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await cdp('Page.reload');
  await until(async () => (await body()).includes('¿Qué necesitas reforzar?'), 'Fresh desktop search did not render after reload');
  await radiusSettles(5000);
  await setRadius(11);
  await radiusSettles(11000);
  assert.ok(await evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches'), 'Reduced-motion browser preference must be enabled');
  await until(async () => (await activeWatchers()) === 1, 'Permission error scenario did not start');
  await evaluate('window.__mapBrowserHarness.emitError(1)');
  await until(async () => (await activeWatchers()) === 0, 'Denied location must release the watcher');
  assert.ok((await mapState()).markers.every((marker) => marker.title !== 'Tu ubicación actual'), 'Denied permission must not fabricate own position');
  await setRadius(9);
  await radiusSettles(9000);
  assert.equal(await activeWatchers(), 0, 'Denied permission must not automatically retry on render');
  await click('Usar mi ubicación', true);
  await until(async () => (await activeWatchers()) === 1, 'Explicit retry after denial must remain available');
  await click('Detener ubicación', true);
  await checkOverflow();
  assert.deepEqual(interceptionErrors, []);
  assert.deepEqual(runtimeErrors, []);
  assert.deepEqual(googleRequests, []);
  console.log('PASS reduced motion, denied geolocation, no Google requests and no uncaught browser exceptions');

  // Exercise the browser's native permission/geolocation API, with only sensor
  // coordinates emulated through CDP. No geolocation JavaScript replacement.
  await cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: fakeScript.identifier });
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `(${installBrowserFakes.toString()})({ mockLocation: false }); (${installAccountFixture.toString()})()` });
  await cdp('Browser.setPermission', { permission: { name: 'geolocation' }, setting: 'denied', origin });
  await cdp('Emulation.setGeolocationOverride', { latitude: 7.901234, longitude: -72.511234, accuracy: 14 });
  await cdp('Page.reload');
  await radiusSettles(5000);
  await until(async () => (await body()).includes('Permiso de ubicación denegado'), 'Automatic native geolocation must report browser denial');
  assert.equal(await evaluate('navigator.permissions.query({ name: "geolocation" }).then(permission => permission.state)'), 'denied');
  assert.ok((await mapState()).markers.every(marker => marker.title !== 'Tu ubicación actual'), 'No location before native permission');
  await cdp('Browser.grantPermissions', { origin, permissions: ['geolocation'] });
  await cdp('Page.reload');
  await until(async () => (await body()).includes('Tu ubicación · precisión'), 'A new visible map must automatically use a granted native permission');
  await until(async () => (await mapState()).markers.some(marker => marker.title === 'Tu ubicación actual' && Math.abs(marker.position.lat - 7.901234) < 0.00001), 'Granting native permission must show the device observation');
  await until(async () => await evaluate('window.__mapLibreTestMaps.some(map => !map.__testRemoved && Math.abs(map.getCenter().lat - 7.901234) < 0.00001)'), 'Native positioning must center the map');
  await click('Detener ubicación', true);
  assert.deepEqual(runtimeErrors, []);
  console.log('PASS native browser permission: automatic denial state, no unauthorized position, automatic observed position and centering with granted permission');

} catch (error) {
  await captureFailure?.();
  console.error('Browser messages:', browserMessages.slice(-15));
  if (interceptionErrors.length) console.error('Interception errors:', interceptionErrors);
  if (runtimeErrors.length) console.error('Browser exceptions:', runtimeErrors);
  if (diagnostics) console.error('Browser state:', JSON.stringify(await diagnostics()));
  throw error;
} finally {
  socket?.close();
  chromium.kill('SIGTERM');
  vite.kill('SIGTERM');
  await pause(350);
  await rm(profile, { recursive: true, force: true, maxRetries: 3 });
}
