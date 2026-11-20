import 'dotenv/config';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { readFile, open, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertOwnedIdentity, DELIVERY_SET, deliveryAccounts } from './delivery/accounts';
import { createAccountRepository } from '../src/features/accounts/infrastructure/supabaseAccounts';
import { createMarketplaceRepository } from '../src/features/marketplace/infrastructure/supabaseMarketplace';
import { validateOffer, type WeeklySlot } from '../src/features/marketplace/domain/contracts';

const additions: WeeklySlot[] = [
  { day: 1, start: '18:00', end: '20:00' },
  { day: 2, start: '18:00', end: '21:00' },
  { day: 3, start: '16:00', end: '19:00' },
  { day: 4, start: '18:00', end: '20:00' },
  { day: 6, start: '09:00', end: '12:00' },
];

function mergeAvailability(existing: WeeklySlot[]) {
  const slots = [...existing, ...additions].sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
  const merged: WeeklySlot[] = [];
  for (const slot of slots) {
    const previous = merged.at(-1);
    if (previous?.day === slot.day && previous.end >= slot.start) {
      if (slot.end > previous.end) previous.end = slot.end;
    } else {
      merged.push({ ...slot });
    }
  }
  return merged;
}

async function main() {
  assert.deepEqual(process.argv.slice(2), ['--apply'], 'Use --apply to refresh these two hosted demo accounts');
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  assert.ok(url && key, 'Missing public Supabase configuration');
  const folder = join(homedir(), '.local/share/tutorcucuta', DELIVERY_SET);
  const journal = JSON.parse(await readFile(join(folder, 'accounts.json'), 'utf8'));
  assert.equal(journal.set, DELIVERY_SET);
  assert.equal(journal.url, url);
  const lockPath = join(folder, 'operator.lock');
  const lock = await open(lockPath, 'wx', 0o600);
  const clients: SupabaseClient[] = [];
  try {
    async function login(accountKey: string) {
      const definition = deliveryAccounts.find(account => account.key === accountKey);
      const entry = journal.accounts[accountKey];
      assert.ok(definition && entry?.email === definition.email);
      const client = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await client.auth.signInWithPassword({ email: entry.email, password: entry.password });
      assert.ok(!error && data.user?.id === entry.id, 'Demo sign-in failed');
      clients.push(client);
      assertOwnedIdentity(definition, data.user!);
      const accounts = createAccountRepository(client);
      const identity = { id: entry.id, email: entry.email, name: String(definition.profile.name) };
      const profile = await accounts.read(identity);
      assert.ok(profile && profile.role === definition.role);
      return { accounts, identity, profile, marketplace: createMarketplaceRepository(client) };
    }

    const camilo = await login('camilo-becerra');
    const santiago = await login('santiago-suarez');
    const offer = await camilo.marketplace.ownOffer();
    assert.ok(offer?.published && offer.modalities.includes('virtual'));
    assert.ok(Number(santiago.profile.profile.age) >= 18 && santiago.profile.profile.phone);
    const availability = mergeAvailability(offer.availability);
    validateOffer({ ...offer, availability });

    const tutorFields = {
      ...camilo.profile.profile,
      bio: 'Soy ingeniero electrónico y acompaño a estudiantes de bachillerato y primeros semestres universitarios en Matemáticas. En la primera sesión revisamos un ejercicio para identificar el punto de partida. Luego resolvemos un ejemplo paso a paso, practicamos juntos y cerramos con un problema para que puedas comprobar lo aprendido. Trabajo en modalidad virtual con pizarra compartida y ejercicios de repaso.',
      specialties: [...new Set([...(camilo.profile.profile.specialties as string[]), 'Cálculo diferencial', 'Continuidad', 'Interpretación de gráficas'])],
    };
    const studentFields = {
      ...santiago.profile.profile,
      academicGoal: 'Preparar mi próximo parcial de Cálculo I y resolver límites y problemas de continuidad con autonomía.',
      difficultiesOrTopics: 'Me cuesta distinguir cuándo sustituir, factorizar o racionalizar. Quiero interpretar límites laterales en gráficas y justificar cada paso.',
      learningStyles: [...new Set([...(santiago.profile.profile.learningStyles as string[]), 'Explicaciones paso a paso', 'Ejercicios prácticos'])],
      preferredModality: 'virtual',
      preferredSchedule: 'Entre semana después de las 17:00 o el sábado por la mañana.',
      bioNote: 'Estoy empezando Cálculo I en la universidad. Puedo traer ejercicios del curso. Me ayuda ver un ejemplo guiado y luego intentar uno por mi cuenta.',
    };

    let tutorUpdated = false;
    for (const [name, actor, fields] of [
      ['camilo', camilo, tutorFields],
      ['santiago', santiago, studentFields],
    ] as const) {
      const bytes = await readFile(new URL(`../docs/demo-assets/${name}-demo.jpg`, import.meta.url));
      const previousPhoto = actor.profile.avatarPath ? await fetch(actor.profile.displayAvatarUrl) : undefined;
      const samePhoto = Boolean(previousPhoto?.ok && bytes.equals(Buffer.from(await previousPhoto.arrayBuffer())));
      if (!samePhoto || !isDeepStrictEqual(fields, actor.profile.profile)) {
        const avatar = samePhoto ? actor.profile.displayAvatarUrl : `data:image/jpeg;base64,${bytes.toString('base64')}`;
        const saved = await actor.accounts.save(actor.profile, fields, avatar);
        assert.ok(saved.avatarPath);
        if (name === 'camilo') tutorUpdated = true;
      }
    }
    const previousListing = (await santiago.marketplace.catalog()).find(tutor => tutor.id === camilo.profile.id);
    if (tutorUpdated || previousListing?.bio !== tutorFields.bio || !isDeepStrictEqual(availability, offer.availability)) {
      const published = await camilo.marketplace.publish({ ...offer, availability });
      assert.ok(published.published);
    }
    const listing = (await santiago.marketplace.catalog()).find(tutor => tutor.id === camilo.profile.id);
    assert.deepEqual(listing?.availability, availability);
    assert.equal(listing?.bio, tutorFields.bio);
    assert.ok(listing.avatar && (await fetch(listing.avatar)).ok, 'Student could not load tutor portrait');
    const refreshedStudent = await santiago.accounts.read(santiago.identity);
    assert.ok(refreshedStudent?.avatarPath && (await fetch(refreshedStudent.displayAvatarUrl)).ok, 'Student portrait unavailable');

    const activePair = (await santiago.marketplace.requests()).filter(request =>
      request.studentId === santiago.profile.id && request.targetTutorId === camilo.profile.id &&
      (request.status === 'pending' || request.status === 'accepted')
    );
    for (const request of activePair) await santiago.marketplace.transition(request.id, 'cancelled');
    for (const actor of [camilo, santiago]) {
      const rows = await actor.marketplace.requests();
      assert.ok(!rows.some(request => request.studentId === santiago.profile.id &&
        request.targetTutorId === camilo.profile.id && ['pending', 'accepted'].includes(request.status)));
    }
    console.log(JSON.stringify({ publishedAvailability: availability, cancelledPairRequests: activePair.length, profilesAndPhotosVerified: true }));
  } finally {
    await Promise.allSettled(clients.map(client => client.auth.signOut({ scope: 'local' })));
    await lock.close();
    await unlink(lockPath);
  }
}

main().catch(error => {
  console.error(error instanceof Error && 'code' in error ? `Demo refresh failed (${error.code}).` : 'Demo refresh failed. Check configuration and demo data before retrying.');
  process.exitCode = 1;
});
