import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createTutorLocationRepository } from '../src/features/maps/infrastructure/tutorLocationRepository';

/** Read-only hosted verification: validate the public snapshot and join its Realtime subscription. */
async function verifyLocationFeed(): Promise<void> {
  const environment = { ...parse(readFileSync(new URL('../.env', import.meta.url))), ...process.env };
  const url = environment.VITE_SUPABASE_URL;
  const key = environment.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Configure the public Supabase URL and browser key in .env.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const repository = createTutorLocationRepository(client);
  let unsubscribe: (() => void) | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await repository.read();
    await new Promise<void>((resolve, reject) => {
      timeout = setTimeout(() => reject(new Error('Realtime did not connect within 20 seconds.')), 20000);
      unsubscribe = repository.subscribe(() => {}, status => {
        if (status === 'connected') resolve();
        else if (status === 'unavailable') reject(new Error('The Realtime subscription is unavailable.'));
      });
    });
    const locations = await repository.read();
    console.log(`PASS: validated public snapshot and connected Realtime subscription (${locations.length} published points).`);
    console.log('No writes performed. Update/withdrawal delivery between real users is a separate check.');
  } finally {
    clearTimeout(timeout);
    unsubscribe?.();
    await client.removeAllChannels();
    client.realtime.disconnect();
  }
}

verifyLocationFeed().catch((error: unknown) => {
  const cause = error instanceof Error ? error.cause : undefined;
  const code = typeof cause === 'object' && cause !== null && 'code' in cause ? String(cause.code) : '';
  if (code === 'PGRST205' || code === '42P01') {
    console.error('The public tutor_map_locations table is missing. Apply supabase/migrations/20260910000000_published_tutor_map_locations.sql in the intended project.');
  } else {
    console.error(error instanceof Error ? error.message : 'Location feed verification failed.');
  }
  process.exitCode = 1;
});
