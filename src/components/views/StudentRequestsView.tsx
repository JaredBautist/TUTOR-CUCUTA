import {getContactNumber} from '../../utils/contact';
import React, { useState } from 'react';
import { ArrowLeft, Clock, CheckCircle2, XCircle, Calendar, Search, UserPen } from 'lucide-react';
import { StudentRequest } from '../../types';

interface StudentRequestsViewProps {
  requests: StudentRequest[];
  onBackToSearch: () => void;
  onCancelRequest: (id: string) => void;
  onSelectTutor?: (tutorId: string) => void;
  onEditProfile?: () => void;
  actionsEnabled?: boolean;
}

export const StudentRequestsView: React.FC<StudentRequestsViewProps> = ({
  requests,
  onBackToSearch,
  onCancelRequest,
  onEditProfile,
  actionsEnabled = false,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'accepted'>('all');

  const filteredRequests = requests.filter((r) => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 pb-24 sm:pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBackToSearch}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a búsqueda de tutores</span>
          </button>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Mis Solicitudes de Tutoría
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Consulta el estado de las solicitudes disponibles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onEditProfile && (
            <button
              type="button"
              onClick={onEditProfile}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-teal-700 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 min-h-[40px] cursor-pointer"
              title="Modificar datos personales, colegio y acudiente"
            >
              <UserPen className="w-3.5 h-3.5 text-teal-600" />
              <span>Editar mis datos</span>
            </button>
          )}

          <button
            type="button"
            onClick={onBackToSearch}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 min-h-[40px] cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Buscar nuevos tutores</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            filterStatus === 'all'
              ? 'bg-teal-700 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Todas ({requests.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('pending')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            filterStatus === 'pending'
              ? 'bg-amber-100 text-amber-900'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          En espera ({requests.filter((r) => r.status === 'pending').length})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('accepted')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            filterStatus === 'accepted'
              ? 'bg-emerald-100 text-emerald-900'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Aceptadas ({requests.filter((r) => r.status === 'accepted').length})
        </button>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No hay solicitudes en esta sección</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Todavía no hay solicitudes disponibles para mostrar.
          </p>
          <button
            type="button"
            onClick={onBackToSearch}
            className="mt-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Explorar tutores
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isAccepted = req.status === 'accepted';
            const isRejected = req.status === 'rejected' || req.status === 'cancelled';

            return (
              <div
                key={req.id}
                className={`bg-white rounded-2xl border p-4 sm:p-6 transition-all shadow-xs ${
                  isAccepted
                    ? 'border-emerald-300 ring-1 ring-emerald-500/20'
                    : 'border-slate-200/90'
                }`}
              >
                {/* Top Row: Tutor Name, Target, Status Badge */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Tutor Asignado / Solicitado
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      {req.targetTutorName || 'Tutor sin identificar'}
                    </h2>
                    <span className="text-xs text-slate-500">
                      Materia: <strong className="text-teal-800">{req.subject}</strong> · {req.focalTopic}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isAccepted ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>¡Solicitud Aceptada!</span>
                      </span>
                    ) : isRejected ? (
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium flex items-center gap-1.5 border border-slate-300">
                        <XCircle className="w-3.5 h-3.5 text-slate-400" />
                        <span>{req.status==='cancelled'?'Cancelada':'No disponible'}</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold flex items-center gap-1.5 border border-amber-200 animate-pulse">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>En espera de respuesta</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Session Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-3.5 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Horario</span>
                    <span className="font-bold text-slate-800">{req.scheduledTime || 'Sin horario registrado'}</span>
                    <span className="text-[10px] text-slate-500 block">{req.durationHours}h sesión</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Modalidad</span>
                    <span className="font-bold text-slate-800 capitalize">{req.modality}</span>
                    <span className="text-[10px] text-slate-500 block">{req.sector || 'Sector sin registrar'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Tarifa por hora</span>
                    <span className="font-bold text-emerald-700 font-mono text-sm">
                      ${req.ratePerHour.toLocaleString('es-CO')} / h
                    </span>
                    <span className="text-[10px] text-slate-500 block">Total: ${req.totalEstimated.toLocaleString('es-CO')}</span>
                  </div>

                  {(req.matchScore !== undefined || req.distanceKm !== undefined) && (
                    <div>
                      {req.matchScore !== undefined && <span className="font-bold text-teal-800 font-mono text-sm">{req.matchScore}% de coincidencia</span>}
                      {req.distanceKm !== undefined && <span className="text-[10px] text-slate-500 block">a {req.distanceKm} km</span>}
                    </div>
                  )}
                </div>

                {/* Direct Student Note */}
                <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/80 mb-3">
                  <strong className="text-slate-700">Tu mensaje para el tutor:</strong> "{req.studentNote}"
                </div>

                {/* Accepted: tutor contact unlock */}
                {isAccepted && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 mb-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>¡Contacto desbloqueado! El tutor ha aceptado tu solicitud.</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      El tutor {req.targetTutorName ? `(${req.targetTutorName}) ` : ''}ha confirmado la sesión para <strong className="font-semibold">{req.scheduledTime}</strong>. Ya pueden coordinar detalles de la clase.
                    </p>
                  </div>
                )}

                {isAccepted && getContactNumber(req.tutorPhone) && <div className="flex flex-wrap gap-3 text-xs mb-3">
                  <a href={`tel:+${getContactNumber(req.tutorPhone)}`} className="text-teal-800 underline">Llamar al tutor: {req.tutorPhone}</a>
                  <a href={`https://wa.me/${getContactNumber(req.tutorPhone)}`} target="_blank" rel="noopener noreferrer" className="text-teal-800 underline">WhatsApp del tutor</a>
                </div>}
                {/* Pending: contact locked notice */}
                {req.status === 'pending' && (
                  <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 mb-3 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Canales de contacto protegidos</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Los canales de contacto directo (WhatsApp y teléfono) se desbloquearán únicamente cuando el tutor acepte tu solicitud.
                    </p>
                  </div>
                )}

                {/* Actions when pending */}
                {(req.status === 'pending' || req.status === 'accepted') && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <span>{actionsEnabled ? 'Solicitud pendiente de respuesta.' : 'La gestión de solicitudes estará disponible al conectar tu cuenta.'}</span>
                    <button
                      type="button"
                      onClick={() => onCancelRequest(req.id)}
                      disabled={!actionsEnabled}
                      className="text-rose-600 hover:text-rose-800 font-semibold underline cursor-pointer disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                      Cancelar solicitud
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
