import type { GeoJSONSource, Map as LibreMap, MapMouseEvent, Marker } from 'maplibre-gl';
import type { DevicePosition, GeographicPosition, SearchOrigin } from '../domain/contracts';
import { getOriginPosition, isGeographicPosition, radiusToMeters } from '../domain/geography';
import { circleCoordinates } from '../domain/mapCircle';

export type MapLibreSdk = Pick<typeof import('maplibre-gl'), 'Map' | 'Marker' | 'AttributionControl'>;
export type MapLayer = 'streets' | 'dark';
export interface MapSnapshot {
  origin: SearchOrigin;
  radiusKm?: number;
  tutors: readonly { id: string; name: string; location?: GeographicPosition }[];
  selectedTutorId?: string;
  observation?: DevicePosition;
  observationIsCurrent?: boolean;
  reducedMotion?: boolean;
  onSelectTutor?: (id: string) => void;
  onSelectOrigin?: (position: GeographicPosition) => void;
}

export class MapRenderError extends Error {
  constructor(public readonly code: 'initialization' | 'network', message: string) {
    super(message);
    this.name = 'MapRenderError';
  }
}

interface ControllerOptions {
  origin: SearchOrigin;
  onReady: () => void;
  onError: (error: MapRenderError) => void;
  document?: Document;
  now?: () => number;
  requestFrame?: typeof requestAnimationFrame;
  cancelFrame?: typeof cancelAnimationFrame;
}
interface MarkerEntry {
  marker: Marker;
  element: HTMLElement;
  container: HTMLElement;
  position: [number, number];
  target: [number, number];
  frame?: number;
  removeClick?: () => void;
}

const MAP_STYLES: Record<MapLayer, string> = {
  streets: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};
const ANIMATION_MILLISECONDS = 200;
const STYLE_TIMEOUT_MILLISECONDS = 20000;
const coordinates = (position: GeographicPosition): [number, number] => [position.longitude, position.latitude];
const samePosition = (first: [number, number], second: [number, number]) => first[0] === second[0] && first[1] === second[1];

/** Adapter owning one real MapLibre map, geographic overlays and their complete lifecycle. */
export class MapLibreController {
  private readonly map: LibreMap;
  private readonly document: Document;
  private readonly now: () => number;
  private readonly requestFrame: typeof requestAnimationFrame;
  private readonly cancelFrame: typeof cancelAnimationFrame;
  private readonly tutorMarkers = new Map<string, MarkerEntry>();
  private snapshot: MapSnapshot;
  private radius?: number;
  private radiusTarget?: number;
  private radiusFrame?: number;
  private originMarker?: MarkerEntry;
  private deviceMarker?: MarkerEntry;
  private layer: MapLayer = 'streets';
  private styleReady = false;
  private disposed = false;
  private styleTimeout?: ReturnType<typeof setTimeout>;

  constructor(container: HTMLElement, private readonly sdk: MapLibreSdk, private readonly options: ControllerOptions) {
    this.document = options.document ?? document;
    this.now = options.now ?? (() => performance.now());
    this.requestFrame = options.requestFrame ?? ((callback) => window.requestAnimationFrame(callback));
    this.cancelFrame = options.cancelFrame ?? ((frame) => window.cancelAnimationFrame(frame));
    this.snapshot = { origin: options.origin, tutors: [] };
    this.map = new sdk.Map({
      container, style: MAP_STYLES.streets,
      center: coordinates(getOriginPosition(options.origin)), zoom: 11,
      minZoom: 3, maxZoom: 20, attributionControl: false,
      dragRotate: false, pitchWithRotate: false, maxPitch: 0,
      renderWorldCopies: false,
      locale: { 'AttributionControl.ToggleAttribution': 'Mostrar créditos del mapa' },
    });
    this.map.addControl(new sdk.AttributionControl({ compact: true }), 'bottom-right');
    this.map.on('click', (event: MapMouseEvent) => {
      const position = { latitude: event.lngLat.lat, longitude: event.lngLat.lng };
      if (isGeographicPosition(position)) this.snapshot.onSelectOrigin?.(position);
    });
    this.map.on('style.load', () => {
      if (this.disposed) return;
      clearTimeout(this.styleTimeout);
      this.styleReady = true;
      this.update(this.snapshot);
      options.onReady();
    });
    this.map.on('error', () => {
      if (!this.disposed) options.onError(new MapRenderError('network', 'No se pudo cargar la cartografía. Comprueba tu conexión e inténtalo de nuevo.'));
    });
    this.map.on('webglcontextlost', () => {
      if (!this.disposed) options.onError(new MapRenderError('initialization', 'El mapa perdió la conexión gráfica. Vuelve a cargarlo.'));
    });
    this.startStyleTimeout();
  }

  /** Update overlays in place; never pan the viewport merely because observations changed. */
  update(snapshot: MapSnapshot): void {
    if (this.disposed) return;
    this.snapshot = snapshot;
    if (!this.styleReady) return;
    this.updateOrigin();
    this.updateRadius();
    this.updateTutors();
    this.updateDevice();
  }

