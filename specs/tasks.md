# Plan de Tareas de Implementación y Evolución: TutorCúcuta
**Metodología:** Spec-Driven Development (SDD) / Kiro Specification Standard  
**Documento:** `specs/tasks.md`  
**Versión:** 1.0.0  
**Fecha:** 2026-09-08  
**Estado:** Activo / Tareas Ejecutables  

---

## 1. Estructura de Desglose del Trabajo (WBS)

El proyecto se estructura en 6 fases de implementación y validación, más 1 fase de evolución técnica:

```
TutorCúcuta (SDD WBS)
├── Fase 1: Fundaciones, Tipado y Modelado de Dominio [COMPLETADA]
├── Fase 2: Persistencia Segura y Motor de Scoring [COMPLETADA]
├── Fase 3: Cartografía Vectorial PostGIS y Componentes Comunes [COMPLETADA]
├── Fase 4: Flujo Integral de Experiencia Estudiante [COMPLETADA]
├── Fase 5: Flujo Integral de Experiencia Docente [COMPLETADA]
├── Fase 6: Auditoría de Calidad, Compilación y Verificación [COMPLETADA]
└── Fase 7: Roadmap Evolutivo (Backend PostGIS Real + DB) [PLANIFICADA]
```

---

## 2. Matriz de Tareas Detalladas

### Fase 1: Fundaciones, Tipado y Modelado de Dominio

