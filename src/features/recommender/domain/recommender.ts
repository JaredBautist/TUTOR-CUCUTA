import type {SearchFilters,Tutor} from '../../../types';
import type {GeographicPosition} from '../../maps/domain/contracts';
import {distanceKilometers,isGeographicPosition} from '../../maps/domain/geography';
import {WEEKDAYS,matchesLabel,minutes} from '../../marketplace/domain/contracts';

export const isSubjectEligible=(subjects:string[],requested:string)=>!requested.trim() || subjects.some(subject=>matchesLabel(subject,requested));
export const isLevelEligible=(levels:string[],requested:string)=>!requested.trim() || matchesLabel(requested,'todos') || levels.some(level=>matchesLabel(level,requested));
export const isBudgetEligible=(rate:number,budget:number)=>Number.isFinite(rate) && rate>0 && Number.isFinite(budget) && (budget<=0 || rate<=budget);
const dayKeys=['L','M','MIÉ','J','V','S','D'];
export const TIME_WINDOWS: Record<string,[number,number]> = {'Mañana':[360,720],'Tarde':[720,1080],'Noche':[1080,1380]};
/** Selected days mean any overlap, not attendance on every requested day. */
export function scheduleOverlap(tutor:Tutor,filters:SearchFilters):{eligible:boolean;ratio:number;minutes:number;selected:boolean} {
 const selected=Boolean(filters.availableDays.length || filters.timeSlot);
 if(!selected)return {eligible:true,ratio:0.5,minutes:0,selected};
 const days=filters.availableDays.length ? filters.availableDays.map(day=>{
  const index=dayKeys.indexOf(day);return index>=0?index+1:WEEKDAYS.findIndex(name=>matchesLabel(name,day))+1;
 }):[1,2,3,4,5,6,7];
 const window=filters.timeSlot ? TIME_WINDOWS[filters.timeSlot]:[0,1440];
 if(!window || days.some(day=>day===0))return {eligible:false,ratio:0,minutes:0,selected};
 const overlap=(tutor.availability || []).filter(slot=>days.includes(slot.day)).reduce((sum,slot)=>sum+Math.max(0,Math.min(minutes(slot.end),window[1])-Math.max(minutes(slot.start),window[0])),0);
 return {eligible:overlap>0,ratio:Math.min(1,overlap/((window[1]-window[0])*days.length)),minutes:overlap,selected};
}
/** In-person requires known coordinates and both declared radii. Virtual has no distance. */
export function isModalityAndDistanceEligible(tutor:Tutor,modality:SearchFilters['modality'],origin?:GeographicPosition,radiusKm?:number):{eligible:boolean;distanceKm?:number} {
 if((modality==='virtual' || modality==='any') && tutor.modalities.includes('virtual'))return {eligible:true};
 if(modality==='virtual' || !tutor.modalities.includes('presencial') || !isGeographicPosition(origin) || !isGeographicPosition(tutor.location) || !radiusKm || radiusKm<=0 || !tutor.coverageRadiusKm || tutor.coverageRadiusKm<=0)return {eligible:false};
 const distanceKm=distanceKilometers(origin,tutor.location);
 return {eligible:distanceKm<=Math.min(radiusKm,tutor.coverageRadiusKm),distanceKm};
}
export function isCandidateEligible(tutor:Tutor,filters:SearchFilters,origin?:GeographicPosition):{eligible:boolean;distanceKm?:number} {
 if(!isSubjectEligible(tutor.subjects,filters.subject) || !isLevelEligible(tutor.levels,filters.educationLevel) || !isBudgetEligible(tutor.ratePerHour,filters.maxBudget) || !scheduleOverlap(tutor,filters).eligible)return {eligible:false};
 return isModalityAndDistanceEligible(tutor,filters.modality,origin,filters.radiusKm);
}
/** Normalized price/overlap/proximity weights, never experience or document bonuses. */
export function scoreAndExplainCandidate(tutor:Tutor,filters:SearchFilters,distanceKm?:number):{score:number;reasons:string[]} {
 const virtual=filters.modality==='virtual' || (filters.modality==='any' && tutor.modalities.includes('virtual'));
 const price=filters.maxBudget>0?Math.max(0,Math.min(1,1-tutor.ratePerHour/filters.maxBudget)):0.5;
 const overlap=scheduleOverlap(tutor,filters);
 const reasons=[filters.maxBudget>0?`Tarifa de $${tutor.ratePerHour.toLocaleString('es-CO')}/h dentro de tu presupuesto máximo ($${filters.maxBudget.toLocaleString('es-CO')}/h)`:`Tarifa de $${tutor.ratePerHour.toLocaleString('es-CO')}/h; sin presupuesto seleccionado, valoración neutral.`];
 if(filters.subject.trim())reasons.push(`Enseña la materia solicitada: ${filters.subject}`);
 if(filters.educationLevel.trim())reasons.push(`Atiende el nivel educativo: ${filters.educationLevel}`);
 reasons.push(overlap.selected?`Coinciden ${overlap.minutes} minutos semanales con tus días y franja seleccionados.`:'Sin horario de búsqueda seleccionado; compatibilidad horaria aún por elegir.');
 let weighted=0.4*price+0.3*overlap.ratio;let totalWeight=0.7;
 if(virtual)reasons.push('Disponible en modalidad virtual: la distancia no participa en esta recomendación.');
 else {
  const radius=Math.min(filters.radiusKm,tutor.coverageRadiusKm || filters.radiusKm);
  weighted+=0.3*(distanceKm===undefined?0:Math.max(0,1-distanceKm/radius));totalWeight=1;
  if(distanceKm!==undefined)reasons.push(`Zona aproximada a ${distanceKm.toFixed(1)} km, dentro de tu radio (${filters.radiusKm} km) y de la cobertura del tutor (${tutor.coverageRadiusKm} km).`);
 }
 return {score:Math.round(weighted/totalWeight*100),reasons};
}
export function recommendTutors(tutors:Tutor[],filters:SearchFilters,origin?:GeographicPosition):Tutor[] {
 return tutors.flatMap(tutor=>{
  const result=isCandidateEligible(tutor,filters,origin);if(!result.eligible)return [];
  const rank=scoreAndExplainCandidate(tutor,filters,result.distanceKm);
  return [{...tutor,matchScore:rank.score,matchReasons:rank.reasons,distanceKm:result.distanceKm}];
 }).sort((a,b)=>b.matchScore-a.matchScore || a.ratePerHour-b.ratePerHour || a.id.localeCompare(b.id));
}