  zoom(delta: number): void { this.map.zoomTo(Math.max(3, Math.min(20, this.map.getZoom() + delta)), { duration: this.snapshot.reducedMotion ? 0 : 200 }); }
  center(position = getOriginPosition(this.snapshot.origin)): void {
    if (isGeographicPosition(position)) this.map.panTo(coordinates(position), { duration: this.snapshot.reducedMotion ? 0 : 300 });
  }
  resize(): void { if (!this.disposed) this.map.resize(); }

  /** Switch public vector styles and restore overlays after style.load, retaining the camera. */
  setLayer(layer: MapLayer): void {
    if (this.disposed || this.layer === layer) return;
    this.layer = layer;
    this.styleReady = false;
    this.startStyleTimeout();
    this.map.setStyle(MAP_STYLES[layer], { diff: false });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    clearTimeout(this.styleTimeout);
    if (this.radiusFrame !== undefined) this.cancelFrame(this.radiusFrame);
    this.tutorMarkers.forEach((entry) => this.removeMarker(entry));
    this.tutorMarkers.clear();
    if (this.originMarker) this.removeMarker(this.originMarker);
    if (this.deviceMarker) this.removeMarker(this.deviceMarker);
    this.map.remove();
  }

  private startStyleTimeout(): void {
    clearTimeout(this.styleTimeout);
    this.styleTimeout = setTimeout(() => {
      if (!this.disposed) this.options.onError(new MapRenderError('network', 'El mapa tardó demasiado en cargar. Vuelve a intentarlo.'));
    }, STYLE_TIMEOUT_MILLISECONDS);
  }

  private drawCircle(id: string, radius: number, center: GeographicPosition): void {
    if (!this.styleReady || this.disposed) return;
    const feature: GeoJSON.Feature<GeoJSON.Polygon> = {
      type: 'Feature', properties: { radiusMeters: radius, center: coordinates(center) },
      geometry: { type: 'Polygon', coordinates: [circleCoordinates(center, radius)] },
    };
    const source = this.map.getSource<GeoJSONSource>(id);
    if (source) { source.setData(feature); return; }
    const accuracy = id === 'device-accuracy';
    this.map.addSource(id, { type: 'geojson', data: feature });
    // Keep road/place labels legible above translucent geographic overlays.
    const firstLabel = this.map.getStyle().layers.find((layer) => layer.type === 'symbol')?.id;
    this.map.addLayer({ id: `${id}-fill`, type: 'fill', source: id,
      paint: { 'fill-color': accuracy ? '#3b82f6' : '#14b8a6', 'fill-opacity': accuracy ? 0.1 : 0.12 } }, firstLabel);
    this.map.addLayer({ id: `${id}-line`, type: 'line', source: id,
      paint: { 'line-color': accuracy ? '#2563eb' : '#0d9488', 'line-width': accuracy ? 1 : 2, 'line-opacity': accuracy ? 0.35 : 0.9 } }, firstLabel);
  }

  private removeCircle(id: string): void {
    for (const suffix of ['fill', 'line']) if (this.map.getLayer(`${id}-${suffix}`)) this.map.removeLayer(`${id}-${suffix}`);
    if (this.map.getSource(id)) this.map.removeSource(id);
  }

  private updateRadius(): void {
    const radius = this.snapshot.radiusKm;
    if (radius === undefined || !Number.isFinite(radius) || radius <= 0) {
      if (this.radiusFrame !== undefined) this.cancelFrame(this.radiusFrame);
      this.radiusFrame = undefined; this.radius = undefined; this.radiusTarget = undefined;
      this.removeCircle('search-radius');
      return;
    }
    const target = radiusToMeters(radius);
    this.radius ??= target;
    this.drawCircle('search-radius', this.radius, getOriginPosition(this.snapshot.origin));
    if (this.radiusTarget === target && !this.snapshot.reducedMotion) return;
    this.radiusTarget = target;
    if (this.radiusFrame !== undefined) this.cancelFrame(this.radiusFrame);
    this.radiusFrame = undefined;
    const initial = this.radius;
    if (this.snapshot.reducedMotion || initial === target) {
      this.radius = target;
      this.drawCircle('search-radius', target, getOriginPosition(this.snapshot.origin));
      return;
    }
    const started = this.now();
    const animate: FrameRequestCallback = (time) => {
      const progress = Math.min(1, Math.max(0, (time - started) / ANIMATION_MILLISECONDS));
      this.radius = progress === 1 ? target : initial + (target - initial) * (1 - (1 - progress) ** 3);
      this.drawCircle('search-radius', this.radius, getOriginPosition(this.snapshot.origin));
      this.radiusFrame = progress < 1 ? this.requestFrame(animate) : undefined;
    };
    this.radiusFrame = this.requestFrame(animate);
  }

