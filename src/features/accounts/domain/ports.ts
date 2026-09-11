import type { AccountIdentity, AccountRole, OwnAccount, ProfileFields } from './profile';
export interface AuthPort {
  subscribe(listener: (identity: AccountIdentity | null, recovery: boolean) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, role: AccountRole): Promise<'confirmation' | 'signed-in'>;
  google(role: AccountRole): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>;
}
export interface AccountRepository {
  read(identity: AccountIdentity): Promise<OwnAccount | null>;
  create(identity: AccountIdentity, role: AccountRole): Promise<OwnAccount>;
  save(account: OwnAccount, profile: ProfileFields, avatar: string): Promise<OwnAccount>;
}
