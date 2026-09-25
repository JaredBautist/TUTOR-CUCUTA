import type { SearchFilters, Tutor } from '../../../types';
import type { GeographicPosition, SearchArea, SearchOrigin } from './contracts';

const EARTH_RADIUS_KM = 6371.0088;
const APPROXIMATE_COORDINATE_SCALE = 100;
export const MAX_MAP_LATITUDE = 85.05112878;

/** City reference only; it never represents a student's or tutor's actual position. */
export const CUCUTA_REFERENCE_ORIGIN: SearchOrigin = {
  kind: 'reference', position: { latitude: 7.8891, longitude: -72.4967 }, label: 'Referencia: Cúcuta',
};

export class InvalidRadiusError extends Error {
  readonly code = 'INVALID_RADIUS';
  constructor() { super('El radio debe ser un número positivo.'); }
}

/** Accept only finite geographic numbers supported by the map projection. */
export function isGeographicPosition(value: unknown): value is GeographicPosition {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const position = value as Partial<GeographicPosition>;
  return typeof position.latitude === 'number' && Number.isFinite(position.latitude)
    && Math.abs(position.latitude) <= MAX_MAP_LATITUDE
    && typeof position.longitude === 'number' && Number.isFinite(position.longitude)
    && Math.abs(position.longitude) <= 180;
}

/** Reduce a device or selected point to a roughly kilometre-scale map zone. */
export function approximateGeographicPosition(position: GeographicPosition): GeographicPosition {
  if (!isGeographicPosition(position)) throw new RangeError('La ubicación no contiene coordenadas geográficas válidas.');
  return {
    latitude: Math.round(position.latitude * APPROXIMATE_COORDINATE_SCALE) / APPROXIMATE_COORDINATE_SCALE,
    longitude: Math.round(position.longitude * APPROXIMATE_COORDINATE_SCALE) / APPROXIMATE_COORDINATE_SCALE,
  };
}

/** Convert a positive kilometer radius into meters; rejects invalid input. */
export function radiusToMeters(radiusKm: number): number {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) throw new InvalidRadiusError();
  return radiusKm * 1000;
}

export function getOriginPosition(origin: SearchOrigin): GeographicPosition {
  return origin.kind === 'device' ? origin.observation.position : origin.position;
}

/** Great-circle distance in kilometers, not a route length or a travel-time estimate. */
export function distanceKilometers(from: GeographicPosition, to: GeographicPosition): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, Math.max(0, haversine))));
}

/** Apply only submitted geographic/modality criteria; preserve the unsubmitted catalog. */
export function selectTutorsInArea(tutors: Tutor[], area: SearchArea | undefined,
  modality: SearchFilters['modality']): Tutor[] {
  if (!area) return tutors;
  const origin = getOriginPosition(area.origin);
  if (!isGeographicPosition(origin) || !Number.isFinite(area.radiusKm) || area.radiusKm <= 0) return [];
  return tutors.flatMap((tutor) => {
    const hasVirtual = tutor.modalities.includes('virtual');
    const distanceKm = isGeographicPosition(tutor.location) ? distanceKilometers(origin, tutor.location) : undefined;
    const inPersonInRange = tutor.modalities.includes('presencial') && distanceKm !== undefined && distanceKm <= area.radiusKm;
    const included = modality === 'virtual' ? hasVirtual : modality === 'any' ? hasVirtual || inPersonInRange : inPersonInRange;
    return included ? [{ ...tutor, distanceKm }] : [];
  });
}
