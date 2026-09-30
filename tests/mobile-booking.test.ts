import test from 'node:test';
import assert from 'node:assert/strict';
import { proposeBookingSlots } from '../src/features/marketplace/domain/bookingSlots';
import { composeBookingNote, bookingDefaults } from '../src/features/marketplace/application/bookingContext';
const query = {slots:[{day:1,start:'08:15',end:'10:15'}],date:'2026-10-05',durationMinutes:60 as const,nowIso:'2026-10-01T12:00:00Z'};
test('proposals fit one interval, anchored to its start, ordered and deduplicated',()=>{
 const original=structuredClone(query);
 const result=proposeBookingSlots({...query,slots:[...query.slots,...query.slots]});
 assert.equal(result.ok,true);
 if(result.ok) assert.deepEqual(result.slots.map(slot=>slot.label),['08:15','08:45','09:15']);
 assert.deepEqual(query,original);
});
test('duration, past starts, absent weekdays and horizon are enforced',()=>{
 for(const overrides of [{durationMinutes:180 as const},{date:'2026-10-06'},{nowIso:'2026-10-05T14:15:00Z'},{nowIso:'2026-01-01T00:00:00Z'}]) assert.deepEqual(proposeBookingSlots({...query,...overrides}),{ok:true,slots:[]});
 const result=proposeBookingSlots({...query,durationMinutes:90});
 if(result.ok) assert.equal(result.slots.length,2);else assert.fail();
});
test('invalid dates, duration, clock and cross-midnight schedules fail explicitly',()=>{
 assert.deepEqual(proposeBookingSlots({...query,date:'2026-02-30'}),{ok:false,code:'INVALID_DATE'});
 assert.equal(proposeBookingSlots({...query,nowIso:'invalid'}).ok,false);
 assert.deepEqual(proposeBookingSlots({...query,durationMinutes:45 as 60}),{ok:false,code:'INVALID_DURATION'});
 assert.deepEqual(proposeBookingSlots({...query,slots:[{day:1,start:'23:00',end:'01:00'}]}),{ok:false,code:'INVALID_SCHEDULE'});
});
test('Colombia midnight and device timezone do not shift the chosen weekday',()=>{
 const result=proposeBookingSlots({...query,slots:[{day:1,start:'00:00',end:'02:00'}],nowIso:'2026-10-05T04:59:00Z'});
 assert.equal(result.ok,true);if(result.ok) assert.equal(result.slots[0].startsAt,'2026-10-05T00:00:00-05:00');
});
test('note composition preserves full text, excludes blank parts and checks exact limit',()=>{
 assert.deepEqual(composeBookingNote({specificTopic:' Límites ',studentNote:' Bimestral '}),{text:'Tema: Límites\n\nBimestral',exceedsLimit:false});
 assert.equal(composeBookingNote({specificTopic:'',studentNote:'a'.repeat(2000)}).exceedsLimit,false);
 assert.equal(composeBookingNote({specificTopic:'',studentNote:'a'.repeat(2001)}).text.length,2001);
 assert.equal(composeBookingNote({specificTopic:'',studentNote:'a'.repeat(2001)}).exceedsLimit,true);
});
test('unsupported search choices stay empty; any chooses first published modality',()=>{
 const offer={subjects:['Álgebra'],modalities:['virtual' as const]};
 assert.deepEqual(bookingDefaults(offer,{subject:'Física',modality:'presencial'}),{subject:'',modality:''});
 assert.deepEqual(bookingDefaults(offer,{subject:'Álgebra',modality:'any'}),{subject:'Álgebra',modality:'virtual'});
});
test('180-day horizon is inclusive and one millisecond beyond is excluded',()=>{
 const start=Date.parse('2026-10-05T08:15:00-05:00');
 const boundary=new Date(start-180*86400000).toISOString();
 const result=proposeBookingSlots({...query,nowIso:boundary});
 assert.equal(result.ok,true);if(result.ok)assert.deepEqual(result.slots.map(slot=>slot.label),['08:15']);
 assert.deepEqual(proposeBookingSlots({...query,nowIso:new Date(Date.parse(boundary)-1).toISOString()}),{ok:true,slots:[]});
});
test('sessions do not bridge adjacent intervals and exactly-now starts are excluded',()=>{
 assert.deepEqual(proposeBookingSlots({...query,slots:[{day:1,start:'08:00',end:'09:00'},{day:1,start:'09:00',end:'10:00'}],durationMinutes:90}),{ok:true,slots:[]});
 const result=proposeBookingSlots({...query,nowIso:'2026-10-05T08:15:00-05:00'});
 assert.equal(result.ok,true);if(result.ok)assert.deepEqual(result.slots.map(slot=>slot.label),['08:45','09:15']);
});
