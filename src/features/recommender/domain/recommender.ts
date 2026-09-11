import type { SearchFilters, Tutor } from '../../../types';
import {
  distanceKilometers,
  isGeographicPosition,
} from '../../maps/domain/geography';
import type { GeographicPosition } from '../../maps/domain/contracts';

export interface RecommendationResult {
  tutor: Tutor;
  score: number;
  reasons: string[];
  distanceKm?: number;
}

/** Check if tutor covers requested subject (case-insensitive substring or match) */
export function isSubjectEligible(tutorSubjects: string[], requestedSubject: string): boolean {
  const cleanSubject = requestedSubject.trim().toLowerCase();
  if (!cleanSubject) return true;
  return tutorSubjects.some((s) => {
    const clean = s.trim().toLowerCase();
    return clean.includes(cleanSubject) || cleanSubject.includes(clean);
  });
}

/** Check if tutor attends requested academic level */
export function isLevelEligible(tutorLevels: string[], requestedLevel: string): boolean {
  const cleanLevel = requestedLevel.trim().toLowerCase();
  if (!cleanLevel || cleanLevel === 'todos') return true;
  return tutorLevels.some((lvl) => {
    const clean = lvl.trim().toLowerCase();
    return clean.includes(cleanLevel) || cleanLevel.includes(clean);
  });
}

/** Check if tutor rate is within maximum budget constraint */
export function isBudgetEligible(tutorRate: number, maxBudget: number): boolean {
  if (maxBudget <= 0) return true;
  return tutorRate <= maxBudget;
}

/** Check modality and geographic mutual radius for in-person */
export function isModalityAndDistanceEligible(
  tutor: Tutor,
  requestedModality: SearchFilters['modality'],
  origin?: GeographicPosition,
  radiusKm?: number,
): { eligible: boolean; distanceKm?: number } {
  const hasVirtual = tutor.modalities.includes('virtual');
  const hasPresencial = tutor.modalities.includes('presencial');

  let distanceKm: number | undefined;
  if (origin && isGeographicPosition(origin) && tutor.location && isGeographicPosition(tutor.location)) {
    distanceKm = distanceKilometers(origin, tutor.location);
  }

  const effectiveRadius = (radiusKm && radiusKm > 0) ? radiusKm : Infinity;
  const inPersonInRange = hasPresencial && (distanceKm === undefined || distanceKm <= effectiveRadius);

  if (requestedModality === 'virtual') {
    return { eligible: hasVirtual, distanceKm };
  }
  if (requestedModality === 'presencial') {
    return { eligible: inPersonInRange, distanceKm };
  }
  // 'any'
  return { eligible: hasVirtual || inPersonInRange, distanceKm };
}

/** Strict pre-filtering eligibility check */
export function isCandidateEligible(
  tutor: Tutor,
  filters: SearchFilters,
  origin?: GeographicPosition,
): { eligible: boolean; distanceKm?: number } {
  if (!isSubjectEligible(tutor.subjects, filters.subject)) {
    return { eligible: false };
  }
  if (!isLevelEligible(tutor.levels, filters.educationLevel)) {
    return { eligible: false };
  }
  if (!isBudgetEligible(tutor.ratePerHour, filters.maxBudget)) {
    return { eligible: false };
  }
  const modalityResult = isModalityAndDistanceEligible(
    tutor,
    filters.modality,
    origin,
    filters.radiusKm,
  );
  if (!modalityResult.eligible) {
    return { eligible: false };
  }
  return { eligible: true, distanceKm: modalityResult.distanceKm };
}

