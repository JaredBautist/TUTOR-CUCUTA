import assert from 'node:assert/strict';
import test from 'node:test';
import { MapLibreController, type MapLibreSdk, type MapSnapshot } from '../src/features/maps/infrastructure/mapLibreAdapter';

const origin = { kind: 'reference' as const, position: { latitude: 7.89, longitude: -72.5 }, label: 'Reference' };
function harness() {
  const maps: any[] = [];
  const markers: any[] = [];
  const frames = new Map<number, FrameRequestCallback>();
  const failures: string[] = [];
  let clock = 0;
  let sequence = 0;
  let ready = 0;
  class TestMap {
    options: any;
    sources = new Map<string, any>();
    layers = new Map<string, any>();
    listeners = new Map<string, (...args: any[]) => void>();
    removed = false;
    constructor(options: any) { this.options = options; maps.push(this); }
    on(event: string, listener: (...args: any[]) => void) { this.listeners.set(event, listener); return this; }
    fire(event: string, payload?: unknown) { this.listeners.get(event)?.(payload); }
    addControl() {}
    getSource(id: string) { return this.sources.get(id); }
    addSource(id: string, specification: any) { this.sources.set(id, { ...specification, updates: 0, setData(feature: any) { this.data = feature; this.updates++; } }); }
    removeSource(id: string) { this.sources.delete(id); }
    addLayer(layer: any) { this.layers.set(layer.id, layer); }
    getLayer(id: string) { return this.layers.get(id); }
    removeLayer(id: string) { this.layers.delete(id); }
    getStyle() { return { layers: [...this.layers.values()] }; }
    setStyle(style: string) { this.options.style = style; this.sources.clear(); this.layers.clear(); }
    getZoom() { return this.options.zoom; }
    zoomTo(zoom: number) { this.options.zoom = zoom; }
    panTo(center: unknown) { this.options.center = center; }
    resize() {}
    remove() { this.removed = true; this.listeners.clear(); this.sources.clear(); }
  }
  class TestMarker {
    map: unknown;
    position: any;
    element: any;
    constructor(options: any) { this.element = options.element; markers.push(this); }
    setLngLat(position: any) { this.position = position; return this; }
    addTo(map: unknown) { this.map = map; return this; }
    remove() { this.map = null; }
  }
  const document = { createElement() {
    const listeners = new Map<string, (event: Event) => void>();
    return { style: {}, children: [] as any[], title: '', textContent: '', className: '',
      appendChild(child: unknown) { this.children.push(child); }, setAttribute() {},
      addEventListener(event: string, listener: (event: Event) => void) { listeners.set(event, listener); },
      removeEventListener(event: string) { listeners.delete(event); },
      click() { listeners.get('click')?.(new Event('click')); },
    };
  } } as unknown as Document;
  const sdk = { Map: TestMap, Marker: TestMarker, AttributionControl: class {} } as unknown as MapLibreSdk;
  const controller = new MapLibreController({} as HTMLElement, sdk, {
    origin, document, now: () => clock,
    onReady: () => ready++, onError: (error) => failures.push(error.code),
    requestFrame: (callback) => { frames.set(++sequence, callback); return sequence; },
    cancelFrame: (id) => { frames.delete(id); },
  });
  const map = maps[0];
  map.fire('style.load');
  return { controller, map, maps, markers, frames, failures, ready: () => ready,
    tick(time: number) { clock = time; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach((callback) => callback(time)); },
    radius() { return map.getSource('search-radius')?.data.properties.radiusMeters; },
  };
}

test('MapLibre radius animation uses geographic meters, cancels older frames and keeps the camera', () => {
  const h = harness();
  h.controller.update({ origin, radiusKm: 3.5, tutors: [] });
  assert.equal(h.radius(), 3500);
  h.controller.update({ origin, radiusKm: 15, tutors: [] });
  h.tick(100);
  assert.ok(h.radius() > 3500 && h.radius() < 15000);
  h.controller.update({ origin, radiusKm: 1, tutors: [] });
  assert.equal(h.frames.size, 1);
  h.tick(400);
  assert.equal(h.radius(), 1000);
  assert.equal(h.maps.length, 1);
  assert.deepEqual(h.map.options.center, [-72.5, 7.89]);
  h.controller.dispose();
});

