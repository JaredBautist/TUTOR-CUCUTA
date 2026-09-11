import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccountAccessForm } from '../src/components/common/AccountAccessForm';
import type { SessionController, SessionState } from '../src/features/accounts/application/sessionController';
function render(state: SessionState, href = 'https://app.example.invalid/') {
  const original = globalThis.window;
  globalThis.window = { location: { href } } as unknown as Window & typeof globalThis;
  try { return renderToStaticMarkup(React.createElement(AccountAccessForm, { role: 'student', state, controller: {} as SessionController })); }
  finally { globalThis.window = original; }
}
const state: SessionState = { status: 'onboarding', identity: {id:'id',email:'student@example.invalid',name:''}, account: null, recovery: true, error: '' };
test('recovery asks for a new password even before choosing an account role',()=>{
  const html=render(state);
  assert.match(html,/Nueva contraseña/); assert.match(html,/type="password"/);
});
test('an unsuccessful PKCE callback explains the expired or invalid link',()=>{
  const html=render({...state,status:'anonymous',identity:null,recovery:false},'https://app.example.invalid/?code=expired');
  assert.match(html,/ha caducado/);
});
