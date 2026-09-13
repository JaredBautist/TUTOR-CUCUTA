import React, { useState, useRef } from 'react';
import { X, MapPin, DollarSign } from 'lucide-react';
import { requestProfileError } from '../../features/marketplace/domain/contracts';
import { Tutor, StudentRequest, StudentProfile } from '../../types';

interface RequestTutorModalProps {
  tutor: Tutor;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newRequest?: Partial<StudentRequest>) => Promise<void> | void;
  defaultSubject?: string;
  studentProfile?: StudentProfile;
  submissionEnabled?: boolean;
}

export const RequestTutorModal: React.FC<RequestTutorModalProps> = ({
  tutor,
  isOpen,
  onClose,
  onConfirm,
  defaultSubject = '',
  studentProfile,
  submissionEnabled = false,
}) => {
  const [studentName] = useState(studentProfile?.name || '');
  const [subject, setSubject] = useState(tutor.subjects.includes(defaultSubject)?defaultSubject:'');
  const [modality, setModality] = useState<'presencial' | 'virtual' | ''>(tutor.modalities[0] || '');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState(1);
  const [note, setNote] = useState('');
  const [submitting,setSubmitting]=useState(false);const [submitError,setSubmitError]=useState('');
  const inFlight=useRef(false);const submission=useRef<{signature:string;id:string} | undefined>(undefined);
  if (!isOpen) return null;

  const totalCost = tutor.ratePerHour * duration;
  const profileError=requestProfileError(studentProfile);
  const canSubmit = submissionEnabled && Boolean(studentProfile?.id) && !profileError && !submitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || inFlight.current || !selectedDay || !selectedTime || !subject || !modality) return;
    const startsAt=`${selectedDay}T${selectedTime}:00-05:00`;
    const signature=JSON.stringify([tutor.id,subject,modality,startsAt,duration,note]);
    if(submission.current && submission.current.signature!==signature) {
      setSubmitError('Si el envío anterior falló, consulta Mis Solicitudes antes de cambiarlo y crear otro. Cierra y abre el formulario para un nuevo envío.');return;
    }
    submission.current ??= {signature,id:crypto.randomUUID()};
    inFlight.current=true;setSubmitting(true);setSubmitError('');
    try {await onConfirm({id:submission.current.id,subject,modality,startsAt,durationHours:duration,studentNote:note});}
    catch(error){setSubmitError(error instanceof Error?error.message:'No se pudo confirmar el envío.');}
    finally{inFlight.current=false;setSubmitting(false);}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div role="dialog" aria-modal="true" aria-labelledby="request-tutor-title" className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-bottom-2 duration-200">
        <button
          type="button"
          onClick={onClose} disabled={submitting}
          aria-label="Cerrar solicitud"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded">
              Nueva Solicitud Académica
            </span>
            <h2 id="request-tutor-title" className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
              Solicitar tutoría con {tutor.name}
            </h2>
            <p className="text-xs text-slate-500">
              {[tutor.title, tutor.institution].filter(Boolean).join(' · ')}
            </p>
          </div>

          {!canSubmit && (
            <p role="status" className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              {profileError || (submitting ? 'Guardando solicitud…' : 'Inicia sesión para enviar una solicitud.')}
            </p>
          )}

          {submitError && <p role="alert" className="p-3 text-xs text-red-700 bg-red-50 rounded-xl">{submitError}</p>}
          {/* Quick Details Pill Box */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
            <div className="flex items-center gap-2 text-slate-700 truncate">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">{tutor.sector || 'Sector sin registrar'}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 truncate">
              <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold text-emerald-700 truncate">
                ${tutor.ratePerHour.toLocaleString('es-CO')} / h
              </span>
            </div>
          </div>

          {/* Student Name & Modality */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del estudiante</label>
              <input
                type="text"
                value={studentName}
                readOnly
                required
                placeholder="Nombre del estudiante"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-hidden min-h-[42px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Modalidad preferida</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModality('presencial')}
                  disabled={!tutor.modalities.includes('presencial')}
                  className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${modality === 'presencial'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                >
                  Presencial AMC
                </button>
                <button
                  type="button"
                  onClick={() => setModality('virtual')}
                  disabled={!tutor.modalities.includes('virtual')}
                  className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${modality === 'virtual'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                >
                  Virtual en vivo
                </button>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="request-subject" className="block text-xs font-semibold text-slate-700 mb-1">Materia</label>
            <select
              id="request-subject"
              value={subject}
              required
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-500 min-h-[44px]"
            >
              <option value="">Selecciona una materia</option>
              {subject && !tutor.subjects.includes(subject) && <option value={subject}>{subject}</option>}
              {tutor.subjects.map(tutorSubject => <option key={tutorSubject} value={tutorSubject}>{tutorSubject}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold">Fecha propuesta · Colombia<input type="date" required value={selectedDay} onChange={event=>setSelectedDay(event.target.value)} className="block w-full border border-slate-300 rounded-lg p-2.5 mt-1" /></label>
            <label className="text-xs font-semibold">Hora de inicio · Colombia<input type="time" required value={selectedTime} onChange={event=>setSelectedTime(event.target.value)} className="block w-full border border-slate-300 rounded-lg p-2.5 mt-1" /></label>
          </div>
          {/* Duration */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">Duración de la sesión</label>
              <span className="text-xs font-bold text-slate-900">{duration} horas ({duration * 60} min)</span>
            </div>
            <input
              type="range"
              min="1"
              max="3"
              step="0.5"
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value))}
              className="w-full accent-teal-600 cursor-pointer h-2"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mensaje o tema específico a preparar
            </label>
            <textarea
              rows={2}
              maxLength={2000} value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
            />
          </div>

          {/* Total Price Summary */}
          <div className="flex items-center justify-between p-3 bg-teal-50/70 border border-teal-200/80 rounded-xl text-sm">
            <div>
              <span className="text-xs text-teal-800 block">Total estimado de la sesión:</span>
              <span className="text-base sm:text-lg font-bold text-teal-950 font-mono">
                ${totalCost.toLocaleString('es-CO')} COP
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose} disabled={submitting}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow transition-all hover:shadow-md min-h-[44px]"
            >
              {canSubmit ? 'Confirmar y enviar solicitud' : 'Envío no disponible'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
