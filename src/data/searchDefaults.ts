import type { SearchFilters } from '../types';

export const initialSearchFilters: SearchFilters = {
  subject: '',
  specificTopic: '',
  studentNote: '',
  learningStyles: [],
  educationLevel: '',
  modality: 'presencial',
  availableDays: [],
  timeSlot: '',
  maxBudget: 40000,
  radiusKm: 5.0,
  referenceSector: '',
};
