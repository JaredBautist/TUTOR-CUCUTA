export type AccountRole = 'student' | 'tutor';
export type ProfileValue = string | number | boolean | null | string[];
export type ProfileFields = Record<string, ProfileValue>;
export type AccountErrorCode = 'INVALID_INPUT' | 'NOT_CONFIGURED' | 'AUTH_FAILED' | 'CONFIRM_EMAIL' | 'RATE_LIMITED' | 'PROFILE_UNAVAILABLE' | 'PROFILE_CONFLICT' | 'PHOTO_FAILED' | 'SESSION_CHANGED';
export class AccountError extends Error {
  constructor(readonly code: AccountErrorCode, message: string, cause?: unknown) {
    super(message, { cause }); this.name = 'AccountError';
  }
}
export interface AccountIdentity { id: string; email: string; name: string; avatarUrl?: string; suggestedRole?: AccountRole }
export interface OwnAccount {
  id: string; role: AccountRole; email: string; profile: ProfileFields;
  avatarPath: string | null; avatarUrl: string | null; displayAvatarUrl: string;
  version: number;
  notice?: string;
}
const studentDefaults: ProfileFields = {
  name: '', age: null, grade: '', school: '', sector: '', address: '', phone: '',
  guardianName: '', guardianPhone: '', guardianRelation: '', guardianAuthorized: false,
  academicGoal: '', difficultiesOrTopics: '', learningStyles: [],
  preferredModality: 'presencial', preferredSchedule: '', bioNote: '',
};
const tutorDefaults: ProfileFields = {
  name: '', title: '', institution: '', experienceYears: null, ratePerHour: null,
  coverageRadiusKm: 5, bio: '', subjects: [], specialties: [],
};
const stringLimits: Record<string, number> = {
  name: 200, grade: 120, school: 200, sector: 200, address: 300, phone: 40,
  guardianName: 200, guardianPhone: 40, guardianRelation: 120, academicGoal: 2000,
  difficultiesOrTopics: 4000, preferredModality: 20, preferredSchedule: 500,
  bioNote: 4000, title: 200, institution: 200, bio: 4000,
};
/** Return a fresh private draft, preserving optional numeric values as missing. */
export function emptyProfile(role: AccountRole): ProfileFields {
  return structuredClone(role === 'student' ? studentDefaults : tutorDefaults);
}
/** Validate the complete editable payload; identity, email, ownership and public verification cannot be injected. */
export function validateProfile(role: AccountRole, input: unknown): ProfileFields {
  const invalid = () => new AccountError('INVALID_INPUT', 'Revisa los campos del perfil y sus límites.');
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid();
  const allowed = emptyProfile(role);
  const entries = Object.entries(input);
  if (entries.length !== Object.keys(allowed).length || entries.some(([key]) => !Object.hasOwn(allowed, key))) throw invalid();
  for (const [key, value] of entries) {
    if (key in stringLimits) {
      if (typeof value !== 'string' || value.length > stringLimits[key]) throw invalid();
      if (key === 'preferredModality' && !['presencial', 'virtual', 'hibrida'].includes(value)) throw invalid();
    } else if (['learningStyles', 'subjects', 'specialties'].includes(key)) {
      if (!Array.isArray(value) || value.length > 30 || value.some(item => typeof item !== 'string' || item.length > 200)) throw invalid();
    } else if (key === 'guardianAuthorized') {
      if (typeof value !== 'boolean') throw invalid();
    } else if (key === 'coverageRadiusKm') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 1 || value > 15) throw invalid();
    } else if (value !== null) {
      if (typeof value !== 'number' || !Number.isFinite(value)) throw invalid();
      if (key === 'age' && (!Number.isInteger(value) || value < 1 || value > 119)) throw invalid();
      if (key === 'experienceYears' && (!Number.isInteger(value) || value < 0 || value > 80)) throw invalid();
      if (key === 'ratePerHour' && (value < 10000 || value > 1000000)) throw invalid();
    }
  }
  return structuredClone(input) as ProfileFields;
}
/** Normalize email only; password bytes are never trimmed or persisted by application code. */
export function validateCredentials(email: string, password: string, registering: boolean) {
  const normalizedEmail = email.trim();
  if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    || password.length < (registering ? 8 : 1) || password.length > 128) {
    throw new AccountError('INVALID_INPUT', registering ? 'Usa un correo válido y una contraseña de 8 a 128 caracteres.' : 'Introduce tu correo y contraseña.');
  }
  return { email: normalizedEmail, password };
}
/** External image references are HTTPS only; uploaded files use private object paths instead. */
export function validateAvatarUrl(value: string): string | null {
  if (!value) return null;
  try { const url = new URL(value); if (url.protocol === 'https:' && !url.username && !url.password && value.length <= 2048) return value; } catch { /* Reject malformed references below. */ }
  throw new AccountError('INVALID_INPUT', 'La URL de la foto debe usar HTTPS.');
}
