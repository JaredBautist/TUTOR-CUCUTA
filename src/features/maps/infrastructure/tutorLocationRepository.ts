import type { SupabaseClient } from '@supabase/supabase-js';
import { isDemoTutorId } from '../../../utils/demoRecords';
import type { PublishedTutorLocation, TutorLocationRepository } from '../domain/contracts';
import { isGeographicPosition, MAX_MAP_LATITUDE } from '../domain/geography';

type LocationReadErrorCode = 'LOCATION_NOT_CONFIGURED' | 'LOCATION_READ_FAILED' | 'LOCATION_RECORD_INVALID' | 'LOCATION_LIMIT_EXCEEDED';

export class LocationReadError extends Error {
  constructor(readonly code: LocationReadErrorCode, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'LocationReadError';
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const COORDINATE_DECIMALS = 1000;
const ROUNDING_TOLERANCE = 1e-8;
const PAGE_SIZE = 1000;
const MAX_LOCATION_ROWS = 10000;
const READ_TIMEOUT_MS = 15000;
let subscriptionSequence = 0;

const isApproximateCoordinate = (coordinate: unknown, limit: number): coordinate is number =>
  typeof coordinate === 'number' && Number.isFinite(coordinate)
  && coordinate >= -limit && coordinate <= limit
  && Math.abs(coordinate * COORDINATE_DECIMALS - Math.round(coordinate * COORDINATE_DECIMALS)) < ROUNDING_TOLERANCE;

/** Decode the public projection only; reject corrupt/private-precision records. */
export function decodePublishedTutorLocations(rows: unknown): PublishedTutorLocation[] {
  const invalid = () => new LocationReadError('LOCATION_RECORD_INVALID', 'Las ubicaciones publicadas tienen un formato inválido.');
  if (!Array.isArray(rows)) throw invalid();
  const tutorIds = new Set<string>();
  const locations: PublishedTutorLocation[] = [];
  for (const candidate of rows) {
    if (typeof candidate !== 'object' || candidate === null) throw invalid();
    const row = candidate as Record<string, unknown>;
    const tutorId = typeof row.tutor_id === 'string' ? row.tutor_id.toLowerCase() : '';
    if (isDemoTutorId(tutorId)) continue;
    if (!UUID_PATTERN.test(tutorId) || tutorIds.has(tutorId)
      || !isApproximateCoordinate(row.latitude, MAX_MAP_LATITUDE)
      || !isApproximateCoordinate(row.longitude, 180)
      || !isGeographicPosition({ latitude: row.latitude, longitude: row.longitude })
      || row.precision !== 'approximate'
      || typeof row.updated_at !== 'string' || !TIMESTAMP_PATTERN.test(row.updated_at)
      || !Number.isFinite(Date.parse(row.updated_at))) throw invalid();
    tutorIds.add(tutorId);
    locations.push({
      tutorId,
      position: { latitude: row.latitude, longitude: row.longitude },
      precision: 'approximate',
      updatedAt: row.updated_at,
    });
  }
  return locations;
}

/** Read and subscribe to approved public teaching points. Never reads legacy geom or writes. */
export function createTutorLocationRepository(client: SupabaseClient | null): TutorLocationRepository {
  return {
    async read() {
      if (!client) {
        throw new LocationReadError('LOCATION_NOT_CONFIGURED', 'Configura la conexión para consultar ubicaciones publicadas.');
      }
      try {
        const rows: unknown[] = [];
        const signal = AbortSignal.timeout(READ_TIMEOUT_MS);
        for (let offset = 0; offset <= MAX_LOCATION_ROWS; offset += PAGE_SIZE) {
          const response = await client.from('tutor_map_locations')
            .select('tutor_id,latitude,longitude,precision,updated_at')
            .order('tutor_id').range(offset, offset + PAGE_SIZE - 1).abortSignal(signal);
          if (response.error) throw response.error;
          if (!Array.isArray(response.data)) {
            throw new LocationReadError('LOCATION_RECORD_INVALID', 'No se recibió una lista válida de ubicaciones.');
          }
          rows.push(...response.data);
          if (rows.length > MAX_LOCATION_ROWS) {
            throw new LocationReadError('LOCATION_LIMIT_EXCEEDED', 'La consulta de ubicaciones excede el límite disponible.');
          }
          if (response.data.length < PAGE_SIZE) return decodePublishedTutorLocations(rows);
        }
        throw new LocationReadError('LOCATION_LIMIT_EXCEEDED', 'La consulta de ubicaciones excede el límite disponible.');
      } catch (cause) {
        if (cause instanceof LocationReadError) throw cause;
        throw new LocationReadError('LOCATION_READ_FAILED', 'No se pudieron cargar las ubicaciones publicadas. Intenta de nuevo.', cause);
      }
    },
    subscribe(onInvalidation, onStatus) {
      if (!client) {
        onStatus('unavailable');
        return () => {};
      }
      let active = true;
      onStatus('connecting');
      const channel = client.channel(`tutor-map-locations:${++subscriptionSequence}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tutor_map_locations' }, () => {
          if (active) onInvalidation();
        })
        .subscribe((status) => {
          if (!active) return;
          if (status === 'SUBSCRIBED') onStatus('connected');
          else if (status === 'CLOSED') onStatus('unavailable');
          else onStatus('reconnecting');
        });
      return () => {
        if (!active) return;
        active = false;
        // Consumers disposed with the channel ignore this terminal notification;
        // a failed cleanup is still handled rather than an unhandled rejection.
        void client.removeChannel(channel).then((result) => {
          if (result !== 'ok') onStatus('unavailable');
        }, () => onStatus('unavailable'));
      };
    },
  };
}
