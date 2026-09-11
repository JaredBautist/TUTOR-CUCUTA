import { createClient } from '@supabase/supabase-js';
import type { StudentRequest, Tutor } from '../types';
import { isDemoRequestId, isDemoTutorId } from './demoRecords';
import { storage } from './storage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl?.startsWith('https://') && supabaseAnonKey?.length > 20,
);
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl!, supabaseAnonKey!, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;

interface TutorRow {
  id: string;
  title: string | null;
  institution: string | null;
  experience_years: number;
  rate_per_hour: number | string;
  verified: boolean;
  sector: string | null;
  next_available: string | null;
  modalities: Tutor['modalities'] | null;
  subjects: string[] | null;
  levels: string[] | null;
  specialties: string[] | null;
  bio: string | null;
  methodology_steps: Tutor['methodologySteps'] | null;
  profiles: { full_name: string; avatar_url?: string | null } | { full_name: string; avatar_url?: string | null }[];
}

interface RequestRow {
  id: string;
  student_id?: string;
  tutor_id?: string;
  student_name: string;
  student_avatar_url?: string;
  grade: string;
  guardian_linked: boolean;
  guardian_name?: string;
  guardian_phone?: string;
  sector: string;
  subject: string;
  focal_topic: string;
  goal: string;
  student_note?: string;
  scheduled_time: string;
  duration_hours: number | string;
  rate_per_hour: number | string;
  total_estimated: number | string;
  modality: string;
  status: StudentRequest['status'];
  created_at: string;
}

export class CatalogReadError extends Error {
  readonly code = 'CATALOG_READ_FAILED';

  constructor(collection: string, cause: unknown) {
    super(`No se pudieron cargar ${collection}. Intenta de nuevo.`, { cause });
    this.name = 'CatalogReadError';
  }
}

/** Map stored facts only. Matching, distance and availability are never synthesized. */
function mapTutor(row: TutorRow): Tutor {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    name: profile?.full_name || '',
    title: row.title || '',
    institution: row.institution || '',
    avatar: profile?.avatar_url || '',
    experienceYears: row.experience_years,
    ratePerHour: Number(row.rate_per_hour),
    verified: row.verified === true,
    sector: row.sector || '',
    nextAvailable: row.next_available || '',
    modalities: row.modalities || [],
    subjects: row.subjects || [],
    levels: row.levels || [],
    specialties: row.specialties || [],
    bio: row.bio || '',
    methodologySteps: row.methodology_steps || [],
    matchReasons: [],
  };
}

/** Read adapters use local data only when unconfigured; remote failures reject explicitly. */
export const supabaseService = {
  getTutors: async (): Promise<Tutor[]> => {
    if (!supabase) return storage.getTutors();
    try {
      const { data, error } = await supabase.from('tutors').select(`
        id, title, institution, experience_years, rate_per_hour, verified, sector,
        next_available, modalities, subjects, levels, specialties, bio, methodology_steps,
        profiles!inner(full_name, avatar_url)
      `);
      if (error) throw error;
      const rows = (data || []) as unknown as TutorRow[];
      return rows.filter((row) => !isDemoTutorId(row.id)).map(mapTutor);
    } catch (cause) {
      throw new CatalogReadError('los tutores', cause);
    }
  },

  /** Requires a participant identity; no unscoped request collection is fetched. */
  getRequests: async (studentId?: string): Promise<StudentRequest[]> => {
    if (!studentId) return [];
    if (!supabase) return storage.getRequests().filter((request) => request.studentId === studentId);
    try {
      const { data, error } = await supabase.from('student_requests').select('*')
        .eq('student_id', studentId).order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data || []) as RequestRow[];
      return rows.filter((row) => !isDemoRequestId(row.id)).map((row) => ({
        id: row.id,
        studentId: row.student_id,
        targetTutorId: row.tutor_id,
        studentName: row.student_name,
        grade: row.grade,
        guardianLinked: row.guardian_linked,
        avatarInitials: (row.student_name || '').split(/\s+/).filter(Boolean).map((word) => word[0]).slice(0, 2).join('').toUpperCase(),
        studentAvatarUrl: row.student_avatar_url,
        sector: row.sector,
        subject: row.subject,
        focalTopic: row.focal_topic,
        goal: row.goal,
        studentNote: row.student_note || '',
        scheduledTime: row.scheduled_time,
        durationHours: Number(row.duration_hours),
        ratePerHour: Number(row.rate_per_hour),
        totalEstimated: Number(row.total_estimated),
        modality: row.modality,
        status: row.status,
        guardianName: row.guardian_name,
        guardianPhone: row.guardian_phone,
        matchCriteriaChecklist: [],
        createdAt: row.created_at,
      }));
    } catch (cause) {
      throw new CatalogReadError('las solicitudes', cause);
    }
  },
};
