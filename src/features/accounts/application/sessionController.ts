import type { AuthPort, AccountRepository } from '../domain/ports';
import { AccountError } from '../domain/profile';
import type { AccountIdentity, AccountRole, OwnAccount, ProfileFields } from '../domain/profile';
export interface SessionState { status: 'loading' | 'anonymous' | 'onboarding' | 'ready' | 'error'; identity: AccountIdentity | null; account: OwnAccount | null; recovery: boolean; error: string }
const initial: SessionState = { status: 'loading', identity: null, account: null, recovery: false, error: '' };
/** Serializes account ownership transitions and ignores responses from a previous session. */
export class SessionController {
  private state: SessionState = initial;
  private listeners = new Set<() => void>();
  private generation = 0;
  private unsubscribe?: () => void;
  constructor(readonly auth: AuthPort, private repository: AccountRepository, private pendingRole: () => AccountRole | undefined) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(next: SessionState) { this.state = next; this.listeners.forEach(listener => listener()); }
  start() {
    this.unsubscribe = this.auth.subscribe((identity, recovery) => {
      if (identity?.id === this.state.identity?.id && this.state.status !== 'loading') {
        if (recovery) this.publish({ ...this.state, recovery: true });
        return;
      }
      const generation = ++this.generation;
      this.publish({ ...initial, identity, status: identity ? 'loading' : 'anonymous', recovery });
      if (identity) setTimeout(() => { if (generation === this.generation) void this.load(identity, generation); }, 0);
    });
    return () => { this.unsubscribe?.(); ++this.generation; this.state = initial; };
  }
  private async load(identity: AccountIdentity, generation: number) {
    try {
      let account = await this.repository.read(identity);
      if (generation !== this.generation) return;
      const role = identity.suggestedRole || this.pendingRole();
      if (!account && role) account = await this.repository.create(identity, role);
      if (generation === this.generation) this.publish({ ...this.state, account, status: account ? 'ready' : 'onboarding', error: '' });
    } catch (error) {
      if (generation === this.generation) this.publish({ ...this.state, status: 'error', error: error instanceof Error ? error.message : 'No se pudo cargar la cuenta.' });
    }
  }
  retry = () => { if (this.state.identity) { this.publish({ ...this.state, status: 'loading', error: '' }); void this.load(this.state.identity, ++this.generation); } };
  async chooseRole(role: AccountRole) {
    const identity = this.state.identity; const generation = this.generation;
    if (!identity || this.state.account) return;
    const account = await this.repository.create(identity, role);
    if (generation === this.generation) this.publish({ ...this.state, status: 'ready', account, error: '' });
  }
  async save(profile: ProfileFields, avatar: string) {
    const account = this.state.account; const generation = this.generation;
    if (!account) throw new AccountError('SESSION_CHANGED', 'Inicia sesión para guardar tu perfil.');
    const saved = await this.repository.save(account, profile, avatar);
    if (generation !== this.generation) throw new AccountError('SESSION_CHANGED', 'La sesión cambió. El perfil anterior ya no está abierto.');
    this.publish({ ...this.state, account: saved });
    return saved;
  }
  async refreshPhoto() {
    const { account, identity } = this.state; const generation = this.generation;
    if (!account?.avatarPath || !identity) return;
    try {
      const fresh = await this.repository.read(identity);
      if (generation === this.generation && fresh?.version === this.state.account?.version) {
        this.publish({ ...this.state, account: { ...this.state.account, displayAvatarUrl: fresh.displayAvatarUrl } });
      }
    } catch {
      if (generation === this.generation && this.state.account) this.publish({ ...this.state, account: { ...this.state.account, notice: 'No se pudo renovar la foto. Se volverá a intentar automáticamente.' } });
    }
  }
  finishRecovery() { this.publish({ ...this.state, recovery: false }); }
}
