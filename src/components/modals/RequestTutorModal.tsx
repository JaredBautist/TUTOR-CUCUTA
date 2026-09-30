import { useEffect, useLayoutEffect, useState, useRef, type FormEvent, type MutableRefObject } from 'react';
import { X } from 'lucide-react';
import { requestProfileError } from '../../features/marketplace/domain/contracts';
import { proposeBookingSlots } from '../../features/marketplace/domain/bookingSlots';
import { bookingDefaults, composeBookingNote, BOOKING_NOTE_LIMIT, type BookingSearchContext } from '../../features/marketplace/application/bookingContext';
import { WeeklyAvailability } from '../marketplace/WeeklyAvailability';
import type { Tutor, StudentRequest, StudentProfile } from '../../types';

export interface BookingAttempt { signature:string; id:string }
interface RequestTutorModalProps {
  tutor:Tutor; isOpen:boolean; onClose:()=>void;
  onConfirm:(request?:Partial<StudentRequest>)=>Promise<void>|void;
  defaultSubject?:string; searchContext?:BookingSearchContext; studentProfile?:StudentProfile;
  submissionEnabled?:boolean; attemptRef?:MutableRefObject<BookingAttempt|undefined>;
  onCheckRequests?:()=>void; onRefreshOffer?:()=>Promise<void>;
}
/** Accessible proposal form. The server validates the current offer; this is not a reservation. */
export function RequestTutorModal({tutor,isOpen,onClose,onConfirm,defaultSubject='',searchContext,studentProfile,submissionEnabled=false,attemptRef,onCheckRequests,onRefreshOffer}:RequestTutorModalProps) {
  const context=searchContext ?? {subject:defaultSubject,modality:'any',specificTopic:'',studentNote:''};
  const defaults=bookingDefaults(tutor,context);
  const [subject,setSubject]=useState(defaults.subject);
  const [modality,setModality]=useState(defaults.modality);
  const [selectedDay,setSelectedDay]=useState('');
  const [selectedTime,setSelectedTime]=useState('');
  const [duration,setDuration]=useState(60);
  const [note,setNote]=useState(()=>composeBookingNote(context).text);
  const [pending,setPending]=useState(false);
  const [error,setError]=useState('');
  const [selectionNotice,setSelectionNotice]=useState('');
  const [checkedRequests,setCheckedRequests]=useState(false);
  const [now,setNow]=useState(()=>new Date().toISOString());
  const dialog=useRef<HTMLDialogElement>(null);
  const inFlight=useRef(false);
  const localAttempt=useRef<BookingAttempt | undefined>(undefined);
  const submission=attemptRef ?? localAttempt;
  useLayoutEffect(()=>{
    const element=dialog.current;
    const opener=document.activeElement;
    if(isOpen && element && !element.open)element.showModal();
    return()=>{element?.close();if(opener instanceof HTMLElement && opener.isConnected)opener.focus({preventScroll:true});};
  },[isOpen]);
  useEffect(()=>{if(pending)dialog.current?.focus();},[pending]);
  useEffect(()=>{const timer=window.setInterval(()=>setNow(new Date().toISOString()),30_000);return()=>clearInterval(timer);},[]);
  const proposals=proposeBookingSlots({slots:tutor.availability || [],date:selectedDay,durationMinutes:duration as 60|90|120|150|180,nowIso:now});
  const slots=proposals.ok?proposals.slots:[];
  const selectedSlot=slots.find(slot=>slot.label===selectedTime);
  useEffect(()=>{
    if(selectedTime && !selectedSlot){setSelectedTime('');setSelectionNotice('El horario elegido ya no encaja. Selecciona otra hora.');}
  },[selectedTime,selectedSlot]);
  const profileError=requestProfileError(studentProfile);
  const noteTooLong=note.length>BOOKING_NOTE_LIMIT;
  const valid=Boolean(submissionEnabled && studentProfile?.id && !profileError && subject && tutor.subjects.includes(subject) && modality && tutor.modalities.includes(modality) && selectedSlot && !noteTooLong);
  const close=()=>{if(!inFlight.current)onClose();};
  async function submit(event:FormEvent) {
    event.preventDefault();
    if(!valid || inFlight.current || !selectedSlot || !modality)return;
    const fresh=proposeBookingSlots({slots:tutor.availability || [],date:selectedDay,durationMinutes:duration as 60,nowIso:new Date().toISOString()});
    if(!fresh.ok || !fresh.slots.some(slot=>slot.startsAt===selectedSlot.startsAt)){setNow(new Date().toISOString());return;}
    const signature=JSON.stringify([tutor.id,subject,modality,selectedSlot.startsAt,duration,note]);
    if(submission.current && submission.current.signature!==signature){setError('Consulta Mis Solicitudes antes de iniciar un nuevo intento con datos diferentes.');return;}
    submission.current ??= {signature,id:crypto.randomUUID()};
    inFlight.current=true;setPending(true);setError('');
    try{await onConfirm({id:submission.current.id,subject,modality,startsAt:selectedSlot.startsAt,durationHours:duration/60,studentNote:note});submission.current=undefined;}
    catch(cause){setError(cause instanceof Error?cause.message:'No se pudo confirmar el envío. Consulta Mis Solicitudes antes de crear otro.');}
    finally{inFlight.current=false;setPending(false);}
  }
  if(!isOpen)return null;
  const field='block w-full mt-1 rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900';
  return <dialog ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="request-tutor-title" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}}} onCancel={event=>{event.preventDefault();close();}}
    className="booking-dialog fixed m-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl backdrop:bg-slate-900/60">
    <button type="button" aria-label="Cerrar solicitud" disabled={pending} onClick={close} className="absolute right-3 top-3 rounded-full p-3 text-slate-600"><X size={20}/></button>
    <form onSubmit={submit} aria-busy={pending} className="space-y-4">
      <header className="pr-10"><p className="text-xs font-semibold text-teal-800">Nueva Solicitud Académica</p><h2 id="request-tutor-title" className="mt-1 text-xl font-bold">Solicitar tutoría con {tutor.name}</h2><p className="text-sm text-slate-600">{tutor.title}</p></header>
      {profileError && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{profileError}</p>}
      {!submissionEnabled && <p role="status">Inicia sesión para enviar una solicitud.</p>}
      {pending && <p role="status" className="text-sm text-teal-800">Guardando… espera para cerrar o volver a enviar la solicitud.</p>}
      {error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {submission.current && !pending && <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
        <p>El intento anterior puede haber sido recibido. Consúltalo antes de crear otro; no se enviará automáticamente.</p>
        {onCheckRequests && <button type="button" onClick={onCheckRequests} className="block underline">Consultar Mis Solicitudes</button>}
        <label className="flex items-center gap-2"><input type="checkbox" checked={checkedRequests} onChange={event=>setCheckedRequests(event.target.checked)}/>Ya comprobé que no existe esa solicitud.</label>
        <button type="button" disabled={!checkedRequests} onClick={()=>{submission.current=undefined;setCheckedRequests(false);setError('');}} className="underline disabled:opacity-50">Iniciar un nuevo intento</button>
      </div>}
      <fieldset disabled={pending} className="space-y-4 min-w-0">
        <label className="block text-sm font-semibold">Nombre del estudiante<input readOnly value={studentProfile?.name || ''} className={field}/></label>
        <label className="block text-sm font-semibold" htmlFor="request-subject">Materia<select id="request-subject" required value={subject} onChange={event=>setSubject(event.target.value)} className={field}><option value="">Selecciona una materia</option>{tutor.subjects.map(value=><option key={value}>{value}</option>)}</select></label>
        <label className="block text-sm font-semibold">Modalidad preferida<select required value={modality} onChange={event=>setModality(event.target.value as typeof modality)} className={field}><option value="">Selecciona una modalidad</option>{tutor.modalities.map(value=><option key={value} value={value}>{value==='virtual'?'Virtual':'Presencial AMC'}</option>)}</select></label>
        <WeeklyAvailability slots={tutor.availability}/>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">Fecha propuesta · Colombia<input type="date" required value={selectedDay} onChange={event=>setSelectedDay(event.target.value)} className={field}/></label>
          <label className="text-sm font-semibold">Duración de la sesión<select id="request-duration" value={duration} onChange={event=>setDuration(Number(event.target.value))} className={field}>{[60,90,120,150,180].map(value=><option key={value} value={value}>{value/60} horas ({value} min)</option>)}</select></label>
        </div>
        <label className="block text-sm font-semibold">Hora de inicio · Colombia<select id="request-time" required value={selectedTime} onChange={event=>{setSelectedTime(event.target.value);setSelectionNotice('');}} aria-describedby="request-time-help request-time-status" className={field}><option value="">Selecciona una hora</option>{slots.map(slot=><option key={slot.startsAt} value={slot.label}>{slot.label}</option>)}</select></label>
        <p id="request-time-help" className="text-xs text-slate-600">Disponibilidad declarada, sujeta a confirmación del tutor. Estas horas no están reservadas.</p>
        <p id="request-time-status" role="status" className="text-sm text-teal-800">{selectionNotice || (selectedDay && !slots.length?'No hay horas compatibles para esta fecha y duración. Prueba otra fecha.':'')}</p>
        {onRefreshOffer && <button type="button" className="text-sm underline text-teal-800" onClick={async()=>{if(inFlight.current)return;inFlight.current=true;setPending(true);try{await onRefreshOffer();setNow(new Date().toISOString());setError('');}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo actualizar la oferta.');}finally{inFlight.current=false;setPending(false);}}}>Actualizar oferta y horarios</button>}
        <label htmlFor="request-note" className="block text-sm font-semibold">Mensaje o tema específico a preparar<textarea id="request-note" rows={3} value={note} onChange={event=>setNote(event.target.value)} aria-invalid={noteTooLong} aria-describedby="request-note-limit" className={field}/></label>
        <p id="request-note-limit" role={noteTooLong?'alert':undefined} className={`text-xs ${noteTooLong?'text-red-700':'text-slate-600'}`}>{note.length} / {BOOKING_NOTE_LIMIT} caracteres{noteTooLong?' · Reduce el mensaje antes de enviar.':''}</p>
      </fieldset>
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-3"><p className="text-xs text-teal-800">Total estimado de la sesión:</p><strong className="text-lg text-teal-950">${(tutor.ratePerHour*duration/60).toLocaleString('es-CO')} COP</strong></div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={close} disabled={pending} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">Cancelar</button><button type="submit" disabled={!valid || pending} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{pending?'Guardando…':'Confirmar y enviar solicitud'}</button></div>
    </form>
  </dialog>;
}
