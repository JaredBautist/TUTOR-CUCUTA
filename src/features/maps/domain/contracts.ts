/** Geographic coordinates in degrees; validate at every external adapter boundary. */
export interface GeographicPosition {
  latitude: number;
  longitude: number;
}

export interface DevicePosition {
  position: GeographicPosition;
  accuracyMeters: number;
  observedAt: string;
}

export type SearchOrigin =
  | { kind: 'reference'; position: GeographicPosition; label: string }
  | { kind: 'device'; observation: DevicePosition }
  | { kind: 'selected'; position: GeographicPosition; label: string };

/** A submitted search snapshot; keep device-derived origins out of persisted filters. */
export interface SearchArea {
  origin: SearchOrigin;
  radiusKm: number;
}

/** Intentionally published teaching location, never a live device observation. */
export interface PublishedTutorLocation {
  tutorId: string;
  position: GeographicPosition;
  precision: 'approximate';
  updatedAt: string;
}

export type LocationFeedStatus = 'connecting' | 'connected' | 'reconnecting' | 'unavailable';

export interface TutorLocationRepository {
  read(): Promise<PublishedTutorLocation[]>;
  subscribe(onInvalidation: () => void,
    onStatus: (status: LocationFeedStatus) => void): () => void;
}
