import type { WeeklySlot } from '../../features/marketplace/domain/contracts';
import { WEEKDAYS, weeklyAvailabilitySummary } from '../../features/marketplace/domain/contracts';
/** Native disclosure exposes the full declared schedule to touch and keyboard users. */
export function WeeklyAvailability({slots = []}: {slots?: WeeklySlot[]}) {
  const ordered = [...slots].filter(slot=>weeklyAvailabilitySummary([slot])).sort((a,b)=>a.day-b.day || a.start.localeCompare(b.start));
  if (!ordered.length) return <p className="text-sm text-slate-600">Horario por confirmar</p>;
  return <details className="text-sm text-slate-700">
    <summary className="min-h-11 py-3 cursor-pointer font-semibold text-teal-800">Ver horarios completos</summary>
    <p className="mb-2 text-xs text-slate-600">Hora de Colombia · disponibilidad declarada, sujeta a confirmación del tutor.</p>
    <ul className="space-y-1 pb-3">{ordered.map((slot,index)=><li key={`${slot.day}-${slot.start}-${index}`}>{WEEKDAYS[slot.day-1]}: {slot.start}–{slot.end}</li>)}</ul>
  </details>;
}
