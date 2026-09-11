import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { build } from 'esbuild';
import type { StudentRequest, Tutor } from '../src/types';
import type { UnifiedMapProps } from '../src/components/common/UnifiedCucutaMap';

interface RenderViews {
  dashboard: (request: StudentRequest) => string;
  detail: (request: StudentRequest) => string;
  map: (props: UnifiedMapProps) => string;
}

async function loadViews(): Promise<RenderViews> {
  const result = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { renderToStaticMarkup } from 'react-dom/server';
        import { TeacherDashboardView } from './src/components/views/TeacherDashboardView';
        import { TeacherRequestDetailView } from './src/components/views/TeacherRequestDetailView';
        import { UnifiedCucutaMap } from './src/components/common/UnifiedCucutaMap';
        const noop = () => {};
        export const dashboard = (request) => renderToStaticMarkup(
          <TeacherDashboardView requests={[request]} onSelectRequest={noop}
            onAcceptRequest={noop} onRejectRequest={noop} onEditProfile={noop} />
        );
        export const detail = (request) => renderToStaticMarkup(
          <TeacherRequestDetailView request={request} onBack={noop}
            onAccept={noop} onReject={noop} />
        );
        export const map = (props) => renderToStaticMarkup(<UnifiedCucutaMap {...props} />);
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
  const module = { exports: {} as RenderViews };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(
    createRequire(import.meta.url), module, module.exports,
  );
  return module.exports;
}

const views = await loadViews();
const contactLink = /href="(?:tel:|https:\/\/wa\.me\/)/;
const request: StudentRequest = {
  id: 'contact-test-request',
  studentName: 'Estudiante registrado',
  grade: '',
  guardianLinked: true,
  avatarInitials: 'ER',
  sector: '',
  subject: 'Matemáticas',
  focalTopic: '',
  goal: '',
  studentNote: '',
  scheduledTime: '',
  durationHours: 1,
  ratePerHour: 45000,
  totalEstimated: 45000,
  modality: 'virtual',
  status: 'pending',
  matchCriteriaChecklist: [],
  guardianPhone: '+57 320 555 0123',
};

const tutor: Tutor = {
  id: 'map-test-tutor',
  name: 'Docente registrado',
  title: '',
  institution: '',
  avatar: '',
  experienceYears: 2,
  ratePerHour: 45000,
  verified: false,
  sector: '',
  nextAvailable: '',
  modalities: ['presencial'],
  subjects: [],
  levels: [],
  specialties: [],
  bio: '',
  methodologySteps: [],
  matchReasons: [],
};

test('CV-06: pending and rejected requests expose no contact link despite a supplied phone', () => {
  for (const status of ['pending', 'rejected'] as const) {
    const currentRequest = { ...request, status };
    assert.doesNotMatch(views.dashboard(currentRequest), contactLink, `Dashboard: ${status}`);
    assert.doesNotMatch(views.detail(currentRequest), contactLink, `Detail: ${status}`);
  }
});

test('CV-06: accepted requests link only the actual linked guardian phone', () => {
  const currentRequest = { ...request, status: 'accepted' as const };
  const dashboard = views.dashboard(currentRequest);
  const detail = views.detail(currentRequest);
  assert.match(dashboard, /href="https:\/\/wa\.me\/573205550123\?text=/);
  assert.match(detail, /href="tel:\+573205550123"/);
  assert.doesNotMatch(dashboard + detail, /573109876543|573124567890|312 456 7890/);
});

test('CV-06: accepting a request does not authorize an unlinked guardian phone', () => {
  const currentRequest = { ...request, status: 'accepted' as const, guardianLinked: false };
  assert.doesNotMatch(views.dashboard(currentRequest), contactLink);
  assert.doesNotMatch(views.detail(currentRequest), contactLink);
});

test('CV-06: missing or invalid phones never create contact links or demo fallbacks', () => {
  for (const guardianPhone of [undefined, '', '123', '+00 320 555 0123', 'javascript:alert(1)', '+57 phone']) {
    const currentRequest = { ...request, status: 'accepted' as const, guardianPhone };
    const html = views.dashboard(currentRequest) + views.detail(currentRequest);
    assert.doesNotMatch(html, contactLink, `Phone: ${guardianPhone ?? 'absent'}`);
    assert.doesNotMatch(html, /573109876543|573124567890|312 456 7890/);
  }
});

test('CV-10: empty maps remain city views without invented people, routes or travel times', () => {
  for (const mode of ['results', 'profile-route', 'teacher-request'] as const) {
    const html = views.map({ mode, studentName: 'Estudiante sin coordenadas', studentSector: 'Sector declarado' });
    assert.match(html, /Vista de Cúcuta · Sin ubicaciones registradas/);
    assert.match(html, /title="Acercar mapa"/);
    assert.match(html, /title="Alejar mapa"/);
    assert.doesNotMatch(html, /aria-label="Ver tutor|Estudiante sin coordenadas|Tu ubicación|Tú estás aquí|\bminutos\b|\bruta\b|en rango/i);
  }
});

test('CV-10: legacy display offsets do not qualify a tutor as geographically located', () => {
  const html = views.map({ tutors: [{ ...tutor, coordinates: { x: 490, y: 395 } }] });
  assert.match(html, /Sin ubicaciones registradas/);
  assert.doesNotMatch(html, /aria-label="Ver tutor|Docente registrado/);
});

test('CV-10: server rendering identifies supplied published coordinates without inventing a route', () => {
  const html = views.map({
    mode: 'profile-route',
    selectedTutorId: tutor.id,
    tutors: [{ ...tutor, location: { longitude: -72.5078, latitude: 7.8891 } }],
  });
  assert.match(html, /1 docente con ubicación publicada/);
  assert.match(html, /Ubicación publicada del docente/);
  // Google creates named marker DOM after hydration; adapter/browser tests cover
  // that interaction. Server rendering still validates the no-fiction contract.
  assert.doesNotMatch(html, /Tu ubicación|\bminutos\b|\bruta\b|en rango/i);
});

test('CV-10: invalid geographic positions do not produce personal markers', () => {
  for (const location of [
    { longitude: 190, latitude: 7.8891 },
    { longitude: -72.5078, latitude: 90 },
    { longitude: Number.NaN, latitude: 7.8891 },
  ]) {
    const html = views.map({ tutors: [{ ...tutor, location }] });
    assert.match(html, /Sin ubicaciones registradas/);
    assert.doesNotMatch(html, /aria-label="Ver tutor|Docente registrado/);
  }
});
