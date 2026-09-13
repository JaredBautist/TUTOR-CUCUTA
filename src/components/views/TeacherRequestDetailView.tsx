import React from 'react';
import { ArrowLeft, CheckCircle2, XCircle, UserCheck, ShieldCheck, Phone } from 'lucide-react';
import { StudentRequest } from '../../types';
import { UnifiedCucutaMap } from '../common/UnifiedCucutaMap';
import { getContactNumber } from '../../utils/contact';

interface TeacherRequestDetailViewProps {
  request: StudentRequest;
  onBack: () => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  actionsEnabled?: boolean;
}

export const TeacherRequestDetailView: React.FC<TeacherRequestDetailViewProps> = ({
  request,
  onBack,
  onAccept,
  onReject,
  actionsEnabled = false,
}) => {
  const actionDone = request.status === 'pending' ? null : request.status;
  const guardianContact = request.status === 'accepted'
    ? getContactNumber(request.studentPhone || (request.guardianLinked ? request.guardianPhone : undefined))
    : undefined;

  const handleAccept = () => {
    if (actionsEnabled && request.status === 'pending') onAccept(request.id);
  };

  const handleReject = () => {
    if (actionsEnabled && request.status === 'pending') onReject(request.id);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 pb-32 sm:pb-12">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200/90 px-3 py-2 rounded-xl shadow-xs transition-colors min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al panel</span>
        </button>

        <span className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2.5 py-1 rounded-lg">
          ID: {request.id}
        </span>
      </div>

      {/* Main Request Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-slate-900 text-white font-bold flex items-center justify-center text-base sm:text-xl shadow-xs shrink-0 overflow-hidden">
              {request.studentAvatarUrl ? (
                <img
                  src={request.studentAvatarUrl}
                  alt={request.studentName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                request.avatarInitials
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 truncate">
                  {request.studentName}
                </h1>
                {request.age !== undefined && <span className="text-xs text-slate-500 font-medium">({request.age} años)</span>}
                {request.guardianLinked && (
                  <span className="text-[10px] sm:text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-blue-600" />
                    Acudiente vinculado
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                {[request.grade, request.sector].filter(Boolean).join(' · ') || 'Información académica y ubicación sin registrar'}
              </p>
            </div>
          </div>

          {request.matchScore !== undefined && <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-full flex items-center gap-1.5 shadow-xs">
              <span className="text-sm font-extrabold">{request.matchScore}%</span>
              <span>Coincidencia estimada</span>
            </span>
          </div>}
        </div>

        {/* Action Status Banner if decided */}
        {actionDone === 'cancelled' && <p role="status" className="text-sm text-slate-600">El estudiante canceló esta solicitud.</p>}
        {actionDone === 'accepted' && (
          <div className="p-3 sm:p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Solicitud aceptada.</span>
            </div>
            <p className="text-slate-600">
              {guardianContact ? `Contacto autorizado: ${request.studentPhone || request.guardianPhone}.` : 'No hay un contacto autorizado registrado.'}
              {guardianContact && <a className="block underline mt-2" href={`tel:+${guardianContact}`}>Llamar al contacto autorizado</a>}
              {request.scheduledTime && ` Horario solicitado: ${request.scheduledTime}.`}
            </p>
          </div>
        )}

        {actionDone === 'rejected' && (
          <div className="p-3 sm:p-4 bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs flex items-center gap-2">
            <XCircle className="w-4 h-4 text-slate-500" />
            <span>Solicitud rechazada.</span>
          </div>
        )}
      </div>

      {/* Detail Columns: Information (Left) vs Spatial/Actions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Pedagogical Details */}
        <div className="lg:col-span-7 space-y-5 sm:space-y-6">
          {/* 1. Motivo y tema central de la solicitud */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200/90 shadow-xs space-y-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              Motivo pedagógico y tema central
            </h2>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Materia solicitada</span>
                <span className="font-bold text-teal-800 text-sm">{request.subject}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tema específico</span>
                <span className="font-semibold text-slate-900">{request.focalTopic}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Objetivo del estudiante</span>
                <span className="text-slate-700">{request.goal}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-700 block mb-1">
                Mensaje del estudiante:
              </span>
              <blockquote className="p-3 bg-teal-50/50 border-l-4 border-teal-600 text-xs text-slate-700 italic rounded-r-lg">
                "{request.studentNote}"
              </blockquote>
            </div>

            {/* Learning styles and preferences */}
            <div className="pt-2">
              <span className="text-xs font-semibold text-slate-700 block mb-1.5">
                Estilos y preferencias de aprendizaje de {request.studentName.split(' ')[0]}:
              </span>
              {((request.learningPreferences && request.learningPreferences.length > 0) ||
                (request.learningStyles && request.learningStyles.length > 0)) ? (
                <div className="flex flex-wrap gap-1.5">
                  {(request.learningPreferences || request.learningStyles || []).map((style) => (
                    <span
                      key={style}
                      className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200/60 font-medium"
                    >
                      ✓ {style}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-500 italic">No especificado</span>
              )}
            </div>
          </div>

          {/* 2. Logística y condiciones económicas */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200/90 shadow-xs space-y-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              Condiciones de la sesión
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Modalidad</span>
                <span className="font-bold text-slate-900 capitalize text-sm">{request.modality}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Fecha y franja</span>
                <span className="font-bold text-slate-900 text-sm">{request.scheduledTime || 'Horario por definir'}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{request.durationHours} hora académica</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total estimado</span>
                <span className="font-bold text-emerald-700 font-mono text-base">
                  ${request.totalEstimated.toLocaleString('es-CO')}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">COP</span>
              </div>
            </div>
          </div>

          {/* 3. Acudiente e Información de Seguridad */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200/90 shadow-xs space-y-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>Información de acudiente y seguridad</span>
              {request.age !== undefined && request.age < 18 && <span className="text-xs text-blue-700 font-normal">Menor de edad</span>}
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50/60 border border-blue-100">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-slate-700">
                  <strong>Acudiente responsable:</strong> {request.guardianName || 'Sin registrar'}
                </span>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-slate-700">
                  <strong>Contacto autorizado:</strong> {guardianContact ? <a className="text-teal-700 underline" href={`tel:+${guardianContact}`}>{request.studentPhone || request.guardianPhone}</a> : 'No disponible'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Spatial Geolocation Map & Actions */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-20">
          {/* Card: Geolocation Route */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Ubicación de referencia
              </span>
              {request.distanceKm !== undefined && <span className="text-[11px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded font-mono font-medium">
                Distancia: {request.distanceKm} km
              </span>}
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-900">
                {request.sector || 'Sector sin registrar'}
              </h3>
              <p className="text-[11px] text-slate-500">
                No hay una ruta de traslado calculada.
              </p>
            </div>

            {/* UNIFIED MAP */}
            <div className="w-full">
              <UnifiedCucutaMap
                mode="teacher-request"
                height="h-[240px] sm:h-[280px]"
              />
            </div>
          </div>

          {/* Teacher Decision Box (Desktop) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-md space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              ¿Deseas atender esta solicitud?
            </h3>

            {!actionsEnabled && <p className="text-xs text-slate-500">La gestión de solicitudes estará disponible cuando tu cuenta docente esté vinculada.</p>}

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleReject}
                disabled={!actionsEnabled || actionDone !== null}
                className="flex-1 py-3 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors min-h-[44px] cursor-pointer"
              >
                Rechazar
              </button>

              <button
                type="button"
                onClick={handleAccept}
                disabled={!actionsEnabled || actionDone !== null}
                className="flex-1 py-3 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all min-h-[44px] cursor-pointer"
              >
                Aceptar solicitud
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM ACTION BAR (When action not yet completed) */}
      {actionDone === null && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2.5 shadow-2xl flex items-center gap-2">
          <button
            type="button"
            onClick={handleReject}
            disabled={!actionsEnabled}
            className="flex-1 py-2.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl min-h-[44px] cursor-pointer"
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={!actionsEnabled}
            className="flex-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md min-h-[44px] cursor-pointer"
          >
            Aceptar (${request.totalEstimated.toLocaleString('es-CO')})
          </button>
        </div>
      )}
    </div>
  );
};
