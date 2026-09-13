import {useEffect,useRef,useState} from 'react';
import {Check, Clock3, MapPin, Plus, Save, Trash2} from 'lucide-react';
import type {SearchOrigin} from '../../features/maps/domain/contracts';
import {marketplace} from '../../features/marketplace/application/marketplace';
import {EDUCATION_LEVELS,WEEKDAYS,emptyOffer} from '../../features/marketplace/domain/contracts';
import type {OfferDraft,WeeklySlot} from '../../features/marketplace/domain/contracts';

/** Explicit publication of saved profile facts, teaching zone and declared availability. */
export function OfferPanel({origin,onOriginLoaded,onPrepare}:{origin:SearchOrigin;onOriginLoaded:(origin:SearchOrigin)=>void;onPrepare:()=>Promise<void>}) {
 const [offer,setOffer]=useState<OfferDraft>(emptyOffer);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');const [notice,setNotice]=useState('');const [attempt,setAttempt]=useState(0);const pending=useRef(false);
 const originLoaded=useRef(onOriginLoaded);originLoaded.current=onOriginLoaded;
 useEffect(()=>{let active=true;setLoading(true);marketplace.ownOffer().then(saved=>{
  if(!active)return;if(saved){setOffer(saved);if(saved.position)originLoaded.current({kind:'selected',position:saved.position,label:'Zona de atención publicada'});}setError('');
 }).catch(cause=>{if(active)setError(cause.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[attempt]);
 const update=<K extends keyof OfferDraft>(key:K,value:OfferDraft[K])=>setOffer(previous=>({...previous,[key]:value}));
 const slotUpdate=(index:number,changes:Partial<WeeklySlot>)=>update('availability',offer.availability.map((slot,i)=>i===index?{...slot,...changes}:slot));
 async function publish(){if(pending.current)return;pending.current=true;setBusy(true);setError('');setNotice('');try{
  await onPrepare();
  const saved=await marketplace.publish({...offer,position:origin.kind==='selected'?origin.position:undefined});setOffer({...saved,position:saved.position || undefined});
  if(saved.position)originLoaded.current({kind:'selected',position:saved.position,label:'Zona de atención publicada'});
  setNotice('Oferta publicada en Supabase. Los estudiantes ya pueden encontrarla.');
 }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo publicar.');}finally{pending.current=false;setBusy(false);}}
 async function withdraw(){if(pending.current)return;pending.current=true;setBusy(true);setError('');try{await marketplace.withdraw();setOffer(previous=>({...previous,published:false,version:previous.version+1,position:undefined}));setNotice('Oferta retirada de búsquedas y mapas. Los estudiantes ya no pueden abrir tus documentos.');}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo retirar.');}finally{pending.current=false;setBusy(false);}}
 const fieldClass = 'w-full min-w-0 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-hidden min-h-[42px]';
 const secondaryButtonClass = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-teal-500 min-h-[42px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
 return (
  <section className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
   <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
    <h2 className="text-sm font-bold text-slate-900">5. Oferta y disponibilidad</h2>
    <span className={`text-[10px] font-medium px-2.5 py-1 rounded-md ${offer.published ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
     {offer.published ? 'Publicada' : 'Sin publicar'}
    </span>
   </div>
   <p className="text-[11px] text-slate-500 leading-relaxed">
    Publica tu formación, materias, tarifa y disponibilidad para aparecer en las búsquedas. Tu teléfono se comparte solo cuando aceptas una solicitud.
   </p>
   {loading ? <p role="status" className="text-xs text-slate-500">Cargando oferta…</p> : (
    <fieldset disabled={busy} className="space-y-5 min-w-0">
     <fieldset className="min-w-0">
      <legend className="text-xs font-semibold text-slate-700 mb-2">Niveles educativos</legend>
      <div className="flex flex-wrap gap-2">
       {EDUCATION_LEVELS.map(level => (
        <label key={level} className="relative cursor-pointer">
         <input type="checkbox" className="peer sr-only" checked={offer.levels.includes(level)} onChange={event => update('levels', event.target.checked ? [...offer.levels, level] : offer.levels.filter(value => value !== level))} />
         <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 min-h-[42px] transition-colors peer-checked:border-teal-200 peer-checked:bg-teal-50 peer-checked:text-teal-900 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500 peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
          {offer.levels.includes(level) && <Check size={14} aria-hidden="true" />}{level}
         </span>
        </label>
       ))}
      </div>
     </fieldset>
     <fieldset className="min-w-0">
      <legend className="text-xs font-semibold text-slate-700 mb-2">Modalidades</legend>
      <div className="flex flex-wrap gap-2">
       {(['presencial','virtual'] as const).map(mode => (
        <label key={mode} className="relative cursor-pointer">
         <input type="checkbox" className="peer sr-only" checked={offer.modalities.includes(mode)} onChange={event => update('modalities', event.target.checked ? [...offer.modalities, mode] : offer.modalities.filter(value => value !== mode))} />
         <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 min-h-[42px] transition-colors peer-checked:border-teal-200 peer-checked:bg-teal-50 peer-checked:text-teal-900 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500 peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
          {offer.modalities.includes(mode) && <Check size={14} aria-hidden="true" />}{mode === 'presencial' ? 'Presencial' : 'Virtual'}
         </span>
        </label>
       ))}
      </div>
     </fieldset>
     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <label className="block text-xs font-semibold text-slate-700">Sector de atención
       <input value={offer.sector} maxLength={200} onChange={event => update('sector', event.target.value)} placeholder="Barrio o sector de atención" className={`${fieldClass} mt-1`} />
      </label>
      <label className="block text-xs font-semibold text-slate-700">Teléfono con código de país
       <input type="tel" value={offer.phone} onChange={event => update('phone', event.target.value)} placeholder="+57…" className={`${fieldClass} mt-1`} />
      </label>
     </div>
     <div className="flex gap-2 p-3 bg-teal-50/60 rounded-xl border border-teal-200/60">
      <MapPin size={16} className="shrink-0 text-teal-700 mt-0.5" aria-hidden="true" />
      <p className="text-[11px] text-slate-600 leading-relaxed">Para clases presenciales, selecciona en el mapa una zona de atención. Se comparte un punto aproximado, sin mostrar tu domicilio ni movimientos GPS.</p>
     </div>
     <fieldset className="min-w-0 space-y-3">
      <legend className="text-xs font-semibold text-slate-700 mb-2">Horarios semanales · hora de Colombia</legend>
      {offer.availability.length === 0 && (
       <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
        <Clock3 size={18} className="text-slate-400 shrink-0" aria-hidden="true" />
        <p className="text-[11px] text-slate-500">Agrega los días y horas en que puedes dar clases.</p>
       </div>
      )}
      {offer.availability.map((slot,index) => (
       <div key={index} className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end p-3 rounded-xl bg-slate-50 border border-slate-200/70">
        <label className="col-span-2 sm:col-span-1 min-w-0 text-[11px] font-semibold text-slate-500">Día
         <select aria-label={`Día del horario ${index+1}`} value={slot.day} onChange={event => slotUpdate(index,{day:Number(event.target.value)})} className={`${fieldClass} mt-1`}>
          {WEEKDAYS.map((day,i) => <option key={day} value={i+1}>{day}</option>)}
         </select>
        </label>
        <label className="min-w-0 text-[11px] font-semibold text-slate-500">Desde
         <input aria-label={`Inicio del horario ${index+1}`} type="time" value={slot.start} onChange={event => slotUpdate(index,{start:event.target.value})} className={`${fieldClass} mt-1`} />
        </label>
        <label className="min-w-0 text-[11px] font-semibold text-slate-500">Hasta
         <input aria-label={`Fin del horario ${index+1}`} type="time" value={slot.end} onChange={event => slotUpdate(index,{end:event.target.value})} className={`${fieldClass} mt-1`} />
        </label>
        <button type="button" onClick={() => update('availability',offer.availability.filter((_,i) => i!==index))} aria-label={`Quitar horario ${index+1}`} className="justify-self-end col-span-2 sm:col-span-1 inline-flex items-center justify-center w-[42px] h-[42px] rounded-lg border border-slate-200 text-slate-500 bg-white hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-teal-500 cursor-pointer"><Trash2 size={16} /></button>
       </div>
      ))}
      <button type="button" disabled={offer.availability.length>=21} onClick={() => update('availability',[...offer.availability,{day:1,start:'08:00',end:'12:00'}])} className={secondaryButtonClass}><Plus size={14} aria-hidden="true" />Agregar horario</button>
     </fieldset>
     <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
      <button type="button" onClick={() => void publish()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-bold shadow-xs min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 cursor-pointer disabled:opacity-50"><Save size={16} aria-hidden="true" />{busy ? 'Procesando…' : 'Guardar perfil y publicar oferta'}</button>
      {offer.published && <button type="button" onClick={() => void withdraw()} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[44px] focus-visible:outline-2 focus-visible:outline-teal-500 cursor-pointer">Retirar oferta</button>}
     </div>
    </fieldset>
   )}
   {error && <p role="alert" className="p-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-700">{error} <button type="button" onClick={() => setAttempt(value=>value+1)} className="underline">Recargar oferta</button></p>}
   {notice && <p role="status" className="p-3 rounded-xl border border-teal-200/60 bg-teal-50/60 text-xs text-teal-800">{notice}</p>}
  </section>
 );
}
