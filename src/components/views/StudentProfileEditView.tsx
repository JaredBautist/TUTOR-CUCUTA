import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  MapPin,
  Clock,
  Map,
  User,
  GraduationCap,
  School,
  Phone,
  Mail,
  Users,
  Sparkles,
  Plus,
  X,
  BookOpen,
  Target,
  Camera,
  Upload,
  Link as LinkIcon,
  Trash2,
} from 'lucide-react';
import { StudentProfile } from '../../types';
import { UnifiedCucutaMap } from '../common/UnifiedCucutaMap';

interface StudentProfileEditViewProps {
  profile: StudentProfile;
  onBack: () => void;
  onSaveProfile: (updated: StudentProfile) => Promise<string>;
  onNavigateToSearch?: () => void;
  onNavigateToRequests?: () => void;
}

export const StudentProfileEditView: React.FC<StudentProfileEditViewProps> = ({
  profile,
  onBack,
  onSaveProfile,
  onNavigateToRequests,
}) => {
  const [name, setName] = useState(profile.name);
  const [avatarUrl, setAvatarUrl] = useState<string>(profile.avatarUrl || '');
  const previousPhoto = useRef(profile.avatarUrl || '');
  useEffect(() => {
    const before = previousPhoto.current;
    const next = profile.avatarUrl || '';
    previousPhoto.current = next;
    setAvatarUrl(current => current === before ? next : current);
  }, [profile.avatarUrl || '']);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('La fotografía no debe superar los 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          setAvatarUrl(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrlInput.trim()) {
      setAvatarUrl(customUrlInput.trim());
      setCustomUrlInput('');
      setShowUrlInput(false);
    }
  };

  const [age, setAge] = useState(profile.age);
  const [grade, setGrade] = useState(profile.grade);
  const [school, setSchool] = useState(profile.school);
  const [sector, setSector] = useState(profile.sector);
  const [address, setAddress] = useState(profile.address);
  const [phone, setPhone] = useState(profile.phone);
  const email = profile.email;

  // Acudiente info
  const [guardianName, setGuardianName] = useState(profile.guardianName);
  const [guardianPhone, setGuardianPhone] = useState(profile.guardianPhone);
  const [guardianRelation, setGuardianRelation] = useState(profile.guardianRelation);
  const [guardianAuthorized, setGuardianAuthorized] = useState(profile.guardianAuthorized);

  // Academic and preferences
  const [academicGoal, setAcademicGoal] = useState(profile.academicGoal);
  const [difficultiesOrTopics, setDifficultiesOrTopics] = useState(profile.difficultiesOrTopics);
  const [learningStyles, setLearningStyles] = useState<string[]>(profile.learningStyles || []);
  const [newStyleInput, setNewStyleInput] = useState('');
  const [preferredModality, setPreferredModality] = useState<'presencial' | 'virtual' | 'hibrida'>(
    profile.preferredModality || 'presencial'
  );
  const [preferredSchedule, setPreferredSchedule] = useState(profile.preferredSchedule);
  const [bioNote, setBioNote] = useState(profile.bioNote);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [mobileTab, setMobileTab] = useState<'form' | 'map'>('form');

  const cucutaSectors = [
    'La Riviera (Cúcuta)',
    'Los Caobos (Cúcuta)',
    'Guaimaral (Cúcuta)',
    'Prados del Este (Cúcuta)',
    'San Luis (Cúcuta)',
    'Colsag (Cúcuta)',
    'La Ceiba (Cúcuta)',
    'Quinta Bosch (Cúcuta)',
    'Centro (Cúcuta)',
    'Atalaya (Cúcuta)',
    'Los Patios (Área Metropolitana)',
    'Villa del Rosario (Área Metropolitana)',
  ];

  const gradeOptions = [
    'Grado 6 (Básica Secundaria)',
    'Grado 7 (Básica Secundaria)',
    'Grado 8 (Básica Secundaria)',
    'Grado 9 (Básica Secundaria)',
    'Grado 10 (Media Académica)',
    'Grado 11 - Media Académica',
    'Preuniversitario / Pre-ICFES',
    'Universidad (Semestres iniciales)',
  ];

  const cucutaSchools = [
    'Colegio Sagrado Corazón de Jesús (Cúcuta)',
    'Colegio Calasanz Cúcuta',
    'Colegio Salesiano San Juan Bosco',
    'Instituto Técnico Guaimaral',
    'Colegio Municipal de Bachillerato',
    'Colegio Provincial San José',
    'Colegio Santo Ángel de la Guarda',
    'Instituto Técnico Nacional de Comercio',
    'Colegio INEM José Eusebio Caro',
  ];

  const suggestedLearningStyles = [
    'Explicación paso a paso con ejemplos cotidianos',
    'Gráficos y esquemas visuales interactivos',
    'Resolución guiada de ejercicios tipo ICFES',
    'Enfoque paciente sin presiones de tiempo',
    'Analogías y aplicaciones a la vida real',
    'Resúmenes conceptuales al final de cada clase',
    'Refuerzo de bases de años anteriores',
  ];

  const handleAddStyle = (styleText: string) => {
    const trimmed = styleText.trim();
    if (trimmed && !learningStyles.includes(trimmed)) {
      setLearningStyles([...learningStyles, trimmed]);
      setNewStyleInput('');
    }
  };

  const handleRemoveStyle = (styleText: string) => {
    setLearningStyles(learningStyles.filter((s) => s !== styleText));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true); setSaveError(''); setSavedSuccess(false);

    const initials = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('');

    const updatedProfile: StudentProfile = {
      ...profile,
      name,
      avatarInitials: initials || 'ES',
      avatarUrl: avatarUrl || undefined,
      age,
      grade,
      school,
      sector,
      address,
      phone,
      email,
      guardianName,
      guardianPhone,
      guardianRelation,
      guardianAuthorized,
      academicGoal,
      difficultiesOrTopics,
      learningStyles,
      preferredModality,
      preferredSchedule,
      bioNote,
    };

    try {
      const savedAvatar = await onSaveProfile(updatedProfile);
      setAvatarUrl(current => current === avatarUrl ? savedAvatar : current);
      setSavedSuccess(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudo guardar. Tus cambios siguen en el formulario.');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 pb-32 sm:pb-12">
      {/* Top Breadcrumb Nav */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Regresar</span>
        </button>

        <div className="flex items-center gap-2">
          {onNavigateToRequests && (
            <button
              type="button"
              onClick={onNavigateToRequests}
              className="text-xs font-semibold text-teal-800 hover:text-teal-950 underline underline-offset-2 cursor-pointer hidden sm:inline-block"
            >
              Ver mis solicitudes
            </button>
          )}
          <span className="text-[11px] bg-teal-50 text-teal-800 border border-teal-200/80 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-teal-600" />
            <span>Perfil de estudiante</span>
          </span>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white text-slate-400 flex items-center justify-center shadow-md border-2 border-teal-600 overflow-hidden">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="w-8 h-8" role="img" aria-label="Sin foto de perfil" />
                )}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  {name || 'Nuevo Estudiante'}
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-teal-600" />
                  {grade || 'Grado académico'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-600">
                  <School className="w-3.5 h-3.5 text-slate-400" />
                  {school || 'Institución educativa'}
                </span>
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                <span>{sector || 'Sector sin registrar'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-center">
            <button
              type="submit" disabled={saving}
              form="student-profile-form"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando…' : 'Guardar'}</span>
            </button>
          </div>
        </div>

        {saveError && (
          <p role="alert" className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
            {saveError}
          </p>
        )}

        {/* Acknowledged remote save. */}
        {savedSuccess && (
          <div role="status" className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Perfil guardado.</span>{' '}
              Tus datos están vinculados a tu cuenta.
            </div>
          </div>
        )}
      </div>

      {/* Mobile Tab Selector (Form vs Live Map Location) */}
      <div className="lg:hidden flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setMobileTab('form')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'form' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
          }`}
        >
          <User className="w-4 h-4 text-teal-600" />
          <span>Formulario de Datos</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'map' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
          }`}
        >
          <Map className="w-4 h-4 text-teal-600" />
          <span>Ver en Mapa Cúcuta</span>
        </button>
      </div>

      {/* Grid Layout: Main Form (Left 7 cols) & Georeferencing / Summary Card (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Form: Editable Profile Data */}
        <div className={`lg:col-span-7 space-y-5 ${mobileTab === 'map' ? 'hidden lg:block' : 'block'}`}>
          <form id="student-profile-form" onSubmit={handleSave} className="space-y-5">
            {/* 1. Datos Personales y de Contacto */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      1. Foto de Perfil y Datos Personales
                    </h3>
                    <p className="text-xs text-slate-500">
                      Completa tus datos personales para tu perfil de estudiante
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full font-bold">
                  Perfil de Estudiante
                </span>
              </div>

              {/* FOTO DE PERFIL ESTUDIANTE */}
              <div className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Avatar Preview */}
                  <div className="relative group shrink-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-teal-600 shadow-md bg-white text-slate-400 flex items-center justify-center">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <User className="w-10 h-10" role="img" aria-label="Sin foto de perfil" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-slate-900 hover:bg-teal-700 text-white rounded-xl shadow-md transition-colors cursor-pointer"
                      title="Cambiar fotografía del estudiante"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Upload & Controls */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Fotografía del Estudiante</h4>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Sube una fotografía propia para tu perfil.
                      </p>
                    </div>

                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer min-h-[34px]"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Subir foto</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1 cursor-pointer min-h-[34px]"
                      >
                        <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span>URL web</span>
                      </button>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl('')}
                          className="px-2.5 py-1.5 text-rose-600 hover:text-rose-800 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer min-h-[34px]"
                          title="Quitar foto y usar iniciales"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Usar iniciales</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* URL input field if toggled */}
                {showUrlInput && (
                  <div className="pt-2 border-t border-slate-200 animate-in fade-in flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="https://ejemplo.com/foto-estudiante.jpg"
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCustomUrl}
                      className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 cursor-pointer"
                    >
                      Aplicar
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Nombre Completo del Estudiante</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-slate-50/50"
                    placeholder="Ej. Nombre y Apellido"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Edad</label>
                  <input
                    type="number"
                    min="10"
                    max="99"
                    value={age ?? ''}
                    onChange={(e) => setAge(e.target.value === '' ? undefined : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-slate-50/50"
                    placeholder="Tu edad"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Teléfono / WhatsApp</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-slate-50/50"
                      placeholder="Número con indicativo de país"
                    />
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      readOnly aria-label="Correo electrónico de tu cuenta"
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-slate-50/50"
                      placeholder="estudiante@ejemplo.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Información Académica y Colegio */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    2. Nivel Académico y Colegio en Cúcuta
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registra tu nivel y tus necesidades académicas
                  </p>
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Grado Escolar / Nivel</label>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-slate-50/50 cursor-pointer"
                    >
                      <option value="">Selecciona tu nivel</option>
                      {grade && !gradeOptions.includes(grade) && <option value={grade}>{grade}</option>}
                      {gradeOptions.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Institución Educativa en Cúcuta</label>
                    <select
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-slate-50/50 cursor-pointer"
                    >
                      <option value="">Selecciona tu institución</option>
                      {school && !cucutaSchools.includes(school) && <option value={school}>{school}</option>}
                      {cucutaSchools.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Meta Académica Principal</label>
                  <div className="relative">
                    <Target className="w-3.5 h-3.5 text-teal-600 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={academicGoal}
                      onChange={(e) => setAcademicGoal(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-slate-50/50"
                      placeholder="Ej. Preparación Pruebas Saber 11 y Nivelación en Cálculo"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Temas o Dificultades Específicas</label>
                  <div className="relative">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <textarea
                      rows={2}
                      value={difficultiesOrTopics}
                      onChange={(e) => setDifficultiesOrTopics(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-slate-50/50"
                      placeholder="Ej. Funciones trigonométricas, cálculo diferencial, álgebra básica..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Acudiente y Protección de Menores */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      3. Acudiente / Representante Legal
                    </h3>
                    <p className="text-xs text-slate-500">
                      Para menores de edad, registra la información de su acudiente
                    </p>
                  </div>
                </div>
                <span className="text-[10px] bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                  Seguridad
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Nombre del Acudiente</label>
                  <input
                    type="text"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-slate-50/50"
                    placeholder="Nombre completo del acudiente"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Parentesco</label>
                  <select
                    value={guardianRelation}
                    onChange={(e) => setGuardianRelation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-slate-50/50 cursor-pointer"
                  >
                    <option value="">Selecciona el parentesco</option>
                    {guardianRelation && !['Madre', 'Padre', 'Tutor Legal', 'Hermano(a) Mayor', 'Abuelo(a)'].includes(guardianRelation) && <option value={guardianRelation}>{guardianRelation}</option>}
                    <option value="Madre">Madre</option>
                    <option value="Padre">Padre</option>
                    <option value="Tutor Legal">Tutor Legal</option>
                    <option value="Hermano(a) Mayor">Hermano(a) Mayor</option>
                    <option value="Abuelo(a)">Abuelo(a)</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-3">
                  <label className="text-xs font-bold text-slate-700">Teléfono / WhatsApp del Acudiente</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-slate-50/50"
                      placeholder="Número con indicativo de país"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900">Autorización de Tutorías</div>
                    <div className="text-[11px] text-slate-500">
                      Registra la autorización del acudiente en tu perfil
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={guardianAuthorized}
                      onChange={(e) => setGuardianAuthorized(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* 4. Ubicación y Cobertura en Cúcuta */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    4. Ubicación de Residencia en Cúcuta
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tu domicilio es un dato de referencia; el mapa muestra tu ubicación actual al permitir el acceso
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Barrio / Sector AMC</label>
                  <select
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-slate-50/50 cursor-pointer"
                  >
                    <option value="">Selecciona tu sector</option>
                    {sector && !cucutaSectors.includes(sector) && <option value={sector}>{sector}</option>}
                    {cucutaSectors.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Dirección de Domicilio</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-slate-50/50"
                    placeholder="Tu dirección"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Modalidad Preferida</label>
                  <select
                    value={preferredModality}
                    onChange={(e) => setPreferredModality(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-slate-50/50 cursor-pointer"
                  >
                    <option value="presencial">Presencial a domicilio</option>
                    <option value="virtual">Virtual (Videollamada)</option>
                    <option value="hibrida">Híbrida (Ambas)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Disponibilidad de Horarios</label>
                  <div className="relative">
                    <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={preferredSchedule}
                      onChange={(e) => setPreferredSchedule(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-slate-50/50"
                      placeholder="Ej. Tardes después de 3:30 p.m. y fines de semana"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Estilos de Aprendizaje */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    5. Estilos de Aprendizaje y Preferencias Pedagógicas
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registra cómo prefieres aprender en tu perfil
                  </p>
                </div>
              </div>

              {/* Active tags */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Tus estilos seleccionados:</label>
                <div className="flex flex-wrap gap-2">
                  {learningStyles.map((style) => (
                    <span
                      key={style}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-900 border border-teal-200 text-xs font-semibold"
                    >
                      <span>{style}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveStyle(style)}
                        className="p-0.5 hover:bg-teal-200 rounded-full cursor-pointer text-teal-700"
                        title="Eliminar estilo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  {learningStyles.length === 0 && (
                    <span className="text-xs text-slate-400 italic">
                      No has seleccionado ningún estilo. Agrega uno abajo.
                    </span>
                  )}
                </div>
              </div>

              {/* Add custom tag */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newStyleInput}
                  onChange={(e) => setNewStyleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddStyle(newStyleInput);
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-slate-50/50"
                  placeholder="Escribe otro estilo de aprendizaje y pulsa Enter..."
                />
                <button
                  type="button"
                  onClick={() => handleAddStyle(newStyleInput)}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer min-h-[38px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar</span>
                </button>
              </div>

              {/* Quick Suggestions */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Sugerencias comunes:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedLearningStyles
                    .filter((s) => !learningStyles.includes(s))
                    .map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleAddStyle(suggestion)}
                        className="text-[11px] font-medium bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-200 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 transition-colors cursor-pointer text-left"
                      >
                        + {suggestion}
                      </button>
                    ))}
                </div>
              </div>

              {/* Bio / Student note */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700">
                  Nota o Presentación para los Docentes
                </label>
                <textarea
                  rows={3}
                  value={bioNote}
                  onChange={(e) => setBioNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-slate-50/50"
                  placeholder="Cuéntales cómo te gusta aprender, tus expectativas o metas futuras..."
                />
              </div>
            </div>

            {/* Bottom Save Action Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit" disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Guardando…' : 'Guardar'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Sidebar: Reference map and local profile preview */}
        <div className={`lg:col-span-5 space-y-5 lg:sticky lg:top-20 ${mobileTab === 'form' ? 'hidden lg:block' : 'block'}`}>
          {/* Reference map */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Tu ubicación actual
                </h3>
              </div>
              <span className="text-[10px] bg-teal-50 text-teal-700 font-bold px-2 py-0.5 rounded-md border border-teal-200">
                {sector}
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              El navegador solicitará acceso a tu ubicación para centrar el mapa automáticamente. Su precisión depende del dispositivo; puedes detenerla y tu dirección guardada se conserva.
            </p>

            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-inner">
              <UnifiedCucutaMap
                mode="student-profile"
                height="h-[260px] sm:h-[300px]"
              />
            </div>
          </div>

          {/* Student profile preview */}
          <div className="bg-white text-slate-900 border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-700" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Vista Previa del Perfil
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white text-slate-400 flex items-center justify-center shrink-0 overflow-hidden border border-teal-600">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="w-6 h-6" role="img" aria-label="Sin foto de perfil" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black text-slate-900 truncate">{name || 'Estudiante'}</div>
                <div className="text-xs text-slate-600 truncate">{[grade, age !== undefined ? `${age} años` : ''].filter(Boolean).join(' · ') || 'Datos académicos sin registrar'}</div>
                <div className="text-[11px] text-teal-700 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{sector || 'Sector sin registrar'}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                Meta de Estudio
              </div>
              <div className="text-slate-700 font-medium leading-relaxed">
                {academicGoal || 'Meta sin registrar'}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                Estilos de Aprendizaje
              </div>
              <div className="flex flex-wrap gap-1.5">
                {learningStyles.map((style) => (
                  <span
                    key={style}
                    className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md"
                  >
                    {style}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <span>Acudiente registrado:</span>
              <span className="text-slate-900 font-semibold flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-teal-700" />
                {guardianName ? [guardianName, guardianRelation].filter(Boolean).join(' · ') : 'Sin registrar'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
