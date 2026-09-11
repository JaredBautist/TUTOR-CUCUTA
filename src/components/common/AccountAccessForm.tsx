import React, { useState, useEffect } from 'react';
import type { AccountRole } from '../../features/accounts/domain/profile';
import type { SessionController, SessionState } from '../../features/accounts/application/sessionController';
interface Props { role: AccountRole; controller: SessionController; state: SessionState }
/** Account access controls reuse the landing surface and delegate all auth operations. */
export function AccountAccessForm({ role, controller, state }: Props) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() => {
    const url = new URL(window.location.href);
    return url.searchParams.has('error') || url.searchParams.has('code') || new URLSearchParams(url.hash.slice(1)).has('error') ? 'El enlace de acceso no es válido o ha caducado. Inténtalo de nuevo.' : '';
  });
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.slice(1));
    if (!url.searchParams.has('code') && !url.searchParams.has('error') && !hash.has('error')) return;
    // Auth initialization has finished before this form mounts. Discard failed callback
    // parameters so a later successful login will not replay them on reload.
    for (const key of ['code', 'error', 'error_code', 'error_description', 'auth']) url.searchParams.delete(key);
    if (hash.has('error')) url.hash = '';
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }, []);

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo completar la operación. Revisa tu conexión.'); }
    finally { setBusy(false); }
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      if (state.recovery) {
        await controller.auth.updatePassword(password); setPassword(''); controller.finishRecovery();
        window.history.replaceState(null, '', window.location.pathname); setNotice('Contraseña actualizada.');
      } else if (state.status === 'onboarding') {
        await controller.chooseRole(role);
      } else if (mode === 'signup') {
        const result = await controller.auth.signUp(email, password, role); setPassword('');
        if (result === 'confirmation') setNotice('Revisa tu correo para confirmar la cuenta. Después podrás iniciar sesión; no necesitas registrarte otra vez.');
      } else if (mode === 'reset') {
        await controller.auth.requestPasswordReset(email);
        setNotice('Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña.');
      } else { await controller.auth.signIn(email, password); setPassword(''); }
    });
  };
  const button = 'w-full py-3 px-5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-sm transition-colors min-h-[44px] disabled:opacity-60';
  const field = 'w-full mt-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500';
  const regular = !state.recovery && state.status !== 'onboarding';
  return <div className="space-y-3 pt-1">
    {regular && <>
      <button type="button" disabled={busy} onClick={() => void run(() => controller.auth.google(role))} className={`${button} flex items-center justify-center gap-3`}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.03 46.98 31.87 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.75 24c0-1.59.27-3.13.78-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6C30.03 37.65 27.23 38.5 24 38.5c-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>
        Continuar con Google
      </button>
      <p className="text-center text-xs text-slate-500">o continúa con tu correo</p>
      <div className="flex gap-2" aria-label="Opciones de acceso">
        {(['login', 'signup'] as const).map(value => <button key={value} type="button" disabled={busy} aria-pressed={mode === value} onClick={() => { setMode(value); setError(''); setNotice(''); setPassword(''); }} className={`flex-1 rounded-lg py-2 font-semibold text-sm ${mode === value ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'text-slate-600'}`}>{value === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</button>)}
      </div>
    </>}
    <form onSubmit={submit} className="space-y-3">
      <fieldset disabled={busy} className="space-y-3">
        {state.status === 'onboarding' && !state.recovery ? <p className="text-sm text-slate-600">Elige tu rol arriba. Será el único rol asociado a esta cuenta.</p> : <>
          {!state.recovery && <label className="block text-sm font-semibold text-slate-700">Correo electrónico<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className={field} /></label>}
          {(state.recovery || mode !== 'reset') && <label className="block text-sm font-semibold text-slate-700">{state.recovery ? 'Nueva contraseña' : 'Contraseña'}<input type="password" required minLength={state.recovery || mode === 'signup' ? 8 : 1} maxLength={128} autoComplete={state.recovery || mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} className={field} /></label>}
          {mode === 'signup' && !state.recovery && <p className="text-xs text-slate-600">Crearás una cuenta de {role === 'student' ? 'estudiante' : 'docente'}. El rol no se podrá cambiar. Usa al menos 8 caracteres en tu contraseña.</p>}
        </>}
        <button type="submit" className={button}>{busy ? 'Procesando…' : state.recovery ? 'Guardar contraseña' : state.status === 'onboarding' ? 'Crear mi perfil' : mode === 'signup' ? 'Registrarme' : mode === 'reset' ? 'Enviar enlace de recuperación' : 'Entrar'}</button>
      </fieldset>
    </form>
    {regular && mode === 'login' && <button type="button" disabled={busy} onClick={() => { setMode('reset'); setPassword(''); setError(''); setNotice(''); }} className="text-sm text-teal-800 underline underline-offset-4">Olvidé mi contraseña</button>}
    {!regular && <button type="button" disabled={busy} onClick={() => void run(() => controller.auth.signOut())} className="text-sm text-slate-600 underline">Cerrar sesión</button>}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">{notice}</p>}
  </div>;
}
