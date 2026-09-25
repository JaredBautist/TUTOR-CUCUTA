import React, { useState } from 'react';
import { CheckCircle2, MapPin, DollarSign, Calendar, ArrowRight, UserCheck, List, Map, MessageCircle, RotateCcw } from 'lucide-react';
import { StudentRequest } from '../../types';
import { UnifiedCucutaMap } from '../common/UnifiedCucutaMap';
import { getContactNumber } from '../../utils/contact';
import type { SearchOrigin } from '../../features/maps/domain/contracts';
import { CUCUTA_REFERENCE_ORIGIN } from '../../features/maps/domain/geography';

interface TeacherDashboardViewProps {
  requests: StudentRequest[];
  onSelectRequest: (request: StudentRequest) => void;
  onAcceptRequest: (id: string) => void;
  onRejectRequest: (id: string) => void;
  onEditProfile: () => void;
  teacherName?: string;
  actionsEnabled?: boolean;
}

export const TeacherDashboardView: React.FC<TeacherDashboardViewProps> = ({
  requests,
  onSelectRequest,
  onAcceptRequest,
  onRejectRequest,
  onEditProfile,
  teacherName,
  actionsEnabled = false,
}) => {
  const [activeRadius, setActiveRadius] = useState(5.0);
  const [mapOrigin, setMapOrigin] = useState<SearchOrigin>(CUCUTA_REFERENCE_ORIGIN);
  const [mobileTab, setMobileTab] = useState<'requests' | 'map'>('requests');
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'accepted'>('all');

  const handleQuickAccept = (id: string) => {
    if (actionsEnabled) onAcceptRequest(id);
  };

  const handleQuickReject = (id: string) => {
    if (actionsEnabled) onRejectRequest(id);
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const acceptedCount = requests.filter((r) => r.status === 'accepted').length;

  const filteredRequests = requests.filter((r) => {
    if (requestFilter === 'pending') return r.status === 'pending';
    if (requestFilter === 'accepted') return r.status === 'accepted';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 pb-28 sm:pb-12">
      {/* Welcome Heading and Status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {teacherName ? `Hola, ${teacherName}. Administra tus tutorías` : 'Panel de tutorías'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Consulta las solicitudes registradas y los datos de tu perfil docente.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>{teacherName ? 'Perfil docente' : 'Sin cuenta docente vinculada'}</span>
          </span>
          <button
            type="button"
            onClick={onEditProfile}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors min-h-[36px]"
          >
            Editar perfil
          </button>
        </div>
      </div>

      {!actionsEnabled && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-medium">
          La gestión de solicitudes estará disponible cuando tu cuenta docente esté vinculada.
        </div>
      )}

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-base shrink-0">
            {requests.length}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Solicitudes registradas</div>
            <div className="text-[11px] text-slate-500">Total de solicitudes disponibles en el panel.</div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-base shrink-0">
            {requests.filter((r) => r.status === 'pending').length}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Solicitudes pendientes</div>
            <div className="text-[11px] text-slate-500">Solicitudes que aún no tienen respuesta.</div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-base shrink-0">
            {acceptedCount}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Solicitudes aceptadas</div>
            <div className="text-[11px] text-slate-500">Consulta el horario registrado en cada solicitud.</div>
          </div>
        </div>
      </div>

      {/* Mobile-Only Tab Switcher: Requests vs Coverage Map */}
      <div className="lg:hidden flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setMobileTab('requests')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'requests'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <List className="w-4 h-4 text-teal-600" />
          <span>Solicitudes ({requests.length})</span>
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
          <span>Mapa de cobertura</span>
        </button>
      </div>

      {/* Main Grid: Requests Feed (Left) vs UNIFIED CUCUTA MAP (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Compatible Requests */}
        <div className={`lg:col-span-7 space-y-4 sm:space-y-5 ${mobileTab === 'map' ? 'hidden lg:block' : 'block'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Solicitudes de tutoría
              </h2>
              <p className="text-xs text-slate-500">
                Consulta su materia, horario y estado.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setRequestFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                  requestFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas ({requests.length})
              </button>
              <button
                type="button"
                onClick={() => setRequestFilter('pending')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                  requestFilter === 'pending'
                    ? 'bg-white text-teal-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pendientes ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setRequestFilter('accepted')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                  requestFilter === 'accepted'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Aceptadas ({acceptedCount})
              </button>
            </div>
          </div>

          {/* List of Student Requests */}
          <div className="space-y-3.5 sm:space-y-4">
            {filteredRequests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-700">No hay solicitudes en este estado.</p>
                <p className="text-xs text-slate-400">
                  {requestFilter === 'accepted'
                    ? 'Las solicitudes aceptadas aparecerán aquí.'
                    : 'Actualmente no tienes solicitudes pendientes.'}
                </p>
              </div>
            ) : (
              filteredRequests.map((req) => {
                const isAccepted = req.status === 'accepted';
                const isRejected = req.status === 'rejected' || req.status === 'cancelled';
                const guardianContact = isAccepted && req.guardianLinked ? getContactNumber(req.guardianPhone) : undefined;

                return (
                  <div
                    key={req.id}
                    className={`bg-white rounded-xl border p-4 sm:p-5 shadow-xs transition-all space-y-3 sm:space-y-4 ${
                      isAccepted
                        ? 'border-emerald-300 ring-1 ring-emerald-500/20 bg-emerald-50/10'
                        : isRejected
                        ? 'border-slate-200 opacity-60'
                        : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    {/* Header Row: Student name, grade, match */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs sm:text-sm shrink-0 overflow-hidden">
                          {req.studentAvatarUrl ? (
                            <img
                              src={req.studentAvatarUrl}
                              alt={req.studentName}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            req.avatarInitials
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">{req.studentName}</h3>
                            {req.age !== undefined && <span className="text-[11px] text-slate-500">({req.age} a.)</span>}
                            {req.guardianLinked && (
                              <span className="text-[9px] sm:text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                                <UserCheck className="w-3 h-3" />
                                <span className="hidden xs:inline">Acudiente</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-500 truncate">{req.grade}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isAccepted ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] sm:text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            Aceptada
                          </span>
                        ) : isRejected ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px]">
                            {req.status==='cancelled'?'Cancelada':'Descartada'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] sm:text-xs font-bold">
                            Pendiente
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Subject and Specific Topic */}
                    <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">
                          Materia: <strong className="text-teal-700">{req.subject}</strong>
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          {req.goal}
                        </span>
                      </div>

                      {req.focalTopic.trim() && <div className="text-slate-600 text-[11px] sm:text-xs">
                        <strong>Tema:</strong> {req.focalTopic}
                      </div>}

                      {/* Student note blockquote */}
                      <p className="text-slate-600 italic bg-white p-2 rounded-lg border border-slate-200/60 leading-relaxed text-[11px]">
                        "{req.studentNote}"
                      </p>
                    </div>

                    {/* Logistics Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                      <div className="flex items-center gap-1 text-slate-700 truncate">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{req.scheduledTime || 'Horario por definir'}</span>
                      </div>

                      <div className="flex items-center gap-1 text-slate-700 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{req.distanceKm !== undefined ? `a ${req.distanceKm} km` : (req.sector || 'Ubicación sin registrar')}</span>
                      </div>

                      <div className="flex items-center gap-1 text-slate-700 truncate">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-emerald-700 truncate">
                          ${req.ratePerHour.toLocaleString('es-CO')} / h
                        </span>
                      </div>

                      <div className="text-right text-slate-500 text-[11px] col-span-2 sm:col-span-1">
                        Total: <strong className="text-slate-900">${req.totalEstimated.toLocaleString('es-CO')}</strong>
                      </div>
                    </div>

                    {/* Action Buttons: Responsive on phones */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => onSelectRequest(req)}
                        className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center justify-center sm:justify-start gap-1 py-1 cursor-pointer"
                      >
                        <span>Ver solicitud completa</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex flex-wrap items-center gap-2">
                        {isAccepted ? (
                          <>
                            {guardianContact && <a
                              href={`https://wa.me/${guardianContact}?text=${encodeURIComponent(
                                `Hola${req.guardianName ? ` ${req.guardianName}` : ''}, te contacto sobre la tutoría de ${req.subject} solicitada para ${req.studentName}.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors min-h-[40px]"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp Acudiente</span>
                            </a>}
                            <button
                              type="button"
                              onClick={() => handleQuickReject(req.id)}
                              disabled={!actionsEnabled}
                              className="px-2.5 py-2 sm:py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 text-xs min-h-[40px] cursor-pointer"
                              title="Descartar o archivar"
                            >
                              Descartar
                            </button>
                          </>
                        ) : isRejected ? (
                          <button
                            type="button"
                            onClick={() => handleQuickAccept(req.id)}
                            disabled={!actionsEnabled}
                            className="px-3 py-2 sm:py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 min-h-[40px] cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reactivar</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleQuickReject(req.id)}
                              disabled={!actionsEnabled}
                              className="flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors text-center min-h-[40px] cursor-pointer"
                            >
                              Rechazar
                            </button>

                            <button
                              type="button"
                              onClick={() => handleQuickAccept(req.id)}
                              disabled={!actionsEnabled}
                              className="flex-1 sm:flex-initial px-4 py-2 sm:py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors text-center min-h-[40px] cursor-pointer"
                            >
                              Aceptar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: UNIFIED MAP + Coverage */}
        <div className={`lg:col-span-5 space-y-4 lg:sticky lg:top-20 ${mobileTab === 'requests' ? 'hidden lg:block' : 'block'}`}>
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Mapa de referencia
                </h3>
                <span className="text-[11px] text-slate-400">Área Metropolitana de Cúcuta</span>
              </div>
              <span className="text-[11px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded font-mono font-medium">
                AMC
              </span>
            </div>

            {/* Radius slider */}
            <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Radio de referencia:</span>
                <span className="font-bold text-teal-800 font-mono">{activeRadius.toFixed(1)} km</span>
              </div>
              <input
                type="range"
                aria-label="Radio de referencia"
                min="2"
                max="12"
                step="0.5"
                value={activeRadius}
                onChange={(e) => setActiveRadius(parseFloat(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer h-2"
              />
            </div>

            {/* UNIFIED MAP */}
            <div className="w-full">
              <UnifiedCucutaMap
                mode="teacher-dashboard"
                radiusKm={activeRadius}
                origin={mapOrigin}
                onOriginChange={setMapOrigin}
                height="h-[280px] sm:h-[340px] lg:h-[380px]"
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              La ubicación de las solicitudes se mostrará cuando existan coordenadas registradas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
