import type { WeeklySlot } from './features/marketplace/domain/contracts';
export type Role = 'student' | 'tutor';

export type ScreenId = 
  | 'landing'
  | 'student-search'
  | 'student-results'
  | 'tutor-profile'
  | 'student-requests'
  | 'student-profile-edit'
  | 'teacher-dashboard'
  | 'teacher-request-detail'
  | 'teacher-profile-edit';

export interface StudentProfile {
  id: string;
  name: string;
  avatarInitials: string;
  avatarUrl?: string;
  age?: number;
  grade: string;
  school: string;
  sector: string;
  address: string;
  phone: string;
  email: string;
  guardianName: string;
  guardianPhone: string;
  guardianRelation: string;
  guardianAuthorized: boolean;
  academicGoal: string;
  difficultiesOrTopics: string;
  learningStyles: string[];
  preferredModality: 'presencial' | 'virtual' | 'hibrida';
  preferredSchedule: string;
  bioNote: string;
}

export interface GeoPoint {
  id: string;
  name: string;
  type: 'student' | 'tutor' | 'landmark' | 'sector';
  x: number; // percentage in SVG viewBox 0-1000
  y: number; // percentage in SVG viewBox 0-800
  label: string;
  sublabel?: string;
  rate?: number;
  matchScore?: number;
  distanceKm?: number;
  commuteMin?: number;
}

export interface TutorDocument {
  id: string;
  name: string;
  fileType: 'pdf' | 'jpg' | 'png';
  url?: string;
  dataUrl?: string;
  uploadedAt: string;
}

export interface Tutor {
  id: string;
  name: string;
  title: string;
  institution: string;
  avatar: string;
  experienceYears: number | null;
  ratePerHour: number;
  matchScore?: number;
  verified: boolean;
  sector: string;
  distanceKm?: number;
  nextAvailable: string;
  modalities: ('presencial' | 'virtual')[];
  subjects: string[];
  levels: string[];
  specialties: string[];
  bio: string;
  methodologySteps: { step: number; title: string; desc: string }[];
  matchReasons: string[];
  coordinates?: { x: number; y: number };
  location?: { longitude: number; latitude: number };
  locationPrecision?: 'approximate';
  locationUpdatedAt?: string;
  documents?: TutorDocument[];
  availability?: WeeklySlot[];
  coverageRadiusKm?: number;
}

export interface StudentRequest {
  id: string;
  studentName: string;
  age?: number;
  grade: string;
  guardianLinked: boolean;
  avatarInitials: string;
  studentAvatarUrl?: string;
  sector: string;
  distanceKm?: number;
  matchScore?: number;
  subject: string;
  focalTopic: string;
  goal: string;
  studentNote: string;
  learningPreferences?: string[];
  learningStyles?: string[];
  guardianName?: string;
  guardianPhone?: string;
  scheduledTime: string;
  durationHours: number;
  ratePerHour: number;
  totalEstimated: number;
  modality: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  startsAt?: string;
  tutorPhone?: string;
  studentPhone?: string;
  matchCriteriaChecklist: { label: string; checked: boolean }[];
  coordinates?: { x: number; y: number };
  studentId?: string;
  targetTutorId?: string;
  targetTutorName?: string;
  createdAt?: string;
}

export interface SearchFilters {
  subject: string;
  specificTopic: string;
  studentNote: string;
  learningStyles: string[];
  educationLevel: string;
  modality: 'presencial' | 'virtual' | 'any';
  availableDays: string[];
  timeSlot: string;
  maxBudget: number;
  radiusKm: number;
  referenceSector: string;
}
