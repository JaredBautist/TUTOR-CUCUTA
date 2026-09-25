import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Compass, Layers, LocateFixed, LocateOff, MapPin, LoaderCircle } from 'lucide-react';
import type { Tutor } from '../../types';
import { isDemoTutorId } from '../../utils/demoRecords';
import type { LocationFeedStatus, SearchOrigin } from '../../features/maps/domain/contracts';
import { approximateGeographicPosition, CUCUTA_REFERENCE_ORIGIN, getOriginPosition, isGeographicPosition } from '../../features/maps/domain/geography';
import { useDeviceLocation } from '../../features/maps/application/useDeviceLocation';
import { useMapVisibility } from '../../features/maps/application/useMapVisibility';
import { useMapLibre } from '../../features/maps/application/useMapLibre';

export interface UnifiedMapProps {
  mode?: 'search' | 'results' | 'student-profile' | 'profile-route' | 'teacher-dashboard' | 'teacher-request' | 'teacher-profile-edit';
  radiusKm?: number;
  selectedTutorId?: string;
  onSelectTutor?: (id: string) => void;
  origin?: SearchOrigin;
  onOriginChange?: (origin: SearchOrigin) => void;
  locationFeedStatus?: LocationFeedStatus;
  onRetryLocations?: () => void;
  className?: string;
  height?: string;
  studentName?: string;
  studentSector?: string;
  tutors?: Tutor[];
}

const feedLabels: Record<LocationFeedStatus, string> = {
  connecting: 'Conectando ubicaciones', connected: 'Ubicaciones publicadas · conectadas',
  reconnecting: 'Reconectando ubicaciones', unavailable: 'Ubicaciones sin conexión',
};

