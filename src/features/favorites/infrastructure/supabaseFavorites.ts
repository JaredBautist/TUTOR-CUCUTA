import type { SupabaseClient } from '@supabase/supabase-js';
import { FavoritesError, type FavoritesRepository } from '../domain/contracts';

const MAX_FAVORITES = 500;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function failure(cause: unknown): FavoritesError {
  if (cause instanceof FavoritesError) return cause;
  const error = cause as { code?: string; message?: string };
  if (['PGRST202', 'PGRST205', '42P01'].includes(error?.code || '')) {
    return new FavoritesError('MIGRATION_REQUIRED', 'Favoritos aún no está disponible. Falta activar su migración en Supabase.', cause);
  }
  const messages: Record<string, string> = {
    OFFER_UNAVAILABLE: 'El docente retiró su oferta. Actualiza los resultados.',
    FAVORITE_LIMIT: 'Puedes guardar hasta 500 docentes. Quita alguno antes de agregar otro.',
  };
  return new FavoritesError(error?.code || 'FAVORITES_UNAVAILABLE', messages[error?.message || ''] || 'No se pudo confirmar el favorito. Actualiza tus favoritos antes de reintentar.', cause);
}

/** Owner-scoped reads and idempotent desired-state writes; never accepts a student ID. */
export function createFavoritesRepository(client: SupabaseClient | null): FavoritesRepository {
  const db = () => {
    if (!client) throw new FavoritesError('NOT_CONFIGURED', 'Configura Supabase para usar favoritos.');
    return client;
  };
  return {
    async list() {
      try {
        const { data: rows, error } = await db().from('student_favorites').select('tutor_id')
          .order('tutor_id').limit(MAX_FAVORITES + 1).abortSignal(AbortSignal.timeout(15000));
        if (error) throw error;
        if (!Array.isArray(rows) || rows.length > MAX_FAVORITES || rows.some(row => !uuid.test(row.tutor_id))) {
          throw new FavoritesError('INVALID_RESPONSE', 'No se pudo leer la lista de favoritos.');
        }
        return [...new Set(rows.map(row => row.tutor_id as string))];
      } catch (cause) { throw failure(cause); }
    },
    async set(tutorId, saved) {
      try {
        if (!uuid.test(tutorId) || typeof saved !== 'boolean') throw new FavoritesError('INVALID_FAVORITE', 'El favorito no es válido.');
        const { data: result, error } = await db().rpc('set_student_favorite_v1', { p_tutor_id: tutorId, p_saved: saved })
          .abortSignal(AbortSignal.timeout(15000));
        if (error) throw error;
        if (result !== saved) throw new FavoritesError('INVALID_RESPONSE', 'No se pudo confirmar el favorito. Actualiza tus favoritos.');
        return result;
      } catch (cause) { throw failure(cause); }
    },
  };
}
