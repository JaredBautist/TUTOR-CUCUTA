import {useEffect,useRef,useState} from 'react';
import {FileText,Upload,Trash2,Eye,X} from 'lucide-react';
import {marketplace} from '../../features/marketplace/application/marketplace';
import type {DocumentRecord} from '../../features/marketplace/domain/contracts';

/** Shared private-document manager/viewer. URLs are fetched on demand and never persisted. */
export function DocumentsPanel({tutorId,editable=false}:{tutorId:string;editable?:boolean}) {
 const [documents,setDocuments]=useState<DocumentRecord[]>([]);
 const [error,setError]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);const [attempt,setAttempt]=useState(0);
 const [file,setFile]=useState<File>();const [title,setTitle]=useState('');const [description,setDescription]=useState('');
 const [preview,setPreview]=useState<{document:DocumentRecord;url:string}>();
 const dialog=useRef<HTMLDialogElement>(null);const fileInput=useRef<HTMLInputElement>(null);const active=useRef(true);const pending=useRef(false);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 useEffect(()=>{let current=true;setLoading(true);setError('');
  marketplace.documents(tutorId).then(rows=>{if(current)setDocuments(rows);}).catch(cause=>{if(current)setError(cause.message);}).finally(()=>{if(current)setLoading(false);});
  return()=>{current=false;};
 },[tutorId,attempt]);
 useEffect(()=>{if(preview)dialog.current?.showModal();},[preview]);
 async function run(action:()=>Promise<void>) {
  if(pending.current)return;pending.current=true;setBusy(true);setError('');setNotice('');
  try{await action();}catch(cause){if(active.current)setError(cause instanceof Error?cause.message:'No se pudo completar la operación.');}
  finally{pending.current=false;if(active.current)setBusy(false);}
 }
 return <section className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
  <h2 className="text-sm font-bold text-slate-900">Formación y documentos aportados</h2>
  <p className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">Documento aportado por el tutor. Autenticidad no verificada. Los documentos no suman puntos en las recomendaciones.</p>
  {editable && <div className="space-y-3">
   <p className="text-xs text-slate-600">PDF, JPG o PNG; máximo 5 MB y 10 documentos. Al publicar tu oferta los compartes con estudiantes que hayan iniciado sesión. Retirarlos bloquea nuevos accesos; los enlaces abiertos caducan en un minuto.</p>
   <label className="block text-xs font-semibold">Archivo<input ref={fileInput} type="file" accept="application/pdf,image/jpeg,image/png" disabled={busy} onChange={event=>{const selected=event.target.files?.[0];setFile(selected);setTitle(selected?.name || '');}} className="block w-full mt-1 text-sm" /></label>
   <label className="block text-xs font-semibold">Título<input value={title} maxLength={200} onChange={event=>setTitle(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
   <label className="block text-xs font-semibold">Descripción opcional<textarea value={description} maxLength={1000} onChange={event=>setDescription(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
   <button type="button" disabled={busy || !file || !title.trim() || documents.length>=10} onClick={()=>void run(async()=>{
    if(!file)return;await marketplace.uploadDocument(tutorId,file,title,description);
    if(active.current){setFile(undefined);setTitle('');setDescription('');if(fileInput.current)fileInput.current.value='';setNotice('Documento guardado en Supabase.');setAttempt(value=>value+1);}
   })} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 text-white px-3 py-2 text-xs font-semibold disabled:opacity-50"><Upload size={16}/>{busy?'Procesando…':'Guardar documento'}</button>
  </div>}
  {error && <div role="alert" className="text-xs text-red-700">{error} <button type="button" onClick={()=>setAttempt(value=>value+1)} className="underline">Reintentar lectura</button></div>}
  {notice && <p role="status" className="text-xs text-teal-800">{notice}</p>}
  {loading ? <p role="status" className="text-xs text-slate-500">Cargando documentos…</p> : !error && documents.length===0 ? <p className="text-xs text-slate-500">Sin documentos aportados.</p> : null}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{documents.map(document=><article key={document.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
   <div className="flex gap-2"><FileText size={20} className="text-teal-700 shrink-0"/><div className="min-w-0"><p className="font-bold text-xs break-words">{document.name}</p><p className="text-xs text-slate-600 break-words">{document.description}</p><span className="text-xs text-slate-500">{document.fileType.toUpperCase()}</span></div></div>
   <button type="button" disabled={busy} onClick={()=>void run(async()=>{const url=await marketplace.documentUrl(document);if(active.current)setPreview({document,url});})} className="inline-flex items-center gap-1 text-xs text-teal-800 p-2 border rounded-lg"><Eye size={16}/>Ver soporte</button>
   {editable && <button type="button" disabled={busy} onClick={()=>void run(async()=>{const warning=await marketplace.removeDocument(document);if(active.current){setNotice(warning || 'Documento retirado.');setDocuments(rows=>rows.filter(row=>row.id!==document.id));}})} className="inline-flex items-center gap-1 text-xs text-red-700 p-2"><Trash2 size={16}/>Retirar</button>}
  </article>)}</div>
  {preview && <dialog ref={dialog} onClose={()=>setPreview(undefined)} className="fixed inset-0 m-auto w-[95vw] max-w-4xl max-h-[90vh] rounded-2xl border border-slate-200 bg-white p-4 backdrop:bg-slate-900/50">
   <div className="flex justify-between gap-4 mb-3"><h3 className="font-bold">{preview.document.name}</h3><button type="button" aria-label="Cerrar documento" onClick={()=>dialog.current?.close()}><X/></button></div>
   {preview.document.fileType==='pdf' ? <iframe src={preview.url} title={preview.document.name} className="w-full h-[65vh]"/> : <img src={preview.url} alt={preview.document.name} className="max-h-[70vh] mx-auto object-contain"/>}
   <p className="text-xs text-slate-500 mt-2">Documento aportado por el tutor. Autenticidad no verificada.</p>
  </dialog>}
 </section>;
}
