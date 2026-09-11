import type { StudentRequest, Tutor } from '../types';

// Reserved identities from the retired prototype and repository SQL seed.
const tutorIds = new Set([
  'carlos-ramirez', 'diana-penaranda', 'andres-villamizar',
  'b0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000003',
]);
const studentIds = new Set(['laura-martinez', 'a0000000-0000-0000-0000-000000000001']);
const requestIds = new Set([
  'req-laura-m', 'req-andres-f', 'req-mariana-s',
  'c0000000-0000-0000-0000-000000000001',
]);

export const isDemoTutorId = (id?: string): boolean => tutorIds.has(id);
export const isDemoStudentId = (id?: string): boolean => studentIds.has(id);
export const isDemoRequestId = (id?: string): boolean => requestIds.has(id);

/** Hide reserved fixtures and unevaluated prototype metadata without mutating stored records. */
export function cleanTutors(tutors: Tutor[]): Tutor[] {
  return tutors.filter((tutor) => tutor && typeof tutor.id === 'string' && !isDemoTutorId(tutor.id))
    .map(({ matchScore, distanceKm, coordinates, matchReasons, ...tutor }) => ({ ...tutor, matchReasons: [] }));
}

/** Preserve user requests by identity; old synthetic matching/geographic fields are not evidence. */
export function cleanRequests(requests: StudentRequest[]): StudentRequest[] {
  return requests.filter((request) => request && typeof request.id === 'string' && !isDemoRequestId(request.id))
    .map(({ matchScore, distanceKm, coordinates, matchCriteriaChecklist, ...request }) => ({ ...request, matchCriteriaChecklist: [] }));
}
