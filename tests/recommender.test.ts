import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isSubjectEligible,
  isLevelEligible,
  isBudgetEligible,
  isCandidateEligible,
  recommendTutors,
  scoreAndExplainCandidate,
} from '../src/features/recommender/domain/recommender';
import type { SearchFilters, Tutor } from '../src/types';
import { CUCUTA_REFERENCE_ORIGIN, getOriginPosition } from '../src/features/maps/domain/geography';

const mockOrigin = getOriginPosition(CUCUTA_REFERENCE_ORIGIN);

const createTutor = (overrides: Partial<Tutor>): Tutor => ({
  id: 't-1',
  name: 'Tutor Test',
  title: 'Docente de Matemáticas',
  institution: 'UFPS',
  avatar: '',
  experienceYears: 5,
  ratePerHour: 30000,
  verified: false,
  sector: 'Centro',
  nextAvailable: 'Hoy tarde',
  modalities: ['presencial', 'virtual'],
  subjects: ['Matemáticas', 'Cálculo I'],
  levels: ['Bachillerato', 'Universidad'],
  specialties: ['Álgebra'],
  bio: 'Docente con experiencia',
  methodologySteps: [],
  matchReasons: [],
  location: mockOrigin,
  coverageRadiusKm: 5,
  ...overrides,
});

const defaultFilters: SearchFilters = {
  subject: '',
  specificTopic: '',
  studentNote: '',
  learningStyles: [],
  educationLevel: '',
  modality: 'any',
  availableDays: [],
  timeSlot: '',
  maxBudget: 0,
  radiusKm: 5,
  referenceSector: 'Centro',
};

test('Recommender: strict eligibility filters out tutors not matching subject regardless of low price', () => {
  const mathTutor = createTutor({ id: 't-math', subjects: ['Matemáticas'], ratePerHour: 50000 });
  const cheapBiologyTutor = createTutor({ id: 't-bio', subjects: ['Biología'], ratePerHour: 10000 });

  assert.equal(isSubjectEligible(mathTutor.subjects, 'Matemáticas'), true);
  assert.equal(isSubjectEligible(cheapBiologyTutor.subjects, 'Matemáticas'), false);

  const filters: SearchFilters = { ...defaultFilters, subject: 'Matemáticas' };
  const ranked = recommendTutors([mathTutor, cheapBiologyTutor], filters, mockOrigin);

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].id, 't-math');
  assert.ok(ranked[0].matchReasons.some((r) => r.includes('Enseña la materia solicitada')));
});

test('Recommender: strict eligibility filters out tutors not matching education level', () => {
  const universityTutor = createTutor({ id: 't-univ', levels: ['Universidad'] });
  const primaryTutor = createTutor({ id: 't-prim', levels: ['Primaria'] });

  assert.equal(isLevelEligible(universityTutor.levels, 'Universidad'), true);
  assert.equal(isLevelEligible(primaryTutor.levels, 'Universidad'), false);

  const filters: SearchFilters = { ...defaultFilters, educationLevel: 'Universidad' };
  const ranked = recommendTutors([universityTutor, primaryTutor], filters, mockOrigin);

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].id, 't-univ');
});

test('Recommender: strict eligibility filters out tutors exceeding max budget', () => {
  const affordableTutor = createTutor({ id: 't-cheap', ratePerHour: 25000 });
  const expensiveTutor = createTutor({ id: 't-expensive', ratePerHour: 60000 });

  assert.equal(isBudgetEligible(affordableTutor.ratePerHour, 35000), true);
  assert.equal(isBudgetEligible(expensiveTutor.ratePerHour, 35000), false);

  const filters: SearchFilters = { ...defaultFilters, maxBudget: 35000 };
  const ranked = recommendTutors([affordableTutor, expensiveTutor], filters, mockOrigin);

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].id, 't-cheap');
  assert.ok(ranked[0].matchReasons.some((r) => r.includes('dentro de tu presupuesto máximo')));
});

test('Recommender: in-person modality filters by ground distance while virtual bypasses distance constraint', () => {
  const nearLocation = mockOrigin;
  // Point approx 20km away
  const farLocation = { latitude: mockOrigin.latitude + 0.18, longitude: mockOrigin.longitude };

  const nearTutor = createTutor({ id: 't-near', modalities: ['presencial'], location: nearLocation });
  const farInPersonTutor = createTutor({ id: 't-far-inperson', modalities: ['presencial'], location: farLocation });
  const farVirtualTutor = createTutor({ id: 't-far-virtual', modalities: ['virtual'], location: farLocation });

  const inPersonFilters: SearchFilters = { ...defaultFilters, modality: 'presencial', radiusKm: 5 };
  const inPersonRanked = recommendTutors([nearTutor, farInPersonTutor, farVirtualTutor], inPersonFilters, mockOrigin);

  // Far in-person tutor is excluded, virtual tutor is excluded by modality
  assert.equal(inPersonRanked.length, 1);
  assert.equal(inPersonRanked[0].id, 't-near');

  // Virtual search allows far virtual tutor
  const virtualFilters: SearchFilters = { ...defaultFilters, modality: 'virtual', radiusKm: 5 };
  const virtualRanked = recommendTutors([nearTutor, farInPersonTutor, farVirtualTutor], virtualFilters, mockOrigin);

  assert.equal(virtualRanked.length, 1);
  assert.equal(virtualRanked[0].id, 't-far-virtual');
  assert.ok(virtualRanked[0].matchReasons.some((r) => r.includes('modalidad virtual')));
});

test('Recommender: produces deterministic scores and structured template-based reasons', () => {
  const tutor = createTutor({
    subjects: ['Física'],
    ratePerHour: 30000,
    modalities: ['presencial'],
    experienceYears: 4,
    nextAvailable: 'Mañana 8:00 AM',
  });

  const filters: SearchFilters = {
    ...defaultFilters,
    subject: 'Física',
    maxBudget: 40000,
    modality: 'presencial',
    radiusKm: 8,
  };

  const { score, reasons } = scoreAndExplainCandidate(tutor, filters, 2.5);

  assert.equal(score, 40, 'Price contributes 10, neutral schedule 15 and proximity 15');
  assert.ok(reasons.length >= 3, 'Should generate multiple clear template reasons');
  assert.ok(reasons.some((r) => r.includes('Enseña la materia solicitada: Física')));
  assert.ok(reasons.some((r) => r.includes('presupuesto')));
  assert.ok(reasons.some((r) => r.includes('2.5 km')));
});

test('Recommender: missing location and tutor coverage reject in-person candidates', () => {
  const filters = {...defaultFilters, modality: 'presencial' as const};
  assert.equal(isCandidateEligible(createTutor({location: undefined}), filters, mockOrigin).eligible, false);
  assert.equal(isCandidateEligible(createTutor({location: {latitude: mockOrigin.latitude + 0.02, longitude: mockOrigin.longitude}, coverageRadiusKm: 0.5}), filters, mockOrigin).eligible, false);
});

test('Recommender: experience and supplied documents do not change ranking scores', () => {
  const a = scoreAndExplainCandidate(createTutor({experienceYears:0}), defaultFilters).score;
  const b = scoreAndExplainCandidate(createTutor({experienceYears:20}), defaultFilters).score;
  assert.equal(a, b);
});

test('Recommender: incompatible weekly availability is mandatory', () => {
  const candidate = createTutor({availability:[{day:1,start:'08:00',end:'10:00'}]});
  assert.equal(isCandidateEligible(candidate,{...defaultFilters,availableDays:['Domingo']},mockOrigin).eligible,false);
});
