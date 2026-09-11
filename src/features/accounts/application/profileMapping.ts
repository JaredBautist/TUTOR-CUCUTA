import type { StudentProfile } from '../../../types';
import { emptyProfile, validateProfile } from '../domain/profile';
import type { OwnAccount, ProfileFields } from '../domain/profile';
export interface TeacherDraft { name: string; avatar: string; title: string; institution: string; experienceYears: number | null; ratePerHour: number | null; coverageRadiusKm: number; bio: string; subjects: string[]; specialties: string[] }
/** Translate the private account into existing student presentation fields. */
export function studentView(account: OwnAccount): StudentProfile {
  const fields = account.role === 'student' ? account.profile : emptyProfile('student');
  return { ...fields, id: account.id, email: account.email, age: fields.age ?? undefined, avatarInitials: '', avatarUrl: account.displayAvatarUrl } as unknown as StudentProfile;
}
export function studentFields(profile: StudentProfile): ProfileFields {
  return validateProfile('student', Object.fromEntries(Object.keys(emptyProfile('student')).map(key => [key, key === 'age' ? profile.age ?? null : profile[key as keyof StudentProfile]])));
}
export function teacherView(account: OwnAccount): TeacherDraft {
  return { ...account.profile, avatar: account.displayAvatarUrl } as unknown as TeacherDraft;
}
export function teacherFields(profile: TeacherDraft): ProfileFields {
  const { avatar: _avatar, ...fields } = profile;
  return validateProfile('tutor', fields);
}