  private createMarker(position: GeographicPosition, interactive = false): MarkerEntry {
    const container = this.document.createElement('div');
    const element = this.document.createElement(interactive ? 'button' : 'div');
    if (interactive) element.setAttribute('type', 'button');
    container.appendChild(element);
    const target = coordinates(position);
    const marker = new this.sdk.Marker({ element: container, anchor: 'center' }).setLngLat(target).addTo(this.map);
    return { marker, container, element, position: target, target };
  }

  private moveMarker(entry: MarkerEntry, position: GeographicPosition): void {
    const target = coordinates(position);
    if (samePosition(entry.target, target) && !this.snapshot.reducedMotion) return;
    entry.target = target;
    if (entry.frame !== undefined) this.cancelFrame(entry.frame);
    entry.frame = undefined;
    if (this.snapshot.reducedMotion || samePosition(entry.position, target)) { entry.position = target; entry.marker.setLngLat(target); return; }
    const initial = entry.position;
    const started = this.now();
    const animate: FrameRequestCallback = (time) => {
      const progress = Math.min(1, Math.max(0, (time - started) / ANIMATION_MILLISECONDS));
      const fraction = 1 - (1 - progress) ** 3;
      entry.position = progress === 1 ? target : [initial[0] + (target[0] - initial[0]) * fraction, initial[1] + (target[1] - initial[1]) * fraction];
      entry.marker.setLngLat(entry.position);
      entry.frame = progress < 1 ? this.requestFrame(animate) : undefined;
    };
    entry.frame = this.requestFrame(animate);
  }

  private removeMarker(entry: MarkerEntry): void {
    if (entry.frame !== undefined) this.cancelFrame(entry.frame);
    entry.removeClick?.();
    entry.marker.remove();
  }

  private updateOrigin(): void {
    if (this.snapshot.radiusKm === undefined) {
      if (this.originMarker) this.removeMarker(this.originMarker);
      this.originMarker = undefined;
      return;
    }
    const position = getOriginPosition(this.snapshot.origin);
    this.originMarker ??= this.createMarker(position);
    this.originMarker.container.title = this.snapshot.origin.kind === 'reference' ? 'Centro de referencia' : 'Centro de búsqueda';
    this.originMarker.element.className = 'rounded-full border-[3px] border-white bg-teal-700 w-4 h-4 shadow-md';
    this.originMarker.element.setAttribute('aria-label', this.originMarker.container.title);
    this.originMarker.container.style.zIndex = '5';
    this.moveMarker(this.originMarker, position);
  }

  private updateTutors(): void {
    const currentIds = new Set<string>();
    for (const tutor of this.snapshot.tutors) {
      if (!isGeographicPosition(tutor.location)) continue;
      currentIds.add(tutor.id);
      let entry = this.tutorMarkers.get(tutor.id);
      if (!entry) {
        entry = this.createMarker(tutor.location, true);
        const onClick = (event: Event) => { event.stopPropagation(); this.snapshot.onSelectTutor?.(tutor.id); };
        entry.element.addEventListener('click', onClick);
        entry.removeClick = () => entry!.element.removeEventListener('click', onClick);
        this.tutorMarkers.set(tutor.id, entry);
      }
      const selected = tutor.id === this.snapshot.selectedTutorId;
      entry.element.textContent = tutor.name.split(' ').slice(0, 2).join(' ');
      entry.element.setAttribute('aria-label', `Ver tutor ${tutor.name}`);
      entry.element.setAttribute('aria-pressed', String(selected));
      entry.element.className = `px-2.5 py-1.5 rounded-full border-2 shadow-md text-xs font-bold whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${selected ? 'bg-slate-900 text-white border-teal-400' : 'bg-white text-slate-900 border-white hover:border-teal-500'}`;
      entry.container.title = tutor.name;
      entry.container.style.zIndex = selected ? '20' : '10';
      this.moveMarker(entry, tutor.location);
    }
    for (const [id, entry] of this.tutorMarkers) if (!currentIds.has(id)) { this.removeMarker(entry); this.tutorMarkers.delete(id); }
  }

  private updateDevice(): void {
    const observation = this.snapshot.observation;
    if (!observation || !isGeographicPosition(observation.position) || !Number.isFinite(observation.accuracyMeters) || observation.accuracyMeters < 0) {
      if (this.deviceMarker) this.removeMarker(this.deviceMarker);
      this.deviceMarker = undefined;
      this.removeCircle('device-accuracy');
      return;
    }
    this.deviceMarker ??= this.createMarker(observation.position);
    const title = this.snapshot.observationIsCurrent === false ? 'Última ubicación observada' : 'Tu ubicación actual';
    this.deviceMarker.container.title = title;
    this.deviceMarker.element.className = 'w-5 h-5 rounded-full border-[3px] border-white bg-blue-600 shadow-md ring-4 ring-blue-500/20';
    this.deviceMarker.element.setAttribute('aria-label', `${title}, precisión aproximada ${Math.round(observation.accuracyMeters)} metros`);
    this.deviceMarker.container.style.zIndex = '30';
    this.moveMarker(this.deviceMarker, observation.position);
    this.drawCircle('device-accuracy', observation.accuracyMeters, observation.position);
  }
}
