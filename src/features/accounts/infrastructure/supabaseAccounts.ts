import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { AuthPort, AccountRepository } from '../domain/ports';
import { AccountError, emptyProfile, validateProfile, validateCredentials, validateAvatarUrl } from '../domain/profile';
import type { AccountIdentity, AccountRole, OwnAccount, ProfileFields } from '../domain/profile';

function failure(error: { code?: string; message?: string }, fallback: string): AccountError {
  const messages: Record<string, string> = {
    invalid_credentials: 'El correo o la contraseña no son correctos.',
    email_not_confirmed: 'Confirma tu correo antes de iniciar sesión.',
    user_already_exists: 'Ya existe una cuenta. Inicia sesión o recupera tu contraseña.',
    over_email_send_rate_limit: 'Espera unos minutos antes de solicitar otro correo.',
    over_request_rate_limit: 'Demasiados intentos. Espera unos minutos.',
    weak_password: 'Usa una contraseña más segura, de al menos 8 caracteres.',
    provider_disabled: 'El acceso con Google aún no está habilitado.',
  };
  return new AccountError(error.code === 'email_not_confirmed' ? 'CONFIRM_EMAIL' : 'AUTH_FAILED', messages[error.code || ''] || fallback, error);
}
function identity(user: User): AccountIdentity {
  const role = user.user_metadata?.account_role;
  return { id: user.id, email: user.email || '', name: typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.slice(0, 200) : '',
    avatarUrl: typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : undefined,
    suggestedRole: role === 'student' || role === 'tutor' ? role : undefined };
}
/** Auth delegates credential/session storage exclusively to the Supabase SDK. */
export function createAuthAdapter(client: SupabaseClient | null): AuthPort {
  const configured = () => { if (!client) throw new AccountError('NOT_CONFIGURED', 'Falta configurar la conexión con Supabase.'); return client; };
  const redirect = () => `${window.location.origin}/`;
  return {
    subscribe(listener) {
      if (!client) { queueMicrotask(() => listener(null, false)); return () => {}; }
      const { data } = client.auth.onAuthStateChange((event, session) => {
        // Do not await SDK/database operations while the Auth lock is held.
        listener(session?.user ? identity(session.user) : null, event === 'PASSWORD_RECOVERY');
      });
      return () => data.subscription.unsubscribe();
    },
    async signIn(email, password) {
      const result = await configured().auth.signInWithPassword(validateCredentials(email, password, false));
      if (result.error) throw failure(result.error, 'No se pudo iniciar sesión. Revisa tu conexión e inténtalo de nuevo.');
    },
    async signUp(email, password, role) {
      const result = await configured().auth.signUp({ ...validateCredentials(email, password, true), options: { data: { account_role: role }, emailRedirectTo: redirect() } });
      if (result.error) throw failure(result.error, 'No se pudo crear la cuenta. Inténtalo de nuevo.');
      return result.data.session ? 'signed-in' : 'confirmation';
    },
    async google(role) {
      // The role is an onboarding hint only; a stored account always takes precedence.
      sessionStorage.setItem('tutorcucuta.pending-role', role);
      const result = await configured().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect(), skipBrowserRedirect: true } });
      if (result.error) throw failure(result.error, 'No se pudo abrir Google. Revisa que el proveedor esté habilitado.');
      if (!result.data.url) throw new AccountError('AUTH_FAILED', 'No se recibió el enlace de Google.');
      window.location.assign(result.data.url);
    },
    async requestPasswordReset(email) {
      const normalized = validateCredentials(email, 'unused', false).email;
      const result = await configured().auth.resetPasswordForEmail(normalized, { redirectTo: `${redirect()}?auth=recovery` });
      if (result.error) throw failure(result.error, 'No se pudo solicitar la recuperación. Inténtalo de nuevo.');
    },
    async updatePassword(password) {
      validateCredentials('validation@example.invalid', password, true);
      const result = await configured().auth.updateUser({ password });
      if (result.error) throw failure(result.error, 'No se pudo cambiar la contraseña. Solicita un nuevo enlace.');
    },
    async signOut() {
      const result = await configured().auth.signOut({ scope: 'local' });
      if (result.error) throw failure(result.error, 'No se pudo cerrar la sesión. Reintenta.');
      sessionStorage.removeItem('tutorcucuta.pending-role');
    },
  };
}

