import assert from 'node:assert/strict';
import {test} from 'node:test';
import {documentType, requestProfileError, validateOffer, emptyOffer} from '../src/features/marketplace/domain/contracts';
test('Requests require known age and guardian declaration/contact for minors',()=>{
  const profile={name:'Student',age:16,guardianAuthorized:false,guardianName:'Guardian',guardianPhone:'+573001234567',phone:''};
  assert.ok(requestProfileError(profile));
  assert.equal(requestProfileError({...profile,guardianAuthorized:true}),undefined);
  assert.ok(requestProfileError({...profile,age:undefined}));
  assert.ok(requestProfileError({...profile,age:22}));
  assert.equal(requestProfileError({...profile,age:22,phone:'+573001234567'}),undefined);
});
test('Publication validates schedule, phone and deliberately approximate geographic position',()=>{
  const offer={...emptyOffer(),levels:['Universidad'],modalities:['presencial' as const],phone:'+573001234567',availability:[{day:1,start:'08:00',end:'10:00'}],sector:'Zona de atención',position:{latitude:7.891234,longitude:-72.501234}};
  assert.deepEqual(validateOffer(offer).position,{latitude:7.89,longitude:-72.5});
  assert.throws(()=>validateOffer({...offer,position:undefined}));
  assert.throws(()=>validateOffer({...offer,availability:[...offer.availability,{day:1,start:'09:00',end:'11:00'}]}));
});
test('Documents reject invalid contents and accept supported signatures',async()=>{
  await assert.rejects(()=>documentType(new Blob(['not a PDF'],{type:'application/pdf'})));
  assert.equal(await documentType(new Blob(['%PDF-1.7'])), 'pdf');
  assert.equal(await documentType(new Blob([new Uint8Array([137,80,78,71,13,10,26,10])])), 'png');
});
