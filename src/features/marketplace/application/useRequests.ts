import {useCallback,useEffect,useRef,useState} from 'react';
import type {StudentRequest} from '../../../types';
import type {MarketplaceRepository} from '../domain/contracts';
/** Participant-scoped refreshes; reject stale reads and serialize acknowledged actions. */
export function useRequests(repository: MarketplaceRepository) {
 const [requests,setRequests]=useState<StudentRequest[]>([]);
 const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const [loading,setLoading]=useState(true);
 const generation=useRef(0); const mounted=useRef(false); const writing=useRef(false);
 const refresh=useCallback(async()=>{
  const current=++generation.current;
  try {const rows=await repository.requests(); if(mounted.current && current===generation.current){setRequests(rows);setError('');}}
  catch(cause){if(mounted.current && current===generation.current)setError(cause instanceof Error?cause.message:'No se pudieron cargar las solicitudes.');}
  finally{if(mounted.current && current===generation.current)setLoading(false);}
 },[repository]);
 useEffect(()=>{
  mounted.current=true; void refresh();
  const update=()=>{if(document.visibilityState==='visible' && !writing.current) void refresh();};
  const timer=window.setInterval(update,20000); window.addEventListener('focus',update);
  return()=>{mounted.current=false;generation.current++;clearInterval(timer);window.removeEventListener('focus',update);};
 },[refresh]);
 const mutate=useCallback(async(action:()=>Promise<void>)=>{
  if(writing.current) throw new Error('Espera a que termine la operación anterior.');
  writing.current=true;generation.current++;setBusy(true);setError('');
  try{await action();await refresh();}
  catch(cause){if(mounted.current)setError(cause instanceof Error?cause.message:'No se pudo confirmar la operación.');throw cause;}
  finally{writing.current=false;if(mounted.current)setBusy(false);}
 },[refresh]);
 return {requests,error,busy,loading,refresh,mutate};
}
