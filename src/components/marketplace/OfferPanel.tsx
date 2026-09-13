import {useEffect,useRef,useState} from 'react';
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
 return <section className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
  <div className="flex flex-wrap justify-between gap-2"><h2 className="text-sm font-bold">Oferta y disponibilidad</h2><span className="text-xs text-teal-800">{offer.published?'Publicada':'Sin publicar'}</span></div>
  <p className="text-xs text-slate-600">Guardar tu perfil conserva tus datos privados. Publicar comparte tu formación declarada, foto, materias, tarifa, horarios y zona aproximada. El teléfono se comparte al aceptar una solicitud.</p>
  {loading ? <p role="status">Cargando oferta…</p> : <fieldset disabled={busy} className="space-y-4">
   <fieldset><legend className="text-xs font-semibold mb-2">Niveles educativos</legend><div className="flex flex-wrap gap-3">{EDUCATION_LEVELS.map(level=><label key={level} className="text-xs"><input type="checkbox" checked={offer.levels.includes(level)} onChange={event=>update('levels',event.target.checked?[...offer.levels,level]:offer.levels.filter(value=>value!==level))}/> {level}</label>)}</div></fieldset>
   <fieldset><legend className="text-xs font-semibold mb-2">Modalidades</legend><div className="flex gap-4">{(['presencial','virtual'] as const).map(mode=><label key={mode} className="text-xs"><input type="checkbox" checked={offer.modalities.includes(mode)} onChange={event=>update('modalities',event.target.checked?[...offer.modalities,mode]:offer.modalities.filter(value=>value!==mode))}/> {mode==='presencial'?'Presencial':'Virtual'}</label>)}</div></fieldset>
   <div className="grid sm:grid-cols-2 gap-3"><label className="text-xs font-semibold">Sector de atención<input value={offer.sector} maxLength={200} onChange={event=>update('sector',event.target.value)} placeholder="Barrio o sector; sin dirección de domicilio" className="block w-full mt-1 p-2 border rounded-lg"/></label>
   <label className="text-xs font-semibold">Teléfono con código de país<input type="tel" value={offer.phone} onChange={event=>update('phone',event.target.value)} placeholder="+57…" className="block w-full mt-1 p-2 border rounded-lg"/></label></div>
   <p className="text-xs text-slate-600">Para clases presenciales, haz clic en el mapa para elegir una zona de atención. Publicamos una aproximación de cerca de 1 km, sin domicilio ni movimientos GPS.</p>
   <fieldset className="space-y-2"><legend className="text-xs font-semibold">Horarios semanales · hora de Colombia</legend>{offer.availability.map((slot,index)=><div key={index} className="flex flex-wrap items-center gap-2">
    <select aria-label={`Día del horario ${index+1}`} value={slot.day} onChange={event=>slotUpdate(index,{day:Number(event.target.value)})} className="p-2 text-xs rounded-lg border">{WEEKDAYS.map((day,i)=><option key={day} value={i+1}>{day}</option>)}</select>
    <input aria-label={`Inicio del horario ${index+1}`} type="time" value={slot.start} onChange={event=>slotUpdate(index,{start:event.target.value})} className="p-2 text-xs rounded-lg border"/>
    <input aria-label={`Fin del horario ${index+1}`} type="time" value={slot.end} onChange={event=>slotUpdate(index,{end:event.target.value})} className="p-2 text-xs rounded-lg border"/>
    <button type="button" onClick={()=>update('availability',offer.availability.filter((_,i)=>i!==index))} aria-label={`Quitar horario ${index+1}`} className="text-xs text-red-700 p-2">Quitar</button>
   </div>)}<button type="button" disabled={offer.availability.length>=21} onClick={()=>update('availability',[...offer.availability,{day:1,start:'08:00',end:'12:00'}])} className="text-xs text-teal-800 underline py-2">Agregar horario</button></fieldset>
   <div className="flex flex-wrap gap-3"><button type="button" onClick={()=>void publish()} className="rounded-xl bg-teal-700 text-white px-4 py-3 text-xs font-bold">{busy?'Procesando…':'Guardar perfil y publicar oferta'}</button>{offer.published && <button type="button" onClick={()=>void withdraw()} className="rounded-xl border border-slate-300 px-4 py-3 text-xs">Retirar oferta</button>}</div>
  </fieldset>}
  {error && <p role="alert" className="text-xs text-red-700">{error} <button type="button" onClick={()=>setAttempt(value=>value+1)} className="underline">Recargar oferta</button></p>}
  {notice && <p role="status" className="text-xs text-teal-800">{notice}</p>}
 </section>;
}
