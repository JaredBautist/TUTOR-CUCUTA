import assert from 'node:assert/strict';
import {test} from 'node:test';
import {presentationAccounts} from '../scripts/delivery/expandedAccounts';
import {deliveryAccounts,deliveryTutors} from '../scripts/delivery/accounts';
import {validateProfile} from '../src/features/accounts/domain/profile';
import {validateOffer} from '../src/features/marketplace/domain/contracts';

test('presentation expansion provides ten unique identities per role and preserves original records',()=>{
 assert.equal(new Set(presentationAccounts.map(a=>a.email)).size,20);
 assert.equal(presentationAccounts.filter(a=>a.role==='student').length,10);
 assert.equal(presentationAccounts.filter(a=>a.role==='tutor').length,10);
 for(const original of deliveryAccounts)assert.deepEqual(presentationAccounts.find(a=>a.key===original.key),original);
 assert.equal(deliveryTutors().length,4,'Original recommendation fixtures must remain unchanged');
 for(const account of presentationAccounts){
  assert.ok(account.email.endsWith('@demo.tutorcucuta.example'));
  validateProfile(account.role,account.profile);
  if(!deliveryAccounts.some(a=>a.key===account.key) && account.role==='student')assert.ok(Number(account.profile.age)>=18);
  if(account.offer)validateOffer({...account.offer,phone:'+573000000000',published:false,version:0});
 }
});
