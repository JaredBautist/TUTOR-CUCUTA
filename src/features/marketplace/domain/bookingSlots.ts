import type { WeeklySlot } from './contracts';
import { minutes } from './contracts';

export interface BookingSlotQuery {
  slots: readonly WeeklySlot[];
  date: string;
  durationMinutes: 60 | 90 | 120 | 150 | 180;
  nowIso: string;
}
export interface ProposedBookingSlot { startsAt: string; endsAt: string; label: string }
export type SlotSelectionResult = {ok:true; slots:ProposedBookingSlot[]} | {ok:false; code:'INVALID_DATE'|'INVALID_DURATION'|'INVALID_SCHEDULE'};
const DAY_MS = 86_400_000;
const HORIZON_DAYS = 180;
const STEP_MINUTES = 30;
const validTime = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
/** Derive proposals in Colombia time, without claiming private calendar availability. */
export function proposeBookingSlots(query: BookingSlotQuery): SlotSelectionResult {
  const {date, durationMinutes, slots, nowIso} = query;
  const midnight = Date.parse(`${date}T00:00:00-05:00`);
  const now = Date.parse(nowIso);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(midnight) || !Number.isFinite(now)
      || new Date(midnight).toISOString().slice(0,10) !== date) return {ok:false,code:'INVALID_DATE'};
  if (![60,90,120,150,180].includes(durationMinutes)) return {ok:false,code:'INVALID_DURATION'};
  if (slots.some(slot => !Number.isInteger(slot.day) || slot.day < 1 || slot.day > 7
    || !validTime(slot.start) || !validTime(slot.end) || slot.start >= slot.end)) return {ok:false,code:'INVALID_SCHEDULE'};
  const weekday = new Date(midnight).getUTCDay() || 7;
  const starts = new Set<number>();
  for (const slot of slots.filter(slot => slot.day === weekday)) {
    for (let start = minutes(slot.start); start + durationMinutes <= minutes(slot.end); start += STEP_MINUTES) {
      const instant = midnight + start * 60_000;
      if (instant > now && instant <= now + HORIZON_DAYS * DAY_MS) starts.add(start);
    }
  }
  const wallTime = (minute: number) => `${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
  return {ok:true,slots:[...starts].sort((a,b)=>a-b).map(start=>({
    startsAt:`${date}T${wallTime(start)}:00-05:00`, endsAt:`${date}T${wallTime(start+durationMinutes)}:00-05:00`,label:wallTime(start),
  }))};
}