- [x] **TASK-01: Configuración de Entorno y Compilador TypeScript**
  - **Archivos:** `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
  - **Descripción:** Configurar Vite 6 con React 19, plugin de Tailwind CSS v4, y TypeScript 5.8 estricto (`noEmit: true`, `moduleResolution: "bundler"`).
  - **Criterio de Aceptación:** `npm run build` y `npm run lint` compilan con 0 errores.
  - **Estado:** ✅ Completado.

- [x] **TASK-02: Definición de Interfaces y Enumeraciones del Dominio**
  - **Archivos:** `src/types.ts`
  - **Descripción:** Crear modelos de tipos para `Role`, `ScreenId` (9 vistas), `StudentProfile`, `Tutor`, `StudentRequest`, `GeoPoint` y `SearchFilters`.
  - **Criterio de Aceptación:** Cobertura de tipado estricto sin tipos `any` implícitos.
  - **Estado:** ✅ Completado.

---

### Fase 2: Persistencia Segura y Motor de Scoring

- [x] **TASK-03: Semillero de Datos Maestros del AMC**
  - **Archivos:** `src/data/mockData.ts`
  - **Descripción:** Definir catálogo de tutores representativos (Carlos Ramírez, Diana Peñaranda, Andrés Villamizar), solicitudes iniciales y sectores del AMC.
  - **Criterio de Aceptación:** Coordenadas e identificadores geográficos coherentes con San José de Cúcuta, Los Patios y Villa del Rosario.
  - **Estado:** ✅ Completado.

- [x] **TASK-04: Capa de Almacenamiento Local Tolerante a Fallos (`storage.ts`)**
  - **Archivos:** `src/utils/storage.ts`
  - **Descripción:** Implementar métodos seguros para guardar y leer tutores, solicitudes, filtros y perfil de estudiante con bloques `try/catch` y fallback inmutable.
  - **Criterio de Aceptación:** La app continúa funcionando si el navegador bloquea `localStorage` (modo incógnito estricto).
  - **Estado:** ✅ Completado.

- [x] **TASK-05: Algoritmo de Emparejamiento Multicriterio (`computeTutorMatch`)**
  - **Archivos:** `src/utils/storage.ts`
  - **Descripción:** Desarrollar función ponderada que sume o reste puntaje según materia (+25%), tema (+20%), presupuesto (+15%/-10%), radio (+10%/-10%), modalidad (+5%) y experiencia (+5%), acotando el puntaje entre 65% y 99%.
  - **Criterio de Aceptación:** Retorna hasta 4 razones explicativas que justifican la afinidad pedagógica.
  - **Estado:** ✅ Completado.

---

### Fase 3: Cartografía Vectorial PostGIS y Componentes Comunes

- [x] **TASK-06: Motor Cartográfico Vectorial (`UnifiedCucutaMap.tsx`)**
  - **Archivos:** `src/components/common/UnifiedCucutaMap.tsx`
  - **Descripción:** Crear componente cartográfico con teselas urbanas/satélite, buffer radial `ST_DWithin` dinámico, trazado de rutas `ST_Distance` y soporte táctil para arrastre y zoom.
  - **Criterio de Aceptación:** Responsive en pantallas desde 320px hasta 4K, con controles de capas y recentrado.
  - **Estado:** ✅ Completado.

- [x] **TASK-07: Cabecera Adaptativa y Conmutador de Roles (`Header.tsx`)**
  - **Archivos:** `src/components/common/Header.tsx`
  - **Descripción:** Construir barra fija con efecto `backdrop-blur`, acceso directo a editar perfil, conmutador de rol instantáneo y menú lateral para móviles.
  - **Criterio de Aceptación:** Refleja en tiempo real el avatar activo del estudiante o docente.
  - **Estado:** ✅ Completado.

- [x] **TASK-08: Navegación Ergonómica Móvil (`MobileBottomNav.tsx`)**
  - **Archivos:** `src/components/common/MobileBottomNav.tsx`
  - **Descripción:** Barra inferior fija para dispositivos móviles (≤ 1024px) con accesos directos operables con un solo pulgar y contadores de solicitudes pendientes.
  - **Criterio de Aceptación:** Ocultamiento automático en vistas con barras de acción fija dedicadas.
  - **Estado:** ✅ Completado.

- [x] **TASK-09: Conmutador Rápido de Prototipo (`ScreenSwitcherBar.tsx`)**
  - **Archivos:** `src/components/common/ScreenSwitcherBar.tsx`
  - **Descripción:** Píldora colapsable en escritorio (esquina inferior derecha) y panel deslizante en móvil con acceso directo a las 9 pantallas.
  - **Criterio de Aceptación:** No obstruye los botones principales de acción ni los mapas.
  - **Estado:** ✅ Completado.

---

### Fase 4: Flujo Integral de Experiencia Estudiante

- [x] **TASK-10: Vista 0 - Portal de Acceso y Radar (`LandingLoginView.tsx`)**
  - **Archivos:** `src/components/views/LandingLoginView.tsx`
  - **Descripción:** Selector de rol previo al ingreso, radar gráfico metropolitano y botón seguro de Google Sign-In.
  - **Criterio de Aceptación:** Transiciona a `student-search` o `teacher-dashboard` según el rol seleccionado.
  - **Estado:** ✅ Completado.

- [x] **TASK-11: Vista 1 - Búsqueda Multicriterio (`StudentSearchView.tsx`)**
  - **Archivos:** `src/components/views/StudentSearchView.tsx`
  - **Descripción:** Formulario con selección de materias, DBA, estilos de aprendizaje, franja horaria, presupuesto y radio sincronizado con el mapa.
  - **Criterio de Aceptación:** Pestañas móviles Formulario vs Mapa para pantallas estrechas.
  - **Estado:** ✅ Completado.

- [x] **TASK-12: Vista 2 - Resultados de Tutores (`StudentResultsView.tsx`)**
  - **Archivos:** `src/components/views/StudentResultsView.tsx`
  - **Descripción:** Tarjetas ordenadas por `matchScore`, selector de ordenamiento, pestaña de favoritos, desglose desplegable de afinidad y mapa lateral interactivo.
  - **Criterio de Aceptación:** Al pulsar un pin en el mapa se selecciona y resalta la tarjeta del tutor.
  - **Estado:** ✅ Completado.

- [x] **TASK-13: Vista 3 - Hoja Pedagógica del Tutor (`TutorProfileView.tsx`)**
  - **Archivos:** `src/components/views/TutorProfileView.tsx`
  - **Descripción:** Metodología en 6 pasos, títulos certificados con insignia de verificación, ruta vial con estimación de tiempo (~8 min) y tarjeta de contratación.
  - **Criterio de Aceptación:** Barra de contratación fija inferior en dispositivos móviles.
  - **Estado:** ✅ Completado.

- [x] **TASK-14: Modal de Formalización de Solicitud (`RequestTutorModal.tsx`)**
  - **Archivos:** `src/components/modals/RequestTutorModal.tsx`
  - **Descripción:** Selector de día, hora, duración, cálculo automático de valor total en COP, verificación de acudiente y generación de `StudentRequest`.
  - **Criterio de Aceptación:** Persiste la nueva solicitud en `storage` y redirige a la vista 4.
  - **Estado:** ✅ Completado.

- [x] **TASK-15: Vista 4 - Bandeja de Solicitudes del Alumno (`StudentRequestsView.tsx`)**
  - **Archivos:** `src/components/views/StudentRequestsView.tsx`
  - **Descripción:** Trazabilidad de solicitudes (`pending`, `accepted`, `rejected`). Desbloqueo de botones directos a WhatsApp y llamada telefónica al ser aceptada.
  - **Criterio de Aceptación:** Enlace a WhatsApp con mensaje contextualizado prellenado.
  - **Estado:** ✅ Completado.

- [x] **TASK-16: Vista 5 - Edición de Perfil de Estudiante y Acudiente (`StudentProfileEditView.tsx`)**
  - **Archivos:** `src/components/views/StudentProfileEditView.tsx`
  - **Descripción:** Carga de foto de perfil (archivos o presets), vinculación legal del acudiente (Habeas Data), metas académicas Saber 11 y vista previa pública en vivo.
  - **Criterio de Aceptación:** Sincronización automática de fotos con las solicitudes existentes en el panel docente.
  - **Estado:** ✅ Completado.

---

### Fase 5: Flujo Integral de Experiencia Docente

- [x] **TASK-17: Vista 6 - Panel de Control Docente (`TeacherDashboardView.tsx`)**
  - **Archivos:** `src/components/views/TeacherDashboardView.tsx`
  - **Descripción:** Métricas de solicitudes, lista de estudiantes solicitantes, botones rápidos de Aceptar/Rechazar, slider de radio en km y mapa PostGIS interactivo.
  - **Criterio de Aceptación:** Notificación inmediata al aceptar una solicitud y desbloqueo del botón de contacto.
  - **Estado:** ✅ Completado.

- [x] **TASK-18: Vista 7 - Inspección a Fondo de Solicitud (`TeacherRequestDetailView.tsx`)**
  - **Archivos:** `src/components/views/TeacherRequestDetailView.tsx`
  - **Descripción:** Análisis de dificultades del estudiante, verificación de criterios de compatibilidad, ruta vial de acceso y liquidación económica de la sesión.
  - **Criterio de Aceptación:** Decisiones atómicas de Aceptar o Rechazar con actualización en el estado central.
  - **Estado:** ✅ Completado.

- [x] **TASK-19: Vista 8 - Configuración del Perfil Docente (`TeacherProfileEditView.tsx`)**
  - **Archivos:** `src/components/views/TeacherProfileEditView.tsx`
  - **Descripción:** Edición de foto profesional, credenciales UFPS, tarifa horaria ($ COP), catálogo de materias atendidas y radio de cobertura presencial.
  - **Criterio de Aceptación:** Guardado reactivo que actualiza la oferta en el catálogo de tutores.
  - **Estado:** ✅ Completado.

---

### Fase 6: Auditoría de Calidad, Compilación y Verificación

- [x] **TASK-20: Verificación de Tipos y Compilación Limpia**
  - **Comando:** `npm run lint && npm run build`
  - **Criterio de Aceptación:** 0 errores de TypeScript, empaquetado exitoso en `dist/` en < 3 segundos.
  - **Estado:** ✅ Completado (build generado en 2.17s).

- [x] **TASK-21: Auditoría de Accesibilidad y Responsive Design**
  - **Comandos:** Validación de contrastes y targets táctiles (≥ 44px).
  - **Criterio de Aceptación:** Comportamiento fluido en viewport móvil (360x640) y escritorio (1920x1080).
  - **Estado:** ✅ Completado.

---

### Fase 7: Roadmap Evolutivo (Backend PostGIS Real + Base de Datos)

- [x] **TASK-22: Esquema Supabase PostgreSQL + PostGIS y Cliente Frontend**
  - **Archivos:** `supabase/migrations/20260908000000_init_tutorcucuta_postgis.sql`, `supabase/seed.sql`, `src/utils/supabase.ts`, `src/vite-env.d.ts`
  - **Descripción:** Implementar migración SQL con extensiones `postgis`, tablas (`profiles`, `students`, `tutors`, `student_requests`, `sectors`, `saved_tutors`), funciones espaciales RPC (`search_tutors_nearby`, `calculate_route_commute`) y políticas RLS para Habeas Data. Cliente frontend con fallback a `storage.ts`.
  - **Criterio de Aceptación:** `npm run lint && npm run build` pasan limpiamente con 0 errores.
  - **Estado:** ✅ Completado.

- [ ] **TASK-23 (Evolutivo): Autenticación OAuth2 Real con Google / Supabase**
  - **Descripción:** Implementar intercambio de tokens JWT y roles RLS (Row Level Security) en base de datos para restringir la consulta del teléfono del acudiente únicamente al docente autorizado.
  - **Prioridad:** Alta.

- [ ] **TASK-24 (Evolutivo): Almacenamiento de Diplomas en Object Storage**
  - **Descripción:** Subida de diplomas universitarios a buckets cifrados (AWS S3 o Supabase Storage) con revisión administrativa previa a la insignia de verificación.
  - **Prioridad:** Media.

