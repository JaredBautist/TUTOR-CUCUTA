import assert from 'node:assert/strict';
import {test} from 'node:test';
import {deliveryAccounts, deliveryTutors, deliveryScenarios, assertOwnedIdentity} from '../scripts/delivery/accounts';
import {validateProfile} from '../src/features/accounts/domain/profile';
import {recommendTutors} from '../src/features/recommender/domain/recommender';

test('delivery contains four distinct tutors and four students with valid profiles',()=>{
 assert.equal(deliveryAccounts.filter(a=>a.role==='tutor').length,4);
 assert.equal(deliveryAccounts.filter(a=>a.role==='student').length,4);
 assert.equal(new Set(deliveryAccounts.map(a=>a.email)).size,8);
 for(const a of deliveryAccounts){
  validateProfile(a.role,a.profile);
  assert.ok(a.email.endsWith('@demo.tutorcucuta.example'));
  if(a.role==='student' && Number(a.profile.age)<18) assert.equal(a.profile.guardianAuthorized,false);
 }
});
for(const scenario of deliveryScenarios){
 test(`delivery search: ${scenario.name}`,()=>{
  const results=recommendTutors(deliveryTutors(),scenario.filters,scenario.origin);
  assert.deepEqual(results.map(t=>t.id).sort(),[...scenario.expected].sort());
  for(const tutor of results){
   assert.ok(tutor.matchReasons.some(reason=>reason.includes('materia')));
   assert.ok(tutor.matchReasons.length>=3);
   assert.ok(tutor.matchScore!>=0 && tutor.matchScore!<=100);
  }
 });
}
test('delivery never claims an unrelated or role-mismatched Auth identity',()=>{
 const a=deliveryAccounts[0];
 assert.throws(()=>assertOwnedIdentity(a,{email:a.email,app_metadata:{},user_metadata:{}}));
 assert.throws(()=>assertOwnedIdentity(a,{email:a.email,app_metadata:{delivery_set:'academic-2026-09-17'},user_metadata:{account_role:'student'}}));
 assert.doesNotThrow(()=>assertOwnedIdentity(a,{email:a.email,app_metadata:{delivery_set:'academic-2026-09-17'},user_metadata:{account_role:a.role}}));
});
