import React, { useState, useEffect, useRef } from 'react';
import {Eye,EyeOff} from 'lucide-react';
import type { AccountRole } from '../../features/accounts/domain/profile';
import type { SessionController, SessionState } from '../../features/accounts/application/sessionController';
interface Props { role: AccountRole; controller: SessionController; state: SessionState }
/** Account access controls reuse the landing surface and delegate all auth operations. */
export function AccountAccessForm({ role, controller, state }: Props) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword,setShowPassword]=useState(false);
  const [capsLock,setCapsLock]=useState(false);
  const [fieldErrors,setFieldErrors]=useState({email:'',password:''});
  const errorRef=useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState(() => {
    const url = new URL(window.location.href);
    return url.searchParams.has('error') || url.searchParams.has('code') || new URLSearchParams(url.hash.slice(1)).has('error') ? 'El enlace de acceso no es válido o ha caducado. Inténtalo de nuevo.' : '';
  });
  const [notice, setNotice] = useState('');
  useEffect(()=>{if(error && !busy)errorRef.current?.focus();},[error,busy]);
  const changeMode=(next:typeof mode)=>{setMode(next);setPassword('');setShowPassword(false);setCapsLock(false);setFieldErrors({email:'',password:''});setError('');setNotice('');};
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
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(''); setNotice('');
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo completar la operación. Revisa tu conexión.'); }
    finally { inFlight.current = false; setBusy(false); }
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
        if (result === 'existing-account') {
          setMode('login'); setShowPassword(false);
          setNotice('Este correo ya está registrado. Inicia sesión, continúa con Google si lo usaste al registrarte o recupera tu contraseña. No necesitas crear otra cuenta.');
        }
        if (result === 'confirmation') setNotice('Revisa tu correo para confirmar la cuenta. Después podrás iniciar sesión; no necesitas registrarte otra vez.');
      } else if (mode === 'reset') {
        await controller.auth.requestPasswordReset(email);
        setNotice('Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña.');
      } else { await controller.auth.signIn(email, password); setPassword(''); }
    });
  };
  const button = 'w-full py-3 px-5 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-semibold rounded-xl transition-colors min-h-[48px] disabled:opacity-60';
  const field = 'w-full mt-1 min-h-12 rounded-xl border border-slate-400 bg-white px-3 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700 aria-invalid:border-red-700';
  const regular = !state.recovery && state.status !== 'onboarding';
  const newPassword=state.recovery || mode==='signup';
  return <div className="space-y-4 pt-1" data-ui>
    {error && <div ref={errorRef} id="access-error" tabIndex={-1} role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p className="font-semibold">No se pudo completar el acceso</p><p className="mt-1">{error}</p></div>}
    {regular && <>
      <button type="button" disabled={busy} onClick={() => void run(() => controller.auth.google(role))} className={`${button} flex items-center justify-center gap-3`}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.03 46.98 31.87 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.75 24c0-1.59.27-3.13.78-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6C30.03 37.65 27.23 38.5 24 38.5c-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>
        Continuar con Google
      </button>
      <p className="text-center text-sm text-slate-600">o continúa con tu correo</p>
      <div role="group" className="flex gap-2" aria-label="Opciones de acceso">
        {(['login', 'signup'] as const).map(value => <button key={value} type="button" disabled={busy} aria-pressed={mode === value} onClick={() => changeMode(value)} className={`flex-1 min-h-12 rounded-lg px-3 py-2 font-semibold text-sm ${mode === value ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'text-slate-700 hover:bg-slate-100'}`}>{value === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</button>)}
      </div>
    </>}
    {regular && mode==='reset' && <div><h2 className="text-lg font-bold text-slate-900">Recupera tu acceso</h2><p className="mt-1 text-sm text-slate-600">Escribe el correo con el que creaste tu cuenta.</p></div>}
    <form aria-label={state.recovery?'Cambiar contraseña':mode==='reset'?'Recuperar contraseña':mode==='signup'?'Crear cuenta':'Iniciar sesión'} aria-busy={busy} onSubmit={submit} onInvalid={event=>{const input=event.target as HTMLInputElement;const name=input.name;if(name==='email' || name==='password')setFieldErrors(previous=>({...previous,[name]:name==='email'?(input.validity.valueMissing?'Escribe tu correo electrónico.':'Escribe un correo válido, por ejemplo nombre@correo.com.'):(input.validity.tooShort?'Usa al menos 8 caracteres.':'Escribe tu contraseña.')}));}} className="space-y-4">
      <fieldset disabled={busy} className="space-y-4">
        {state.status === 'onboarding' && !state.recovery ? <p className="text-sm text-slate-600">Elige tu rol arriba. Será el único rol asociado a esta cuenta.</p> : <>
          {!state.recovery && <div><label htmlFor="access-email" className="block text-sm font-semibold text-slate-700">Correo electrónico</label><input id="access-email" name="email" type="email" inputMode="email" autoCapitalize="none" spellCheck={false} autoComplete="email" required maxLength={254} value={email} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email?'access-email-error':undefined} onChange={event => {setEmail(event.target.value);setFieldErrors(previous=>({...previous,email:''}));}} className={field} />{fieldErrors.email && <p id="access-email-error" className="mt-2 text-sm text-red-800">{fieldErrors.email}</p>}</div>}
          {(state.recovery || mode !== 'reset') && <div><label htmlFor="access-password" className="block text-sm font-semibold text-slate-700">{state.recovery ? 'Nueva contraseña' : 'Contraseña'}</label><div className="relative"><input id="access-password" name="password" autoCapitalize="none" spellCheck={false} type={showPassword?'text':'password'} required minLength={newPassword?8:1} maxLength={128} autoComplete={newPassword?'new-password':'current-password'} value={password} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={[newPassword?'access-password-hint':'',fieldErrors.password?'access-password-error':'',capsLock?'access-caps-lock':''].filter(Boolean).join(' ') || undefined} onKeyDown={event=>setCapsLock(event.getModifierState('CapsLock'))} onKeyUp={event=>setCapsLock(event.getModifierState('CapsLock'))} onBlur={()=>setCapsLock(false)} onChange={event => {setPassword(event.target.value);setFieldErrors(previous=>({...previous,password:''}));}} className={`${field} pr-14`} /><button type="button" aria-label={showPassword?'Ocultar contraseña':'Mostrar contraseña'} aria-controls="access-password" aria-pressed={showPassword} onClick={()=>setShowPassword(value=>!value)} className="absolute right-1 top-1.5 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-teal-50 hover:text-teal-800">{showPassword?<EyeOff aria-hidden="true" size={20}/>:<Eye aria-hidden="true" size={20}/>}</button></div>{newPassword && <p id="access-password-hint" className="mt-2 text-sm text-slate-600">Usa al menos 8 caracteres. Puedes pegar tu contraseña o usar tu gestor.</p>}{fieldErrors.password && <p id="access-password-error" className="mt-2 text-sm text-red-800">{fieldErrors.password}</p>}{capsLock && <p id="access-caps-lock" role="status" className="mt-2 text-sm text-amber-900">Bloqueo de mayúsculas activado.</p>}</div>}
          {mode === 'signup' && !state.recovery && <p className="text-sm text-slate-600">Crearás una cuenta de {role === 'student' ? 'estudiante' : 'docente'}. El rol no se podrá cambiar.</p>}
        </>}
        <button type="submit" className={button}>{busy ? 'Procesando…' : state.recovery ? 'Guardar contraseña' : state.status === 'onboarding' ? 'Crear mi perfil' : mode === 'signup' ? 'Registrarme' : mode === 'reset' ? 'Enviar enlace de recuperación' : 'Entrar'}</button>
      </fieldset>
    </form>
    <p role="status" className="text-sm text-teal-900">{busy?'Procesando tu solicitud. Espera un momento.':''}</p>
    {regular && mode === 'login' && <button type="button" disabled={busy} onClick={() => changeMode('reset')} className="min-h-11 text-sm font-medium text-teal-800 underline underline-offset-4">Olvidé mi contraseña</button>}
    {regular && mode === 'reset' && <button type="button" disabled={busy} onClick={() => changeMode('login')} className="min-h-11 text-sm font-medium text-teal-800 underline underline-offset-4">Volver a iniciar sesión</button>}
    {!regular && <button type="button" disabled={busy} onClick={() => void run(() => controller.auth.signOut())} className="text-sm text-slate-600 underline">Cerrar sesión</button>}
    {notice && <p role="status" className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">{notice}</p>}
  </div>;
}