/** Preserve existing map placements while binding the open map engine to explicit geographic state. */
export const UnifiedCucutaMap: React.FC<UnifiedMapProps> = ({
  mode = 'search', radiusKm, selectedTutorId = '', onSelectTutor, origin, onOriginChange,
  locationFeedStatus, onRetryLocations, className = '', height = 'h-[300px] sm:h-[380px]', tutors = [],
}) => {
  const wrapper = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const active = useMapVisibility(wrapper);
  const device = useDeviceLocation(active);
  const [localOrigin, setLocalOrigin] = useState<SearchOrigin>();
  const [mapLayer, setMapLayer] = useState<'streets' | 'dark'>('streets');
  const [reducedMotion, setReducedMotion] = useState(false);
  const locatedTutors = tutors.filter((tutor) => !isDemoTutorId(tutor.id) && isGeographicPosition(tutor.location));
  const tutorOrigin: SearchOrigin | undefined = mode === 'profile-route' && locatedTutors[0]
    ? { kind: 'selected', position: locatedTutors[0].location!, label: 'Ubicación publicada del docente' } : undefined;
  const effectiveOrigin = origin ?? localOrigin ?? tutorOrigin ?? CUCUTA_REFERENCE_ORIGIN;
  const onOriginChangeRef = useRef(onOriginChange);
  onOriginChangeRef.current = onOriginChange;
  const hasExternalOrigin = useRef(Boolean(origin));
  hasExternalOrigin.current = Boolean(origin);
  const firstDeviceFix = useRef(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(media.matches);
    const update = () => setReducedMotion(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const map = useMapLibre(canvas, {
    origin: effectiveOrigin, radiusKm, tutors: locatedTutors, selectedTutorId,
    observation: device.isEnabled ? device.observation : undefined,
    observationIsCurrent: device.status === 'tracking',
    reducedMotion, onSelectTutor,
    onSelectOrigin: onOriginChange ? (position) => {
      device.stop();
      onOriginChange({ kind: 'selected', position: approximateGeographicPosition(position), label: 'Zona aproximada seleccionada' });
    } : undefined,
  }, active);

  useEffect(() => {
    if (!device.isEnabled) { firstDeviceFix.current = false; return; }
    if (!device.observation || device.status !== 'tracking') return;
    if (mode !== 'results' && mode !== 'profile-route' && mode !== 'teacher-request') {
      const observedOrigin: SearchOrigin = { kind: 'device', observation: device.observation };
      if (onOriginChangeRef.current) onOriginChangeRef.current(observedOrigin);
      else if (!hasExternalOrigin.current) setLocalOrigin(observedOrigin);
    }
    if (!firstDeviceFix.current && map.controller.current) {
      map.controller.current.center(device.observation.position);
      firstDeviceFix.current = true;
    }
  }, [device.observation, device.isEnabled, device.status, map.state, mode]);

  useEffect(() => { map.controller.current?.setLayer(mapLayer); }, [mapLayer, map.state]);
  useEffect(() => { if (map.state === 'error') device.stop(); }, [map.state, device.stop]);

  const positionLabels = {
    idle: '', requesting: 'Buscando una zona aproximada…', tracking: device.observation ? `Zona aproximada · margen ±${Math.round(device.observation.accuracyMeters)} m` : '',
    paused: 'Ubicación pausada', denied: 'Permiso de ubicación denegado', unavailable: 'Ubicación no disponible', timeout: 'La ubicación tardó demasiado', stale: 'Última zona aproximada · pendiente de actualizar',
  };
  const locationLabel = positionLabels[device.status];
  const contextLabel = effectiveOrigin.kind === 'reference' ? 'Cúcuta AMC · Vista de referencia'
    : effectiveOrigin.kind === 'device' ? 'Centro: zona aproximada' : effectiveOrigin.label;
  const disabled = map.state !== 'ready';
  const controlClass = 'w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-teal-600';

  return (
    <div ref={wrapper} data-map-mode={mode} className={`relative w-full rounded-2xl overflow-hidden border border-slate-200/90 shadow-md bg-[#eef4f2] select-none flex flex-col ${height} ${className}`}>
      <div className="relative w-full flex-1 min-h-0">
        <div ref={canvas} aria-label="Mapa interactivo de Cúcuta" style={{ position: 'absolute', inset: 0 }} />

        {map.state !== 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#eef4f2] px-8 text-center">
            <div className="max-w-xs" role={map.error ? 'alert' : 'status'}>
              {map.error ? <MapPin className="w-8 h-8 mx-auto mb-3 text-teal-700" /> : <LoaderCircle className="w-7 h-7 mx-auto mb-3 text-teal-700 motion-safe:animate-spin" />}
              <p className="text-sm font-semibold text-slate-800">{map.error?.message ?? 'Cargando OpenFreeMap…'}</p>
              {map.error && <button type="button" onClick={map.retry} className="mt-3 rounded-lg bg-white border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-teal-600 focus-visible:outline-2 focus-visible:outline-teal-600">Reintentar mapa</button>}
            </div>
          </div>
        )}

        <div className="absolute top-2.5 left-2.5 right-14 sm:right-16 z-20 flex flex-wrap items-center gap-1.5 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm border border-slate-300 text-slate-800 px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold max-w-full">
            <span className={`w-2 h-2 rounded-full shrink-0 ${locationFeedStatus === 'unavailable' || locationFeedStatus === 'reconnecting' ? 'bg-amber-500' : 'bg-teal-600'}`} />
            <span>{locatedTutors.length ? `${locatedTutors.length} ${locatedTutors.length === 1 ? 'docente con ubicación publicada' : 'docentes con ubicación publicada'}`
              : mode === 'student-profile' ? (device.isEnabled && device.observation ? 'Tu zona aproximada en este dispositivo' : 'Esperando una zona aproximada') : 'Vista de Cúcuta · Sin ubicaciones registradas'}</span>
          </div>
          {locationFeedStatus && <span role="status" className="bg-white/95 border border-slate-200 px-2 py-1 rounded-lg text-[10px] text-slate-600">{feedLabels[locationFeedStatus]}</span>}
          {locationFeedStatus === 'unavailable' && onRetryLocations && <button type="button" onClick={onRetryLocations} className="pointer-events-auto bg-white rounded-lg border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-teal-600">Actualizar ubicaciones</button>}
        </div>

        <div className="absolute top-2.5 right-2.5 z-30 flex flex-col gap-1 bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-xl shadow-md p-1">
          <button type="button" aria-label="Acercar mapa" title="Acercar mapa" disabled={disabled} onClick={() => map.controller.current?.zoom(1)} className={controlClass}><ZoomIn className="w-4 h-4" /></button>
          <button type="button" aria-label="Alejar mapa" title="Alejar mapa" disabled={disabled} onClick={() => map.controller.current?.zoom(-1)} className={controlClass}><ZoomOut className="w-4 h-4" /></button>
          <div className="h-px bg-slate-200 my-0.5" />
          <button type="button" aria-label="Centrar mapa" title="Centrar mapa" disabled={disabled} onClick={() => map.controller.current?.center(mode === 'student-profile' && device.observation ? device.observation.position : getOriginPosition(effectiveOrigin))} className={controlClass}><Compass className="w-4 h-4" /></button>
          <button type="button" aria-label={device.isEnabled ? 'Detener ubicación' : 'Usar mi ubicación'} title={device.isEnabled ? 'Detener ubicación' : 'Usar mi ubicación'} aria-pressed={device.isEnabled} disabled={disabled} onClick={device.isEnabled ? device.stop : device.start} className={`${controlClass} ${device.isEnabled ? 'bg-teal-100 text-teal-800' : ''}`}>
            {device.isEnabled ? <LocateOff className="w-4 h-4" /> : <LocateFixed className="w-4 h-4" />}
          </button>
          <button type="button" aria-label={mapLayer === 'streets' ? 'Cambiar a mapa oscuro' : 'Cambiar a mapa de calles'} title={mapLayer === 'streets' ? 'Cambiar a mapa oscuro' : 'Cambiar a mapa de calles'} aria-pressed={mapLayer === 'dark'} disabled={disabled} onClick={() => setMapLayer((layer) => layer === 'streets' ? 'dark' : 'streets')} className={`${controlClass} ${mapLayer === 'dark' ? 'bg-teal-100 text-teal-800' : ''}`}><Layers className="w-4 h-4" /></button>
        </div>

        {locationLabel && <div role="status" className="absolute left-2.5 right-14 bottom-8 z-20 pointer-events-none"><span className="inline-block rounded-lg border border-slate-200 bg-white/95 px-2 py-1 text-[10px] font-medium text-slate-700 shadow-sm">{locationLabel}</span></div>}
      </div>
      <div className="bg-white/95 backdrop-blur-sm border-t border-slate-200/90 px-3 py-1.5 sm:py-2 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-xs text-slate-600">
        <span className="font-semibold text-slate-800">{contextLabel}</span>
        <span>{radiusKm !== undefined ? `Radio ${radiusKm.toFixed(1)} km` : 'OpenFreeMap'}</span>
      </div>
    </div>
  );
};
