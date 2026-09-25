import type { StudentProfile, StudentRequest, Tutor, TutorDocument } from '../../../types';
import type { GeographicPosition } from '../../maps/domain/contracts';

export interface WeeklySlot { day: number; start: string; end: string }
export interface OfferDraft {
  levels: string[];
  modalities: ('presencial' | 'virtual')[];
  availability: WeeklySlot[];
  sector: string;
  position?: GeographicPosition;
  phone: string;
  published: boolean;
  version: number;
}
export interface RequestInput {
  id: string; tutorId: string; subject: string; modality: 'presencial' | 'virtual';
  startsAt: string; durationHours: number; note: string;
}
export interface DocumentRecord extends TutorDocument { path: string; description: string }
export interface MarketplaceRepository {
  catalog(): Promise<Tutor[]>;
  ownOffer(): Promise<OfferDraft | null>;
  publish(offer: OfferDraft): Promise<OfferDraft>;
  withdraw(): Promise<void>;
  requests(): Promise<StudentRequest[]>;
  request(input: RequestInput): Promise<void>;
  transition(id: string, status: 'accepted' | 'rejected' | 'cancelled'): Promise<void>;
  documents(tutorId: string): Promise<DocumentRecord[]>;
  uploadDocument(owner: string, file: File, title: string, description: string): Promise<void>;
  removeDocument(document: DocumentRecord): Promise<string | undefined>;
  documentUrl(document: DocumentRecord): Promise<string>;
}
export class MarketplaceError extends Error {
  constructor(readonly code: string, message: string, cause?: unknown) {
    super(message, {cause}); this.name = 'MarketplaceError';
  }
}
export const WEEKDAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
export const EDUCATION_LEVELS = ['Básica primaria', 'Básica secundaria', 'Grado 11 - Media', 'Universidad', 'Educación de adultos'];
export const emptyOffer = (): OfferDraft => ({levels:[],modalities:[],availability:[],sector:'',phone:'',published:false,version:0});
const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
export const matchesLabel = (a: string, b: string) => normalized(a) === normalized(b);
export const minutes = (time: string) => Number(time.slice(0,2)) * 60 + Number(time.slice(3));

/** Summarize the first declared weekly slot and report how many additional slots exist. */
export function weeklyAvailabilitySummary(slots: WeeklySlot[] | undefined): string {
  const validSlots = (slots || [])
    .filter(slot => Number.isInteger(slot.day) && slot.day >= 1 && slot.day <= 7
      && /^([01]\d|2[0-3]):[0-5]\d$/.test(slot.start)
      && /^([01]\d|2[0-3]):[0-5]\d$/.test(slot.end) && slot.start < slot.end)
    .sort((a,b) => a.day-b.day || a.start.localeCompare(b.start));
  const first = validSlots[0];
  if (!first) return '';
  const additional = validSlots.length - 1;
  return `${WEEKDAYS[first.day-1]} ${first.start}–${first.end}${additional ? ` · +${additional}` : ''}`;
}

/** Validate declaration required before creating a request. Server repeats against stored profile. */
export function requestProfileError(profile?: Pick<StudentProfile,'name'|'age'|'guardianAuthorized'|'guardianName'|'guardianPhone'|'phone'>): string | undefined {
  if (!profile?.name.trim() || !profile.age || !Number.isInteger(profile.age)) return 'Completa tu nombre y edad en Mi perfil antes de solicitar.';
  if (profile.age < 18 && (!profile.guardianAuthorized || !profile.guardianName.trim() || !validPhone(profile.guardianPhone))) return 'Necesitas registrar el nombre, teléfono con código de país y autorización de tu acudiente en Mi perfil.';
  if (profile.age >= 18 && !validPhone(profile.phone)) return 'Registra tu teléfono con código de país en Mi perfil para coordinar una solicitud aceptada.';
}
export const validPhone = (phone: string) => /^\+?[1-9]\d{7,14}$/.test(phone.trim());
export function validateOffer(offer: OfferDraft): OfferDraft {
  if (!offer.levels.length || offer.levels.some(level => !EDUCATION_LEVELS.includes(level)) || !offer.modalities.length || offer.modalities.some(mode => !['presencial','virtual'].includes(mode)) || !validPhone(offer.phone)) throw new MarketplaceError('INVALID_OFFER','Completa niveles, modalidad y teléfono con código de país.');
  if (!offer.availability.length || offer.availability.length > 21 || offer.availability.some(slot => !Number.isInteger(slot.day) || slot.day < 1 || slot.day > 7 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.end) || slot.start >= slot.end)) throw new MarketplaceError('INVALID_SCHEDULE','Registra al menos un horario semanal válido, sin intervalos que crucen medianoche.');
  const ordered = [...offer.availability].sort((a,b)=>a.day-b.day || a.start.localeCompare(b.start));
  if (ordered.some((slot,index)=>index>0 && ordered[index-1].day===slot.day && ordered[index-1].end > slot.start)) throw new MarketplaceError('INVALID_SCHEDULE','Los horarios del mismo día no deben superponerse.');
  if (offer.modalities.includes('presencial') && (!offer.sector.trim() || !offer.position || !Number.isFinite(offer.position.latitude) || !Number.isFinite(offer.position.longitude) || offer.position.latitude < 7.5 || offer.position.latitude > 8.6 || offer.position.longitude < -73 || offer.position.longitude > -72)) throw new MarketplaceError('INVALID_ZONE','Selecciona explícitamente una zona de atención en el mapa del AMC y escribe el sector.');
  return {...offer, phone:offer.phone.trim(), sector:offer.sector.trim(), position:offer.position ? {latitude:Math.round(offer.position.latitude*100)/100,longitude:Math.round(offer.position.longitude*100)/100}:undefined};
}
/** Check actual file bytes, not its user-controlled extension alone. */
export async function documentType(file: Blob): Promise<'pdf'|'jpg'|'png'> {
  if (!file.size || file.size > 5*1024*1024) throw new MarketplaceError('INVALID_FILE','El documento debe pesar entre 1 byte y 5 MB.');
  const bytes = new Uint8Array(await file.slice(0,8).arrayBuffer());
  if (bytes[0]===0x25 && bytes[1]===0x50 && bytes[2]===0x44 && bytes[3]===0x46 && bytes[4]===0x2d) return 'pdf';
  if (bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff) return 'jpg';
  if ([137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value)) return 'png';
  throw new MarketplaceError('INVALID_FILE','El contenido debe ser un archivo PDF, JPG o PNG válido.');
}
