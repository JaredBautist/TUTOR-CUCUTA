import React, { useState } from 'react';
import { X, MapPin, DollarSign } from 'lucide-react';
import { Tutor, StudentRequest, StudentProfile } from '../../types';

interface RequestTutorModalProps {
  tutor: Tutor;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newRequest?: Partial<StudentRequest>) => void;
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
  const [studentName, setStudentName] = useState(studentProfile?.name || '');
  const [subject, setSubject] = useState(defaultSubject);
  const [modality, setModality] = useState<'presencial' | 'virtual' | ''>(tutor.modalities[0] || '');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState(1);
  const [note, setNote] = useState('');
  if (!isOpen) return null;

  const totalCost = tutor.ratePerHour * duration;
  const canSubmit = submissionEnabled && Boolean(studentProfile?.id) && Boolean(studentName.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !selectedDay || !selectedTime || !subject || !modality) return;

    const cleanInitials = studentName.trim()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('');

    const newRequest: Partial<StudentRequest> = {
      studentName: studentName.trim(),
      age: studentProfile?.age,
      grade: studentProfile?.grade || '',
      guardianLinked: studentProfile?.guardianAuthorized ?? false,
      guardianName: studentProfile?.guardianName || undefined,
      guardianPhone: studentProfile?.guardianPhone || undefined,
      avatarInitials: cleanInitials || 'ES',
      studentAvatarUrl: studentProfile?.avatarUrl,
      sector: studentProfile?.sector || '',
      subject,
      focalTopic: note.slice(0, 50),
      goal: studentProfile?.academicGoal || '',
      studentNote: note,
      learningPreferences: studentProfile?.learningStyles || [],
      learningStyles: studentProfile?.learningStyles || [],
      scheduledTime: `${selectedDay} ${selectedTime}`,
      durationHours: duration,
      ratePerHour: tutor.ratePerHour,
      totalEstimated: totalCost,
      modality: modality,
      status: 'pending',
      targetTutorId: tutor.id,
      targetTutorName: tutor.name,
      createdAt: new Date().toISOString(),
      matchCriteriaChecklist: [],
    };

    onConfirm(newRequest);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div role="dialog" aria-modal="true" aria-labelledby="request-tutor-title" className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-bottom-2 duration-200">
        <button
          type="button"
          onClick={onClose}
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
              El envío de solicitudes aún no está disponible. Se habilitará cuando puedas acceder con tu cuenta.
            </p>
          )}

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
                onChange={(e) => setStudentName(e.target.value)}
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

          {/* Proposed schedule; no availability is inferred. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Día propuesto</label>
              <select
                required
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-hidden min-h-[44px]"
              >
                <option value="">Selecciona un día</option>
                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hora de inicio</label>
              <select
                required
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-hidden min-h-[44px]"
              >
                <option value="">Selecciona una hora</option>
                <option value="3:30 p.m.">3:30 p.m.</option>
                <option value="4:00 p.m.">4:00 p.m.</option>
                <option value="4:30 p.m.">4:30 p.m.</option>
                <option value="5:00 p.m.">5:00 p.m.</option>
                <option value="6:00 p.m.">6:00 p.m.</option>
              </select>
            </div>
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
              value={note}
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
              onClick={onClose}
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
