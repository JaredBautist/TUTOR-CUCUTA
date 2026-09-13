/** Isolated fake server for UI contracts. PostgreSQL permissions are tested separately. */
export function installMarketplaceFixture() {
 const original=window.fetch.bind(window);
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
 const read=(key,fallback)=>JSON.parse(localStorage.getItem(`marketplace-test-${key}`) || JSON.stringify(fallback));
 const save=(key,value)=>localStorage.setItem(`marketplace-test-${key}`,JSON.stringify(value));
 const current=()=>JSON.parse(localStorage.getItem('sb-catalog-auth-token') || '{}').user;
 window.__marketplaceFixture={failRequest:false,failDocument:false,calls:[]};
 window.fetch=async(input,init={})=>{
  const url=new URL(typeof input==='string'?input:input.url || String(input));
  if(url.origin!=='https://catalog.invalid')return original(input,init);
  const args=typeof init.body==='string'?JSON.parse(init.body):{};
  const path=url.pathname;const user=current();const harness=window.__marketplaceFixture;
  if(!path.includes('/auth/') && !path.endsWith('/user_accounts'))harness.calls.push(path);
  const own=()=>JSON.parse(localStorage.getItem(`test-account-${user.id}`));
  const offer=read('offer',null);
  if(path==='/rest/v1/tutor_offer_locations')return reply([]);
  if(path==='/rest/v1/tutor_offers')return reply(offer?.published?[{listing:offer.listing}]:[]);
  if(path.endsWith('/own_tutor_offer_v1'))return reply(offer?offer.draft:null);
  if(path.endsWith('/publish_tutor_offer_v1')){
   const draft={...args.p_offer,published:true,version:(offer?.draft.version || 0)+1};
   const listing={...own().profile,id:user.id,avatar:'',levels:draft.levels,modalities:draft.modalities,availability:draft.availability,sector:draft.sector,nextAvailable:'',methodologySteps:[],verified:false,matchReasons:[]};
   save('offer',{published:true,draft,listing});return reply(draft);
  }
  if(path.endsWith('/withdraw_tutor_offer_v1')){save('offer',{...offer,published:false,draft:{...offer.draft,published:false}});return reply(null);}
  if(path.endsWith('/create_tutoring_request_v1')){
   if(harness.failRequest)return reply({code:'XX000',message:'Controlled failure'},503);
   const p=own().profile;
   if(p.age<18 && !p.guardianAuthorized)return reply({code:'P0001',message:'GUARDIAN_REQUIRED'},400);
   const input=args.p_request;const rows=read('requests',[]);
   if(!rows.some(row=>row.id===input.id))rows.push({...input,studentId:user.id,targetTutorId:offer.listing.id,targetTutorName:offer.listing.name,studentName:p.name,age:p.age,grade:p.grade,sector:p.sector,guardianLinked:p.age<18,guardianName:p.guardianName,studentNote:input.note,scheduledTime:input.startsAt,ratePerHour:offer.listing.ratePerHour,totalEstimated:offer.listing.ratePerHour*input.durationHours,status:'pending',avatarInitials:'',matchCriteriaChecklist:[],goal:'',focalTopic:'',studentContact:p.guardianPhone,tutorContact:offer.draft.phone});
   save('requests',rows);return reply(input.id);
  }
  if(path.endsWith('/list_tutoring_requests_v1'))return reply(read('requests',[]).filter(row=>row.studentId===user?.id || row.targetTutorId===user?.id).map(({studentContact,tutorContact,...row})=>({...row,...(row.status==='accepted'?{studentPhone:studentContact,tutorPhone:tutorContact}: {})})));
  if(path.endsWith('/transition_tutoring_request_v1')){save('requests',read('requests',[]).map(row=>row.id===args.p_id?{...row,status:args.p_status}:row));return reply(null);}
  if(path.startsWith('/storage/v1/object/tutor-documents/') && init.method==='POST'){
   if(harness.failDocument)return reply({message:'Controlled upload failure'},503);
   return reply({Key:path.split('/object/')[1],Id:'upload-id'});
  }
  if(path.endsWith('/register_tutor_document_v1')){const docs=read('documents',[]);docs.push({id:args.p_id,path:`${user.id}/${args.p_id}.${args.p_type}`,title:args.p_title,description:args.p_description,file_type:args.p_type,created_at:new Date().toISOString()});save('documents',docs);return reply(null);}
  if(path==='/rest/v1/tutor_documents')return reply(offer?.published || user?.email.startsWith('tutor')?read('documents',[]):[]);
  if(path.endsWith('/remove_tutor_document_v1')){save('documents',read('documents',[]).filter(doc=>doc.id!==args.p_id));return reply(null);}
  if(path==='/storage/v1/object/tutor-documents' && init.method==='DELETE')return reply([]);
  if(path.startsWith('/storage/v1/object/sign/tutor-documents/')){
   if(init.method==='POST')return reply({signedURL:`/object/sign/tutor-documents/test.pdf?token=controlled`});
   return new Response('%PDF-1.7\n%%EOF',{headers:{'Content-Type':'application/pdf'}});
  }
  return original(input,init);
 };
}
