import type { Tutor } from '../../../types';
export interface BookingSearchContext { subject:string; modality:'presencial'|'virtual'|'any'; specificTopic:string; studentNote:string }
export const BOOKING_NOTE_LIMIT = 2000;
/** Preserve all nonblank search text; never silently truncate an oversized note. */
export function composeBookingNote(context: Pick<BookingSearchContext,'specificTopic'|'studentNote'>) {
  const text = [context.specificTopic.trim() ? `Tema: ${context.specificTopic.trim()}` : '',context.studentNote.trim()].filter(Boolean).join('\n\n');
  return {text,exceedsLimit:text.length > BOOKING_NOTE_LIMIT};
}
/** Unsupported criteria require an explicit selection from this offer. */
export function bookingDefaults(tutor: Pick<Tutor,'subjects'|'modalities'>, context: Pick<BookingSearchContext,'subject'|'modality'>): {subject:string;modality:'presencial'|'virtual'|''} {
  return {subject:tutor.subjects.includes(context.subject)?context.subject:'',
    modality:context.modality==='any' ? tutor.modalities[0] || '' : tutor.modalities.includes(context.modality)?context.modality:''};
}
