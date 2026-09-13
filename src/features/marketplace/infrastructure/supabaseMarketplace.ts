import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tutor, StudentRequest } from '../../../types';
import { MarketplaceError, documentType, validateOffer } from '../domain/contracts';
import type { MarketplaceRepository, DocumentRecord, OfferDraft } from '../domain/contracts';
const messages: Record<string,string> = {
 COMPLETE_PROFILE:'Guarda primero tu nombre, materias y tarifa en Mi perfil.',
 OFFER_CONFLICT:'La oferta cambió en otra sesión. Recarga antes de publicar.',
 COMPLETE_STUDENT_PROFILE:'Completa tu nombre y edad en Mi perfil.',
 GUARDIAN_REQUIRED:'Registra el nombre, teléfono con código de país y autorización de tu acudiente.',
 CONTACT_REQUIRED:'Registra un teléfono con código de país en Mi perfil.',
 OFFER_UNAVAILABLE:'Este docente retiró su oferta. Actualiza los resultados.',
 OFFER_MISMATCH:'La materia o modalidad no pertenece a la oferta publicada.',
 INVALID_REQUEST:'Selecciona una fecha futura (hasta 180 días) y una duración válida.',
 SCHEDULE_UNAVAILABLE:'La fecha y duración están fuera del horario publicado del docente.',
 SCHEDULE_CONFLICT:'El horario ya está ocupado o la fecha ha pasado.',
 REQUEST_CONFLICT:'La solicitud cambió de estado. Actualiza la lista.',
 REQUEST_LIMIT:'Tienes 20 solicitudes pendientes. Resuelve o cancela alguna antes de crear otra.',
 DUPLICATE_REQUEST:'Ya tienes una solicitud para ese docente a esa hora.',
 DOCUMENT_LIMIT:'Puedes publicar hasta 10 documentos. Retira uno antes de agregar otro.',
 IDEMPOTENCY_CONFLICT:'El envío anterior puede haberse guardado. Consulta Mis Solicitudes antes de crear otro.',
 INVALID_OFFER:'Completa niveles, modalidades y teléfono internacional.', INVALID_SCHEDULE:'Revisa los horarios semanales.', INVALID_ZONE:'Selecciona una zona de atención dentro del AMC.',
};
function failure(error: unknown): MarketplaceError {
 const candidate=error as {code?:string;message?:string};
 if (candidate?.code==='PGRST202' || candidate?.code==='PGRST205' || candidate?.code==='42P01') return new MarketplaceError('MIGRATION_REQUIRED','La conexión de ofertas y solicitudes aún no está activada en Supabase. Falta aplicar la migración cloud_marketplace.',error);
 return new MarketplaceError(candidate?.code || 'MARKETPLACE_UNAVAILABLE', messages[candidate?.message || ''] || 'No se pudo confirmar la operación. Reintenta; tus cambios siguen disponibles.',error);
}
const timeout = () => AbortSignal.timeout(15000);
/** Supabase adapter: versioned RPC mutations and private object access; no local fallback. */
export function createMarketplaceRepository(client: SupabaseClient | null): MarketplaceRepository {
 const db=()=> { if (!client) throw new MarketplaceError('NOT_CONFIGURED','Configura Supabase para continuar.'); return client; };
 async function rpc<T>(name: string, args?: Record<string,unknown>): Promise<T> {
  try {const response=await db().rpc(name,args).abortSignal(timeout()); if(response.error) throw response.error; return response.data as T;}
  catch(error) {if(error instanceof MarketplaceError) throw error; throw failure(error);}
 }
 return {
  async catalog() {
   const rows: {listing: Tutor & {avatarPath?: string}}[]=[];
   for(let offset=0;offset<10000;offset+=500) {
    const response=await db().from('tutor_offers').select('listing').eq('published',true).order('tutor_id').range(offset,offset+499).abortSignal(timeout());
    if(response.error) throw failure(response.error);
    rows.push(...response.data as typeof rows);
    if(response.data.length<500) break;
    if(offset===9500) throw new MarketplaceError('CATALOG_LIMIT','El catálogo supera el límite de esta versión.');
   }
   const paths=[...new Set(rows.map(row=>row.listing.avatarPath).filter((path): path is string=>Boolean(path)))];
   const urls=new Map<string,string>();
   if(paths.length) {
    const response=await db().storage.from('profile-avatars').createSignedUrls(paths,300);
    if(response.error) throw failure(response.error);
    for(const image of response.data) if(image.path && image.signedUrl) urls.set(image.path,image.signedUrl);
   }
   return rows.map(({listing})=>{
    if(!listing || typeof listing.id!=='string' || !Array.isArray(listing.subjects) || !Array.isArray(listing.availability) || !Number.isFinite(listing.ratePerHour)) throw new MarketplaceError('INVALID_CATALOG','El catálogo contiene una oferta inválida.');
    return {...listing,avatar:listing.avatarPath ? urls.get(listing.avatarPath) || '' : listing.avatar,verified:false,matchReasons:[]};
   });
  },
  ownOffer:async()=> {const offer=await rpc<OfferDraft|null>('own_tutor_offer_v1'); return offer ? {...offer,position:offer.position || undefined}:null;},
  publish:offer=>rpc<OfferDraft>('publish_tutor_offer_v1',{p_offer:validateOffer(offer)}),
  withdraw:()=>rpc<void>('withdraw_tutor_offer_v1'),
  async requests() {
   const rows: StudentRequest[]=[];
   for(let offset=0;offset<10000;offset+=200) {
    const page=await rpc<StudentRequest[]>('list_tutoring_requests_v1',{p_offset:offset});
    if(!Array.isArray(page) || page.some(row=>typeof row.id!=='string' || !['pending','accepted','rejected','cancelled'].includes(row.status))) throw new MarketplaceError('INVALID_REQUESTS','La lista de solicitudes tiene un formato inválido.');
    rows.push(...page);
    if(page.length<200) return rows;
   }
   throw new MarketplaceError('REQUEST_LIST_LIMIT','La lista de solicitudes supera el límite de esta versión.');
  },
  async request(input) {await rpc('create_tutoring_request_v1',{p_request:input});},
  transition:(id,status)=>rpc<void>('transition_tutoring_request_v1',{p_id:id,p_status:status}),
  async documents(tutorId) {
   const response=await db().from('tutor_documents').select('id,path,title,description,file_type,created_at').eq('tutor_id',tutorId).order('created_at').limit(10).abortSignal(timeout());
   if(response.error) throw failure(response.error);
   return response.data.map(row=>({id:row.id,path:row.path,name:row.title,description:row.description,fileType:row.file_type,uploadedAt:row.created_at} as DocumentRecord));
  },
  async uploadDocument(owner,file,title,description) {
   if(!title.trim() || title.trim().length>200 || description.length>1000) throw new MarketplaceError('INVALID_DOCUMENT','Escribe un título de hasta 200 caracteres y una descripción de hasta 1000.');
   const type=await documentType(file); const id=crypto.randomUUID(); const path=`${owner}/${id}.${type}`;
   const contentType={pdf:'application/pdf',jpg:'image/jpeg',png:'image/png'}[type];
   const response=await db().storage.from('tutor-documents').upload(path,file,{contentType,upsert:false});
   if(response.error) throw failure(response.error);
   // If acknowledgement is lost, retain the object: metadata might have committed.
   await rpc('register_tutor_document_v1',{p_id:id,p_title:title.trim(),p_description:description,p_type:type});
  },
  async removeDocument(document) {
   await rpc('remove_tutor_document_v1',{p_id:document.id});
   try {const result=await db().storage.from('tutor-documents').remove([document.path]); if(!result.error) return;}
   catch { /* Metadata already revoked access; the remaining object stays owner-only. */ }
   return 'Documento retirado. El archivo privado aún requiere limpieza del almacenamiento.';
  },
  async documentUrl(document) {
   const response=await db().storage.from('tutor-documents').createSignedUrl(document.path,60);
   if(response.error) throw failure(response.error);
   return response.data.signedUrl;
  },
 };
}