const COLUMNS = 'id,role,profile,avatar_path,avatar_url,version';
const BUCKET = 'profile-avatars';
type AccountRow = { id: string; role: AccountRole; profile: unknown; avatar_path: string | null; avatar_url: string | null; version: number };
/** Private rows use owner RLS and version comparisons; uploaded images never enter profile JSON. */
export function createAccountRepository(client: SupabaseClient | null): AccountRepository {
  const configured = () => { if (!client) throw new AccountError('NOT_CONFIGURED', 'Falta configurar Supabase.'); return client; };
  async function decode(row: AccountRow, email: string, preparedAvatar?: string): Promise<OwnAccount> {
    if (!['student', 'tutor'].includes(row.role) || !Number.isInteger(row.version)) throw new AccountError('PROFILE_UNAVAILABLE', 'El perfil recibido no es válido.');
    let displayAvatarUrl = preparedAvatar ?? row.avatar_url ?? '';
    if (row.avatar_path && preparedAvatar === undefined) {
      const signed = await configured().storage.from(BUCKET).createSignedUrl(row.avatar_path, 86400);
      if (signed.error) throw new AccountError('PHOTO_FAILED', 'No se pudo cargar tu foto. Reintenta cargar el perfil.', signed.error);
      displayAvatarUrl = signed.data.signedUrl;
    }
    return { id: row.id, role: row.role, profile: validateProfile(row.role, row.profile), email, avatarPath: row.avatar_path, avatarUrl: row.avatar_url, displayAvatarUrl, version: row.version };
  }
  async function read(owner: AccountIdentity) {
    const result = await configured().from('user_accounts').select(COLUMNS).eq('id', owner.id).maybeSingle();
    if (result.error) throw new AccountError('PROFILE_UNAVAILABLE', 'No se pudo cargar tu perfil. Comprueba la conexión y que la migración de cuentas esté aplicada.', result.error);
    return result.data ? decode(result.data, owner.email) : null;
  }
  async function upload(owner: string, avatar: string) {
    const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(avatar);
    if (!match || match[2].length > 6990508) throw new AccountError('PHOTO_FAILED', 'Usa una imagen JPEG, PNG o WebP de hasta 5 MB.');
    let bytes: Uint8Array;
    try { bytes = Uint8Array.from(atob(match[2]), char => char.charCodeAt(0)); }
    catch (error) { throw new AccountError('PHOTO_FAILED', 'El archivo de imagen no es válido.', error); }
    const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
    if (bytes.length > 5242880 || !(match[1] === 'png' ? png : match[1] === 'jpeg' ? jpeg : webp)) throw new AccountError('PHOTO_FAILED', 'El archivo no es una imagen admitida.');
    const path = `${owner}/${crypto.randomUUID()}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
    const result = await configured().storage.from(BUCKET).upload(path, bytes, { contentType: `image/${match[1]}`, upsert: false });
    if (result.error) throw new AccountError('PHOTO_FAILED', 'No se pudo subir la foto. Tus cambios siguen en el formulario.', result.error);
    return path;
  }
  return {
    read,
    async create(owner, role) {
      const profile = emptyProfile(role); profile.name = owner.name.slice(0, 200);
      const result = await configured().from('user_accounts').insert({ id: owner.id, role, profile }).select(COLUMNS).single();
      if (result.error?.code === '23505') { const existing = await read(owner); if (existing) return existing; }
      if (result.error) throw new AccountError('PROFILE_UNAVAILABLE', 'No se pudo crear tu perfil. Reintenta; no necesitas registrarte otra vez.', result.error);
      return decode(result.data, owner.email);
    },
    async save(account, fields: ProfileFields, avatar) {
      const profile = validateProfile(account.role, fields);
      let path = account.avatarPath;
      let url = account.avatarUrl;
      if (avatar !== account.displayAvatarUrl) {
        path = avatar.startsWith('data:') ? await upload(account.id, avatar) : null;
        url = path ? null : validateAvatarUrl(avatar);
      }
      let prepared: OwnAccount;
      // Resolve the photo before committing, so a signing failure cannot be reported as a failed profile write.
      prepared = await decode({ id: account.id, role: account.role, profile, avatar_path: path, avatar_url: url, version: account.version }, account.email);
      const result = await configured().from('user_accounts').update({ profile, avatar_path: path, avatar_url: url })
        .eq('id', account.id).eq('version', account.version).select(COLUMNS).maybeSingle();
      if (result.error) throw new AccountError('PROFILE_UNAVAILABLE', 'No se pudo confirmar el guardado. Tus cambios siguen en el formulario; si perdiste la conexión, recarga para comprobarlo.', result.error);
      if (!result.data) throw new AccountError('PROFILE_CONFLICT', 'Tu perfil cambió en otra sesión. Copia tus cambios y recarga la página antes de guardar.');
      prepared = await decode(result.data, account.email, prepared.displayAvatarUrl);
      // Retain unacknowledged uploads: a lost HTTP response can follow a committed write.
      // Cleanup of unreferenced objects is an administrative maintenance concern.
      if (account.avatarPath && account.avatarPath !== path) {
        try {
          const cleanup = await configured().storage.from(BUCKET).remove([account.avatarPath]);
          if (cleanup.error) prepared.notice = 'Perfil guardado. La foto anterior sigue almacenada de forma privada.';
        } catch { prepared.notice = 'Perfil guardado. La foto anterior sigue almacenada de forma privada.'; }
      }
      return prepared;
    },
  };
}