/** Compute deterministic multi-criteria score (0-100) and template-based explanations */
export function scoreAndExplainCandidate(
  tutor: Tutor,
  filters: SearchFilters,
  distanceKm?: number,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];

  // 1. Price Score (Up to 40 pts)
  let priceScore = 25;
  if (filters.maxBudget > 0) {
    const savings = Math.max(0, filters.maxBudget - tutor.ratePerHour);
    const savingsRatio = savings / filters.maxBudget;
    priceScore = Math.round(20 + savingsRatio * 20); // 20 to 40 pts
    reasons.push(`Tarifa de $${tutor.ratePerHour.toLocaleString('es-CO')}/h dentro de tu presupuesto máximo ($${filters.maxBudget.toLocaleString('es-CO')}/h)`);
  } else {
    // Market reference in Cúcuta metropolitan area (20k - 50k)
    if (tutor.ratePerHour <= 25000) priceScore = 40;
    else if (tutor.ratePerHour <= 35000) priceScore = 35;
    else if (tutor.ratePerHour <= 50000) priceScore = 28;
    else priceScore = 20;
    reasons.push(`Tarifa por hora: $${tutor.ratePerHour.toLocaleString('es-CO')}/h`);
  }

  // 2. Modality & Location Score (Up to 30 pts)
  let locationScore = 20;
  if (filters.modality === 'virtual' || (tutor.modalities.includes('virtual') && filters.modality === 'any')) {
    locationScore = 30;
    reasons.push('Disponible en modalidad virtual (sin restricción de desplazamiento)');
  } else if (distanceKm !== undefined) {
    const maxRadius = filters.radiusKm > 0 ? filters.radiusKm : 10;
    const proximityRatio = Math.max(0, 1 - distanceKm / maxRadius);
    locationScore = Math.round(15 + proximityRatio * 15); // 15 to 30 pts
    reasons.push(`Ubicado a ${distanceKm.toFixed(1)} km (dentro del radio de atención de ${maxRadius.toFixed(1)} km)`);
  } else {
    locationScore = 20;
    reasons.push(`Atención presencial en ${tutor.sector || 'Área Metropolitana de Cúcuta'}`);
  }

  // 3. Subject & Level Match Reasons
  if (filters.subject.trim()) {
    const matched = tutor.subjects.find((s) => s.toLowerCase().includes(filters.subject.trim().toLowerCase())) || filters.subject;
    reasons.push(`Enseña la materia solicitada: ${matched}`);
  }
  if (filters.educationLevel.trim() && filters.educationLevel.toLowerCase() !== 'todos') {
    reasons.push(`Atiende el nivel educativo: ${filters.educationLevel}`);
  }

  // 4. Availability & Experience (Up to 30 pts)
  const experienceBonus = Math.min(10, Math.round(tutor.experienceYears * 1.5));
  const availabilityScore = 20 + experienceBonus; // 20 to 30 pts
  if (tutor.nextAvailable) {
    reasons.push(`Disponibilidad próxima declarada: ${tutor.nextAvailable}`);
  }

  const totalScore = Math.min(100, Math.max(20, priceScore + locationScore + availabilityScore));

  return { score: totalScore, reasons };
}

/**
 * Filter, score, and rank tutors based on strict eligibility and explainable multi-criteria scoring.
 */
export function recommendTutors(
  tutors: Tutor[],
  filters: SearchFilters,
  origin?: GeographicPosition,
): Tutor[] {
  const candidates: RecommendationResult[] = [];

  for (const tutor of tutors) {
    const eligibility = isCandidateEligible(tutor, filters, origin);
    if (!eligibility.eligible) {
      continue;
    }
    const { score, reasons } = scoreAndExplainCandidate(tutor, filters, eligibility.distanceKm);
    candidates.push({
      tutor,
      score,
      reasons,
      distanceKm: eligibility.distanceKm,
    });
  }

  // Sort by match score descending, then by price ascending
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.tutor.ratePerHour - b.tutor.ratePerHour;
  });

  return candidates.map(({ tutor, score, reasons, distanceKm }) => ({
    ...tutor,
    matchScore: score,
    matchReasons: reasons,
    distanceKm: distanceKm ?? tutor.distanceKm,
  }));
}
