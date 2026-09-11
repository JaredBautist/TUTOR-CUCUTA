import type { Tutor } from '../../../types';
import type { PublishedTutorLocation } from '../domain/contracts';

/** Attach only the current public projection; removal also removes previously supplied points. */
export function attachPublishedTutorLocations(tutors: Tutor[], locations: PublishedTutorLocation[]): Tutor[] {
  const published = new Map(locations.map(location => [location.tutorId, location]));
  return tutors.map(tutor => {
    const location = published.get(tutor.id);
    return { ...tutor, location: location?.position, locationPrecision: location?.precision,
      locationUpdatedAt: location?.updatedAt, distanceKm: undefined };
  });
}