test('reduced motion snaps and radius-free views remove all search geometry', () => {
  const h = harness();
  h.controller.update({ origin, tutors: [], radiusKm: 2 });
  h.controller.update({ origin, tutors: [], radiusKm: 12, reducedMotion: true });
  assert.equal(h.radius(), 12000);
  assert.equal(h.frames.size, 0);
  h.controller.update({ origin, tutors: [] });
  assert.equal(h.map.sources.size, 0);
  assert.equal(h.map.layers.size, 0);
  h.controller.dispose();
  assert.equal(h.map.removed, true);
  assert.equal(h.map.listeners.size, 0);
});

test('received tutor updates reuse markers, select current callbacks and withdraw invalid points', () => {
  const h = harness();
  const tutor = { id: 'real', name: '<b>Ana</b>', location: origin.position };
  const clicks: string[] = [];
  h.controller.update({ origin, tutors: [tutor], onSelectTutor: (id) => clicks.push(`first:${id}`) });
  const marker = h.markers[0];
  marker.element.children[0].click();
  h.controller.update({ origin, tutors: [{ ...tutor, location: { latitude: 7.9, longitude: -72.51 } }], onSelectTutor: (id) => clicks.push(id) });
  h.tick(100);
  assert.ok(marker.position[1] > 7.89 && marker.position[1] < 7.9);
  h.tick(300);
  assert.deepEqual(marker.position, [-72.51, 7.9]);
  marker.element.children[0].click();
  assert.deepEqual(clicks, ['first:real', 'real']);
  assert.equal(marker.element.children[0].textContent, tutor.name);
  assert.equal(h.markers.length, 1);
  h.controller.update({ origin, tutors: [{ ...tutor, location: { latitude: NaN, longitude: 0 } }] });
  assert.equal(marker.map, null);
  marker.element.children[0].click();
  assert.equal(clicks.length, 2);
  h.controller.dispose();
});

test('style switching restores latest geometry, positions and camera without reconstructing the map', () => {
  const h = harness();
  const snapshot: MapSnapshot = { origin, radiusKm: 5, tutors: [{ id: 'real', name: 'Ana', location: origin.position }] };
  h.controller.update(snapshot);
  h.controller.center({ latitude: 7.92, longitude: -72.49 });
  h.controller.setLayer('dark');
  assert.match(h.map.options.style, /openfreemap.org\/styles\/dark$/);
  assert.equal(h.radius(), undefined);
  h.controller.update({ ...snapshot, radiusKm: 12, reducedMotion: true });
  h.map.fire('style.load');
  assert.equal(h.radius(), 12000);
  assert.equal(h.markers.length, 2);
  assert.deepEqual(h.map.options.center, [-72.49, 7.92]);
  assert.equal(h.maps.length, 1);
  assert.equal(h.ready(), 2);
  h.controller.dispose();
});

test('own observation is labeled as an approximate zone and disappears when stopped', () => {
  const h = harness();
  const observation = { position: origin.position, accuracyMeters: 37, observedAt: '2026-09-10T00:00:00Z' };
  h.controller.update({ origin, tutors: [], observation });
  assert.deepEqual(h.markers[0].position, [-72.5, 7.89]);
  assert.equal(h.map.getSource('device-accuracy').data.properties.radiusMeters, 37);
  h.controller.update({ origin, tutors: [], observation, observationIsCurrent: false });
  assert.equal(h.markers[0].element.title, 'Última zona aproximada');
  h.controller.update({ origin, tutors: [] });
  assert.equal(h.markers[0].map, null);
  assert.equal(h.map.getSource('device-accuracy'), undefined);
  h.controller.dispose();
});

test('origin changes require a map click; load errors are surfaced and disposal cancels animation', () => {
  const h = harness();
  const positions: unknown[] = [];
  h.controller.update({ origin, radiusKm: 5, tutors: [], onSelectOrigin: (position) => positions.push(position) });
  h.controller.zoom(1);
  assert.equal(h.map.options.zoom, 12);
  assert.deepEqual(positions, []);
  h.map.fire('click', { lngLat: { lng: -72.51, lat: 7.91 } });
  assert.deepEqual(positions, [{ longitude: -72.51, latitude: 7.91 }]);
  h.controller.update({ origin, radiusKm: 15, tutors: [] });
  h.map.fire('error', { error: new Error('offline') });
  assert.deepEqual(h.failures, ['network']);
  h.controller.dispose();
  assert.equal(h.frames.size, 0);
});
