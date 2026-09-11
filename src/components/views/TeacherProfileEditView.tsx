import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Save, Upload, Plus, X, Map, User, Camera, RotateCcw, Link as LinkIcon, FileText, Trash2, Eye, AlertTriangle } from 'lucide-react';
import type { TeacherDraft } from '../../features/accounts/application/profileMapping';
import { UnifiedCucutaMap } from '../common/UnifiedCucutaMap';
import type { SearchOrigin } from '../../features/maps/domain/contracts';
import { CUCUTA_REFERENCE_ORIGIN } from '../../features/maps/domain/geography';
import { storage } from '../../utils/storage';
import type { TutorDocument } from '../../types';

interface TeacherProfileEditViewProps {
  teacher?: TeacherDraft;
  teacherId?: string;
  onBack: () => void;
  onSaveProfile?: (updated: TeacherDraft) => Promise<string>;
  onSaved?: () => void;
}

export const TeacherProfileEditView: React.FC<TeacherProfileEditViewProps> = ({
  teacher,
  teacherId,
  onBack,
  onSaveProfile,
  onSaved,
}) => {
  const [fullName, setFullName] = useState(teacher?.name || '');
  const [avatar, setAvatar] = useState(teacher?.avatar || '');
  const [documents, setDocuments] = useState<TutorDocument[]>(() => {
    return teacherId ? storage.getTutorDocuments(teacherId) : [];
  });
  const docInputRef = useRef<HTMLInputElement>(null);
  const [docUploadError, setDocUploadError] = useState('');
  const previousPhoto = useRef(teacher?.avatar || '');
  useEffect(() => {
    const before = previousPhoto.current;
    const next = teacher?.avatar || '';
    previousPhoto.current = next;
    setAvatar(current => current === before ? next : current);
  }, [teacher?.avatar || '']);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen no debe superar los 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          setAvatar(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrlInput.trim()) {
      setAvatar(customUrlInput.trim());
      setCustomUrlInput('');
      setShowUrlInput(false);
    }
  };

  const [title, setTitle] = useState(teacher?.title || '');
  const [institution, setInstitution] = useState(teacher?.institution || '');
  const [experienceYears, setExperienceYears] = useState<number | ''>(teacher?.experienceYears ?? '');
  const [ratePerHour, setRatePerHour] = useState<number | ''>(teacher?.ratePerHour ?? '');
  const [coverageRadius, setCoverageRadius] = useState(teacher?.coverageRadiusKm ?? 5);
  const [mapOrigin, setMapOrigin] = useState<SearchOrigin>(CUCUTA_REFERENCE_ORIGIN);
  const [bio, setBio] = useState(teacher?.bio || '');

  const [subjects, setSubjects] = useState<string[]>(
    teacher?.subjects || []
  );
  const [newSubjectInput, setNewSubjectInput] = useState('');

  const [specialties, setSpecialties] = useState<string[]>(
    teacher?.specialties || []
  );
  const [newSpecialtyInput, setNewSpecialtyInput] = useState('');

  const [mobileTab, setMobileTab] = useState<'form' | 'map'>('form');
  const canSave = Boolean(teacher && onSaveProfile);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleAddSubject = () => {
    if (newSubjectInput.trim() && !subjects.includes(newSubjectInput.trim())) {
      setSubjects([...subjects, newSubjectInput.trim()]);
      setNewSubjectInput('');
    }
  };

  const handleRemoveSubject = (s: string) => {
    setSubjects(subjects.filter((item) => item !== s));
  };

  const handleAddSpecialty = () => {
    if (newSpecialtyInput.trim() && !specialties.includes(newSpecialtyInput.trim())) {
      setSpecialties([...specialties, newSpecialtyInput.trim()]);
      setNewSpecialtyInput('');
    }
  };

  const handleRemoveSpecialty = (sp: string) => {
    setSpecialties(specialties.filter((item) => item !== sp));
  };

  const handleDocumentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocUploadError('');

    const ext = file.name.split('.').pop()?.toLowerCase();
    const isPdf = file.type === 'application/pdf' || ext === 'pdf';
    const isJpg = file.type === 'image/jpeg' || file.type === 'image/jpg' || ext === 'jpg' || ext === 'jpeg';
    const isPng = file.type === 'image/png' || ext === 'png';

    if (!isPdf && !isJpg && !isPng) {
      setDocUploadError('Solo se permiten formatos PDF, JPG o PNG.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setDocUploadError('El archivo no debe superar los 5MB.');
      return;
    }

    const fileType: 'pdf' | 'jpg' | 'png' = isPdf ? 'pdf' : isPng ? 'png' : 'jpg';

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        const newDoc: TutorDocument = {
          id: 'doc-' + Date.now(),
          name: file.name,
          fileType,
          dataUrl: event.target.result,
          uploadedAt: new Date().toISOString(),
        };
        const updated = [...documents, newDoc];
        setDocuments(updated);
        if (teacherId) {
          storage.setTutorDocuments(teacherId, updated);
        }
      }
    };
    reader.readAsDataURL(file);
    if (docInputRef.current) {
      docInputRef.current.value = '';
    }
  };

  const handleRemoveDocument = (id: string) => {
    const updated = documents.filter((d) => d.id !== id);
    setDocuments(updated);
    if (teacherId) {
      storage.setTutorDocuments(teacherId, updated);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher || !onSaveProfile || saving) return;
    setSaving(true); setSaved(false); setSaveError('');
    try {
      const savedAvatar = await onSaveProfile({ name: fullName, title, institution, avatar,
        experienceYears: experienceYears === '' ? null : experienceYears,
        ratePerHour: ratePerHour === '' ? null : ratePerHour,
        coverageRadiusKm: coverageRadius, bio, subjects, specialties });
      if (teacherId) {
        storage.setTutorDocuments(teacherId, documents);
      }
      setAvatar(current => current === avatar ? savedAvatar : current);
      setSaved(true); onSaved?.();
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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200/90 px-3 py-2 rounded-xl shadow-xs transition-colors min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al panel</span>
        </button>

        <div className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg font-medium">
          <User className="w-3.5 h-3.5" />
          <span>Perfil docente</span>
        </div>
      </div>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            Editar Mi Perfil Docente
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Consulta y edita tus datos profesionales, materias y tarifas.
          </p>
        </div>

        <button
          type="submit"
          form="teacher-profile-form"
          disabled={!canSave || saving}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 min-h-[42px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Guardando…' : 'Guardar'}</span>
        </button>
      </div>

      {saveError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{saveError}</p>}
      {saved && <p role="status" className="rounded-xl bg-teal-50 p-3 text-sm text-teal-900">Perfil guardado. Tus datos están vinculados a tu cuenta.</p>}
      {!canSave && (
        <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-medium">
          No hay una cuenta docente vinculada. Podrás guardar tu perfil cuando el registro docente esté disponible.
        </div>
      )}

      {/* Mobile-Only Tab Switcher: Form vs Map */}
      <div className="lg:hidden flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setMobileTab('form')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'form'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <User className="w-4 h-4 text-teal-600" />
          <span>Datos pedagógicos</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'map'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Map className="w-4 h-4 text-teal-600" />
          <span>Mapa de referencia</span>
        </button>
      </div>

      {/* Main Grid: Form (Left) vs Spatial/Geocoverage (Right) */}
      <form id="teacher-profile-form" onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Pedagogical Data */}
        <div className={`lg:col-span-7 space-y-5 sm:space-y-6 ${mobileTab === 'map' ? 'hidden lg:block' : 'block'}`}>
          {/* 1. Datos Personales y Profesionales */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>1. Identidad, Foto y Credenciales Académicas</span>
              <span className="text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-normal">Datos del perfil</span>
            </h2>

            {/* FOTO DE PERFIL DOCENTE */}
            <div className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Avatar Preview */}
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-teal-600 shadow-md bg-white">
                    {avatar ? <img
                      src={avatar}
                      alt={fullName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><User className="w-10 h-10" aria-label="Sin foto de perfil" /></div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-slate-900 hover:bg-teal-700 text-white rounded-xl shadow-md transition-colors cursor-pointer"
                    title="Cambiar foto de perfil"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Upload & Controls */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Foto de Perfil Docente</h3>
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

                    <button
                      type="button"
                      onClick={() => setAvatar('')}
                      className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer min-h-[34px]"
                      title="Quitar foto de perfil"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Quitar foto</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* URL input field if toggled */}
              {showUrlInput && (
                <div className="pt-2 border-t border-slate-200 animate-in fade-in flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://ejemplo.com/mi-foto.jpg"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-hidden min-h-[42px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Título universitario</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-hidden min-h-[42px]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Universidad o institución</label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-hidden min-h-[42px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Años de experiencia</label>
                <input
                  type="number"
                  min="0"
                  max="80"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-hidden min-h-[42px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tarifa por hora académica (COP)</label>
                <input
                  type="number"
                  step="any"
                  min="10000"
                  max="1000000"
                  value={ratePerHour}
                  onChange={(e) => setRatePerHour(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-hidden min-h-[42px]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 text-xs">
                Biografía y enfoque pedagógico
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:outline-hidden leading-relaxed"
              />
            </div>
          </div>

          {/* 2. Materias impartidas */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200/90 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              2. Materias que Impartes
            </h2>

            <div className="flex flex-wrap gap-1.5">
              {subjects.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-900 text-xs font-semibold border border-teal-200"
                >
                  <span>{s}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubject(s)}
                    className="text-teal-600 hover:text-teal-900 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Agregar otra materia (ej. Física Mecánica)..."
                value={newSubjectInput}
                onChange={(e) => setNewSubjectInput(e.target.value)}
                className="flex-1 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-2 min-h-[42px]"
              />
              <button
                type="button"
                onClick={handleAddSubject}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 min-h-[42px]"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar</span>
              </button>
            </div>
          </div>

          {/* 3. Especialidades Pedagógicas */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200/90 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              3. Especialidades y Enfoques
            </h2>

            <div className="flex flex-wrap gap-1.5">
              {specialties.map((sp) => (
                <span
                  key={sp}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200"
                >
                  <span>{sp}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecialty(sp)}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Nueva especialidad pedagógica..."
                value={newSpecialtyInput}
                onChange={(e) => setNewSpecialtyInput(e.target.value)}
                className="flex-1 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-2 min-h-[42px]"
              />
              <button
                type="button"
                onClick={handleAddSpecialty}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 min-h-[42px]"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar</span>
              </button>
            </div>
          </div>

          {/* 4. Soportes Académicos y Certificados */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  4. Soportes y Diplomas Complementarios
                </h2>
                <p className="text-[11px] text-slate-500">
                  Adjunta certificados, diplomas o soportes académicos en formato PDF, JPG o PNG (máx. 5MB).
                </p>
              </div>
              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                onChange={handleDocumentFileChange}
                className="hidden"
                id="tutor-doc-upload"
              />
              <label
                htmlFor="tutor-doc-upload"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold rounded-lg border border-teal-200 cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Subir soporte</span>
              </label>
            </div>

            {/* Disclaimer legal obligatorio */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Leyenda informativa:</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Los documentos que cargues se mostrarán a los estudiantes con la indicación obligatoria: <span className="font-semibold italic">«Documento aportado por el tutor. Autenticidad no verificada»</span>. No suman puntos en el algoritmo de recomendación.
                </p>
              </div>
            </div>

            {docUploadError && (
              <p role="alert" className="text-xs text-red-600 font-medium">{docUploadError}</p>
            )}

            {/* Document list */}
            <div className="space-y-2">
              {documents.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  No has adjuntado soportes todavía.
                </p>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{doc.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase">{doc.fileType} · {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('es-CO') : 'Reciente'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {doc.dataUrl && (
                        <a
                          href={doc.dataUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors"
                          title="Ver documento"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(doc.id)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar documento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Spatial / Geolocation Map */}
        <div className={`lg:col-span-5 space-y-4 lg:sticky lg:top-20 ${mobileTab === 'form' ? 'hidden lg:block' : 'block'}`}>
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Ubicación y mapa de referencia
                </h3>
                <span className="text-[11px] text-slate-400">Ubicación sin registrar</span>
              </div>
              <span className="text-[11px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded font-mono font-medium">
                AMC
              </span>
            </div>

            {/* Slider for Coverage Radius */}
            <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Radio de referencia:</span>
                <span className="font-bold text-teal-800 font-mono">{coverageRadius.toFixed(1)} km</span>
              </div>
              <input
                type="range"
                aria-label="Radio de referencia"
                min="2"
                max="15"
                step="0.5"
                value={coverageRadius}
                onChange={(e) => setCoverageRadius(parseFloat(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer h-2"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>2 km</span>
                <span>15 km</span>
              </div>
            </div>

            {/* UNIFIED MAP */}
            <div className="w-full">
              <UnifiedCucutaMap
                mode="teacher-profile-edit"
                radiusKm={coverageRadius}
                origin={mapOrigin}
                onOriginChange={setMapOrigin}
                height="h-[280px] sm:h-[340px] lg:h-[380px]"
              />
            </div>

            <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/60 text-xs text-teal-950 space-y-1">
              <span className="font-bold block">Referencia del área metropolitana</span>
              <p className="text-[11px] text-slate-600 leading-tight">
                Guarda el radio que prefieres para tus clases. Tu ubicación permanece privada.
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* STICKY BOTTOM BAR ON MOBILE FOR QUICK SAVE */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3">
        <div className="text-xs text-slate-600 truncate">
          <span>{fullName || 'Perfil docente'}</span>
          {typeof ratePerHour === 'number' && <strong className="text-teal-700"> · ${ratePerHour.toLocaleString('es-CO')}/h</strong>}
        </div>
        <button
          type="submit"
          form="teacher-profile-form"
          disabled={!canSave || saving}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 min-h-[44px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Guardando…' : 'Guardar'}</span>
        </button>
      </div>
    </div>
  );
};
