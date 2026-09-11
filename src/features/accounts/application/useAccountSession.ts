import { useEffect, useState, useSyncExternalStore } from 'react';
import { supabase } from '../../../utils/supabase';
import { createAuthAdapter, createAccountRepository } from '../infrastructure/supabaseAccounts';
import { SessionController } from './sessionController';
export function useAccountSession() {
  const [controller] = useState(() => new SessionController(createAuthAdapter(supabase), createAccountRepository(supabase), () => {
    const role = sessionStorage.getItem('tutorcucuta.pending-role');
    return role === 'student' || role === 'tutor' ? role : undefined;
  }));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => {
    const stop = controller.start();
    const refresh = window.setInterval(() => void controller.refreshPhoto(), 30 * 60 * 1000);
    return () => { window.clearInterval(refresh); stop(); };
  }, [controller]);
  return { state, controller };
}
