import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { build } from 'esbuild';
import type { SearchFilters, StudentRequest, Tutor } from '../src/types';

interface PresentationViews {
  results: (tutors: Tutor[], filters: SearchFilters, savedTutors?: string[]) => string;
  profile: (tutor: Tutor) => string;
  requests: (request: StudentRequest) => string;
}

async function loadViews(): Promise<PresentationViews> {
  const result = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { renderToStaticMarkup } from 'react-dom/server';
        import { StudentResultsView } from './src/components/views/StudentResultsView';
        import { TutorProfileView } from './src/components/views/TutorProfileView';
        import { TeacherDashboardView } from './src/components/views/TeacherDashboardView';
        import { TeacherRequestDetailView } from './src/components/views/TeacherRequestDetailView';
        import { StudentRequestsView } from './src/components/views/StudentRequestsView';
        const noop = () => {};
        export const results = (tutors, filters, savedTutors = []) => renderToStaticMarkup(
          <StudentResultsView tutors={tutors} filters={filters} savedTutors={savedTutors}
            onSelectTutor={noop} onRequestTutor={noop} onModifySearch={noop} />
        );
        export const profile = (tutor) => renderToStaticMarkup(
          <TutorProfileView tutor={tutor} onBack={noop} onRequestTutor={noop} />
        );
        export const requests = (request) => [
          renderToStaticMarkup(<TeacherDashboardView requests={[request]} onSelectRequest={noop}
            onAcceptRequest={noop} onRejectRequest={noop} onEditProfile={noop} />),
          renderToStaticMarkup(<TeacherRequestDetailView request={request} onBack={noop}
            onAccept={noop} onReject={noop} />),
          renderToStaticMarkup(<StudentRequestsView requests={[request]} onBackToSearch={noop}
            onCancelRequest={noop} />),
        ].join('');
      `,
      resolveDir: process.cwd(),
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    define: { 'import.meta.env': '{}' },
  });
  const module = { exports: {} as PresentationViews };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(
    createRequire(import.meta.url), module, module.exports,
  );
  return module.exports;
}

const views = await loadViews();
const tutor: Tutor = {
  id: 'presentation-tutor', name: 'Docente publicado', title: 'Ingeniero de sistemas',
  institution: 'UFPS', avatar: '', experienceYears: 4, ratePerHour: 30000,
  verified: false, sector: 'Caobos', nextAvailable: '', modalities: ['presencial'],
  subjects: ['Matemáticas'], levels: ['Grado 11 - Media'], specialties: ['Cálculo'],
  bio: '', methodologySteps: [], matchReasons: [], availability: [
    { day: 1, start: '16:00', end: '18:00' },
    { day: 3, start: '14:00', end: '16:00' },
  ],
  location: { latitude: 7.89, longitude: -72.5 }, coverageRadiusKm: 5,
};
const filters: SearchFilters = {
  subject: 'Matemáticas', specificTopic: '', studentNote: '', learningStyles: [],
  educationLevel: 'Grado 11 - Media', modality: 'presencial', availableDays: [],
  timeSlot: '', maxBudget: 40000, radiusKm: 5, referenceSector: '',
};
const request: StudentRequest = {
  id: 'presentation-request', studentName: 'Estudiante registrado', grade: '11',
  guardianLinked: false, avatarInitials: 'ER', sector: 'Centro', subject: 'Matemáticas',
  focalTopic: '', goal: 'Preparar evaluación', studentNote: 'Necesito reforzar límites.',
  scheduledTime: '2026-10-05 16:00', durationHours: 1, ratePerHour: 30000,
  totalEstimated: 30000, modality: 'presencial', status: 'pending',
  matchCriteriaChecklist: [],
};

test('presentation: cards show declared weekly availability and profile copy is truthful', () => {
  const results = views.results([{ ...tutor, modalities: ['virtual'] }], { ...filters, modality: 'virtual' });
  assert.match(results, /Lunes 16:00–18:00 · \+1/);
  assert.doesNotMatch(results, /Sin horario registrado/);
  const profile = views.profile(tutor);
  assert.doesNotMatch(profile, /cuando la cuenta esté conectada/);
  assert.match(profile, /contacto se comparte/i);
});

test('presentation: missing structured topic does not render empty topic labels or separators', () => {
  const html = views.requests(request);
  assert.doesNotMatch(html, /Tema específico|<strong>Tema:<\/strong>|Matemáticas<\/strong> ·/);
  assert.match(html, /Preparar evaluación/);
  assert.match(html, /Necesito reforzar límites/);
});

test('presentation: result counters use eligible tutors and guide a missing search area', () => {
  const html = views.results([tutor], filters, [tutor.id]);
  assert.match(html, /Todos \(0\)/);
  assert.match(html, /Favoritos \(0\)/);
  assert.doesNotMatch(html, /Todos \(1\)|Favoritos \(1\)/);
  assert.match(html, /Define tu zona de búsqueda/);
});
