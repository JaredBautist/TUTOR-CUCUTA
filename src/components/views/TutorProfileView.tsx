import React from 'react';
import { ArrowLeft, Bookmark, FileText, MapPin } from 'lucide-react';
import { Tutor } from '../../types';
import { UnifiedCucutaMap } from '../common/UnifiedCucutaMap';
import { DocumentsPanel } from '../marketplace/DocumentsPanel';

interface TutorProfileViewProps {
  tutor: Tutor;
  isSaved?: boolean;
  favoritesDisabled?: boolean;
  onToggleSave?: () => void;
  onBack: () => void;
  onRequestTutor: (tutor: Tutor) => void;
}

export const TutorProfileView: React.FC<TutorProfileViewProps> = ({
  tutor,
  isSaved = false,
  favoritesDisabled = false,
  onToggleSave,
  onBack,
  onRequestTutor,
}) => {

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 pb-32 sm:pb-12">
      {/* Top Breadcrumb / Nav */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200/90 px-3 py-2 rounded-xl shadow-xs transition-colors min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a resultados</span>
        </button>

        {onToggleSave && <button
          type="button"
          disabled={favoritesDisabled}
          onClick={onToggleSave}
          aria-pressed={isSaved}
          aria-label={isSaved ? 'Quitar de favoritos' : 'Guardar en favoritos'}
          className={`p-2.5 rounded-xl border transition-colors disabled:opacity-50 disabled:cursor-wait ${isSaved ? 'bg-amber-50 border-amber-300 text-amber-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
        >
          <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
        </button>}
      </div>

      {/* Header Profile Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          <div className="flex items-center sm:items-start gap-3 sm:gap-0 w-full sm:w-auto">
            {tutor.avatar ? (
              <img src={tutor.avatar} alt={tutor.name} className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-slate-100 shadow-sm shrink-0" />
            ) : (
              <span aria-label={`Perfil de ${tutor.name}`} className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-teal-50 text-teal-800 text-2xl font-bold flex items-center justify-center shrink-0">
                {tutor.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('') || 'T'}
              </span>
            )}
            {/* On mobile, display name right next to avatar */}
            <div className="sm:hidden flex-1 min-w-0">
              <h1 className="text-xl font-extrabold text-slate-900 leading-tight truncate">
                {tutor.name}
              </h1>
              <p className="text-xs text-slate-600 font-medium truncate">
                {[tutor.title, tutor.institution].filter(Boolean).join(' · ')}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                {tutor.matchScore !== undefined && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold rounded-full">
                  {tutor.matchScore}% de coincidencia
                </span>}
                <span className="text-[11px] font-semibold text-slate-700">
                  ${tutor.ratePerHour.toLocaleString('es-CO')} / h
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-2.5 w-full">
            <div className="hidden sm:flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                  {tutor.name}
                </h1>
                <p className="text-sm text-slate-600 font-medium">
                  {[tutor.title, tutor.institution].filter(Boolean).join(' · ')}
                </p>
              </div>

              {tutor.matchScore !== undefined && (
                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-full">
                  {tutor.matchScore}% de coincidencia
                </span>
              )}
            </div>

            {/* Badges Carousel / Row */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="bg-slate-100 text-slate-700 border border-slate-200/70 px-2.5 py-1 rounded-md font-medium flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Información declarada
              </span>

              <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium">
                {tutor.experienceYears === null ? 'Experiencia sin registrar' : `${tutor.experienceYears} años de experiencia`}
              </span>

              <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium">
                ${tutor.ratePerHour.toLocaleString('es-CO')} COP / h
              </span>

              <span className="bg-blue-50 text-blue-800 px-2.5 py-1 rounded-md font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                {tutor.sector || 'Sector sin registrar'}{tutor.distanceKm !== undefined && ` (a ${tutor.distanceKm} km)`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Details (Left) vs Spatial/Booking Sidebar (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Pedagogical Details */}
        <div className="lg:col-span-7 space-y-5 sm:space-y-6">
          {/* 1. Tutor biography */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200/90 shadow-xs space-y-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              Sobre {tutor.name.split(' ')[0]}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {tutor.bio || 'El docente aún no ha añadido una presentación.'}
            </p>

            {/* Pedagogical Badges */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tutor.specialties.map((spec) => (
                <span
                  key={spec}
                  className="text-xs bg-slate-100 text-slate-800 font-medium px-2.5 py-1 rounded-lg border border-slate-200/60"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>

          {/* 2. Teaching methodology */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200/90 shadow-xs space-y-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              ¿Cómo desarrolla sus tutorías?
            </h2>

            <div className="space-y-2.5">
              {tutor.methodologySteps.length === 0 && <p className="text-xs text-slate-500">Metodología sin registrar.</p>}
              {tutor.methodologySteps.map((step) => (
                <div
                  key={step.step}
                  className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-100 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {step.step}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{step.title}</h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Materias y niveles atendidos */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              Materias y niveles atendidos
            </h2>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Materias principales
              </span>
              <div className="flex flex-wrap gap-1.5">
                {tutor.subjects.length === 0 && <p className="text-xs text-slate-500">Materias sin registrar.</p>}
                {tutor.subjects.map((s) => (
                  <span
                    key={s}
                    className="text-xs bg-teal-50 text-teal-800 px-3 py-1 rounded-md font-medium border border-teal-100"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Niveles educativos
              </span>
              <div className="flex flex-wrap gap-1.5">
                {tutor.levels.length === 0 && <p className="text-xs text-slate-500">Niveles sin registrar.</p>}
                {tutor.levels.map((lvl) => (
                  <span
                    key={lvl}
                    className="text-xs bg-slate-100 text-slate-800 px-3 py-1 rounded-md font-medium"
                  >
                    {lvl}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <DocumentsPanel key={tutor.id} tutorId={tutor.id} />

        </div>

        {/* Right Column: Spatial Geolocation & Action Cards */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-20">
          {tutor.matchScore !== undefined && tutor.matchReasons.length > 0 && (
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-2.5">
              <h2 className="text-xs font-bold text-slate-700">Coincidencia: {tutor.matchScore}%</h2>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {tutor.matchReasons.map((reason, index) => <li key={index}>{reason}</li>)}
              </ul>
            </div>
          )}

          {/* Approximate service area */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Zona de atención
              </span>

            </div>

            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-900">
                {tutor.sector || 'Sector sin registrar'}{tutor.distanceKm !== undefined && ` · A ${tutor.distanceKm} km`}
              </h3>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                El mapa muestra únicamente ubicaciones registradas.
              </p>
            </div>

            {/* Registered locations */}
            <div className="w-full">
              <UnifiedCucutaMap
                mode="profile-route"
                tutors={[tutor]}
                selectedTutorId={tutor.id}
                height="h-[240px] sm:h-[280px]"
              />
            </div>
          </div>

          {/* Booking CTA Card (Visible on Desktop / Tablet) */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Tarifa por hora:</span>
                <span className="text-2xl font-extrabold text-white font-mono">
                  ${tutor.ratePerHour.toLocaleString('es-CO')} COP
                </span>
              </div>

            </div>

            <button
              type="button"
              onClick={() => onRequestTutor(tutor)}
              className="w-full py-3.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <span>Solicitar tutoría con {tutor.name.split(' ')[0]}</span>
            </button>

            <p className="text-[11px] text-slate-400 text-center">
              Las solicitudes estarán disponibles cuando la cuenta esté conectada.
            </p>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM BOOKING BAR (Only on screen < lg) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] text-slate-400 block font-semibold">Tarifa por hora:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-extrabold text-slate-900 font-mono">
              ${tutor.ratePerHour.toLocaleString('es-CO')}
            </span>
            {tutor.matchScore !== undefined && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
              {tutor.matchScore}%
            </span>}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRequestTutor(tutor)}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
        >
          <span>Solicitar tutoría</span>
        </button>
      </div>
    </div>
  );
};
