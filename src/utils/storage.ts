import { Tutor, StudentRequest, SearchFilters, StudentProfile, TutorDocument } from '../types';
import { initialSearchFilters } from '../data/searchDefaults';
import { cleanTutors, cleanRequests, isDemoStudentId, isDemoTutorId } from './demoRecords';

export const initialStudentProfile: StudentProfile = {
  id: '',
  name: '',
  avatarInitials: 'ES',
  avatarUrl: '',
  age: undefined,
  grade: '',
  school: '',
  sector: '',
  address: '',
  phone: '',
  email: '',
  guardianName: '',
  guardianPhone: '',
  guardianRelation: '',
  guardianAuthorized: false,
  academicGoal: '',
  difficultiesOrTopics: '',
  learningStyles: [],
  preferredModality: 'presencial',
  preferredSchedule: '',
  bioNote: '',
};

const KEYS = {
  TUTORS: 'tutorcucuta_tutors_v2',
  REQUESTS: 'tutorcucuta_requests_v2',
  FILTERS: 'tutorcucuta_filters_v2',
  SAVED_TUTORS: 'tutorcucuta_saved_tutors_v2',
  CURRENT_USER: 'tutorcucuta_user_v2',
  STUDENT_PROFILE: 'tutorcucuta_student_profile_v2',
  TUTOR_DOCUMENTS: 'tutorcucuta_tutor_documents_v1',
};

// Safe localStorage helper
export const storage = {
  getTutors: (): Tutor[] => {
    try {
      const data = localStorage.getItem(KEYS.TUTORS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return cleanTutors(parsed);
        }
      }
    } catch (e) {
      console.warn('Error reading tutors from localStorage', e);
    }
    return [];
  },

  setTutors: (tutors: Tutor[]) => {
    try {
      localStorage.setItem(KEYS.TUTORS, JSON.stringify(tutors));
    } catch (e) {
      console.warn('Error saving tutors to localStorage', e);
    }
  },

  getRequests: (): StudentRequest[] => {
    try {
      const data = localStorage.getItem(KEYS.REQUESTS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return cleanRequests(parsed);
        }
      }
    } catch (e) {
      console.warn('Error reading requests from localStorage', e);
    }
    return [];
  },

  setRequests: (requests: StudentRequest[]) => {
    try {
      localStorage.setItem(KEYS.REQUESTS, JSON.stringify(requests));
    } catch (e) {
      console.warn('Error saving requests to localStorage', e);
    }
  },

  getFilters: (): SearchFilters => {
    try {
      const data = localStorage.getItem(KEYS.FILTERS);
      if (data) {
        return { ...initialSearchFilters, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Error reading filters from localStorage', e);
    }
    return initialSearchFilters;
  },

  setFilters: (filters: SearchFilters) => {
    try {
      localStorage.setItem(KEYS.FILTERS, JSON.stringify(filters));
    } catch (e) {
      console.warn('Error saving filters to localStorage', e);
    }
  },

  getSavedTutors: (): string[] => {
    try {
      const data = localStorage.getItem(KEYS.SAVED_TUTORS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed.filter((id) => typeof id === 'string' && !isDemoTutorId(id));
        }
      }
    } catch (e) {
      console.warn('Error reading saved tutors from localStorage', e);
    }
    return [];
  },

  setSavedTutors: (ids: string[]) => {
    try {
      localStorage.setItem(KEYS.SAVED_TUTORS, JSON.stringify(ids));
    } catch (e) {
      console.warn('Error saving saved tutors to localStorage', e);
    }
  },

  getStudentProfile: (): StudentProfile => {
    try {
      const data = localStorage.getItem(KEYS.STUDENT_PROFILE);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && !isDemoStudentId(parsed.id)) {
          return { ...initialStudentProfile, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Error reading student profile from localStorage', e);
    }
    return initialStudentProfile;
  },

  setStudentProfile: (profile: StudentProfile): boolean => {
    try {
      localStorage.setItem(KEYS.STUDENT_PROFILE, JSON.stringify(profile));
      return true;
    } catch (e) {
      console.warn('Error saving student profile to localStorage', e);
      return false;
    }
  },

  getTutorDocuments: (tutorId: string): TutorDocument[] => {
    try {
      const data = localStorage.getItem(KEYS.TUTOR_DOCUMENTS);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') {
          return Array.isArray(parsed[tutorId]) ? parsed[tutorId] : [];
        }
      }
    } catch (e) {
      console.warn('Error reading tutor documents from localStorage', e);
    }
    return [];
  },

  setTutorDocuments: (tutorId: string, docs: TutorDocument[]): boolean => {
    try {
      const existing = localStorage.getItem(KEYS.TUTOR_DOCUMENTS);
      const parsed = existing ? JSON.parse(existing) : {};
      parsed[tutorId] = docs;
      localStorage.setItem(KEYS.TUTOR_DOCUMENTS, JSON.stringify(parsed));
      return true;
    } catch (e) {
      console.warn('Error saving tutor documents to localStorage', e);
      return false;
    }
  },

  resetAll: () => {
    try {
      localStorage.removeItem(KEYS.TUTORS);
      localStorage.removeItem(KEYS.REQUESTS);
      localStorage.removeItem(KEYS.FILTERS);
      localStorage.removeItem(KEYS.SAVED_TUTORS);
      localStorage.removeItem(KEYS.STUDENT_PROFILE);
      localStorage.removeItem(KEYS.TUTOR_DOCUMENTS);
    } catch (e) {
      console.warn('Error resetting localStorage', e);
    }
    return {
      tutors: [],
      requests: [],
      filters: initialSearchFilters,
      savedTutors: [],
      studentProfile: initialStudentProfile,
    };
  },
};
