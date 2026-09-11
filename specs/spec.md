# Especificaciones de Requerimientos del Sistema: TutorCúcuta
**Metodología:** Spec-Driven Development (SDD) / Kiro Specification Standard  
**Documento:** `specs/spec.md`  
**Versión:** 1.0.0  
**Fecha:** 2026-09-08  
**Estado:** Aprobado / Ejecutable  

---

## 1. Visión General del Producto

### 1.1 Declaración del Problema
En el Área Metropolitana de Cúcuta (AMC) —que comprende San José de Cúcuta, Los Patios y Villa del Rosario— las familias y estudiantes enfrentan barreras críticas para encontrar docentes particulares cualificados:
1. **Falta de verificación docente:** Incertidumbre sobre la idoneidad académica y antecedentes de los tutores.
2. **Fricción logística y geográfica:** Desplazamientos excesivos o inseguros por la conurbación metropolitana sin conocimiento previo de las distancias reales.
3. **Incompatibilidad pedagógica y presupuestaria:** Dificultad para alinear el estilo de aprendizaje del estudiante (ej. refuerzo Saber 11, metodología paso a paso) con la especialidad y tarifa horaria del docente.
4. **Desprotección de menores:** Ausencia de supervisión de acudientes legales en plataformas digitales tradicionales.

### 1.2 Declaración de la Solución
**TutorCúcuta** es un ecosistema web reactivo de doble rol (**Estudiante** y **Docente**) diseñado específicamente para el AMC. Implementa un motor cartográfico vectorial PostGIS (`ST_DWithin`, `ST_Distance`), emparejamiento multicriterio ponderado (`computeTutorMatch`), supervisión estricta de acudientes para menores y una máquina de estados de solicitudes con divulgación progresiva de datos de contacto.

---

## 2. Personas y Actores del Sistema

| Actor | Perfil Arquetípico | Metas Principales | Restricciones / Frustraciones |
| :--- | :--- | :--- | :--- |
| **Estudiante** | Laura Sofía Martínez (17 años, Grado 11, Col. Sagrado Corazón de Jesús, Barrio La Riviera) | Nivelar razonamiento cuantitativo y cálculo para el examen Saber 11 con metodología paciente y ejercicios guiados. | Menor de edad; requiere autorización y supervisión de su acudiente. Presupuesto límite de $35.000 COP/h. |
| **Acudiente Legal** | Martha Morales de Martínez (Madre) | Garantizar la seguridad física y académica de su hija, validar credenciales docentes y recibir reportes directos por WhatsApp. | Exige cumplimiento de Habeas Data y trazabilidad de contactos. |
| **Docente / Tutor** | Lic. Carlos Ramírez (Lic. en Matemáticas UFPS, 6 años de experiencia, Barrio Los Caobos) | Ofrecer horas de clase en franjas disponibles (miércoles tardes) dentro de su radio de cobertura (≤ 5 km) a $30.000 COP/h. | Optimizar tiempos de desplazamiento urbano en Cúcuta y evitar cancelaciones imprevistas. |

---

## 3. Requerimientos Funcionales (RF)

### Módulo A: Portal de Acceso y Selección de Rol (Vista 0)
- **RF-01 (Selección Declarativa de Rol):** El sistema debe permitir alternar entre el rol `student` y `tutor` antes de ingresar.
- **RF-02 (Autenticación Segura):** Integración con Google Sign-In simulado y consentimiento expreso de la política de tratamiento de datos personales (Ley 1581 de 2012).
- **RF-03 (Visualizador Radar Metropolitano):** Exhibición interactiva de la red de nodos conectando los principales sectores del AMC (La Riviera, Los Caobos, UFPS, Guaimaral, Los Patios).

### Módulo B: Búsqueda Multicriterio y Filtros Pedagógicos (Vista 1)
- **RF-04 (Filtros Académicos):** Selección de materia (píldoras rápidas o texto libre), tema específico DBA, y estilos de aprendizaje preferidos (paso a paso, ejercicios prácticos, esquemas visuales).
- **RF-05 (Filtros Logísticos y Presupuestarios):** Nivel escolar, modalidad (`presencial`, `virtual`, `any`), días disponibles, selector de rango presupuestario ($20.000 a $60.000 COP/h) y radio en kilómetros (1.0 a 15.0 km).
- **RF-06 (Sincronización Cartográfica en Búsqueda):** El mapa interactivo debe reflejar en tiempo real el círculo de cobertura según el radio en km seleccionado desde el punto base del estudiante (La Riviera).

### Módulo C: Resultados, Afinidad y Mapa de Calor (Vista 2)
- **RF-07 (Cálculo Dinámico de Afinidad - MatchScore):** Cada docente debe evaluarse frente a los filtros activos calculando un porcentaje normalizado (65% - 99%) y detallando hasta 4 razones pedagógicas explicativas.
- **RF-08 (Ordenamiento y Filtrado Rápido):** Ordenamiento por afinidad, tarifa horaria, proximidad y experiencia. Filtrado rápido por pestañas (Todos, Favoritos, Dentro de radio).
- **RF-09 (Marcadores Georreferenciados):** Proyección interactiva de tutores en el mapa PostGIS; al hacer clic en un pin, se destaca la tarjeta del tutor correspondiente.
- **RF-10 (Marcado de Favoritos):** Posibilidad de guardar y desmarcar tutores en lista de seguimiento persistida localmente.

### Módulo D: Hoja de Vida Pedagógica del Tutor (Vista 3)
- **RF-11 (Perfil Detallado):** Exhibición de foto profesional, títulos universitarios verificados, institución de egreso, experiencia y biografía formativa.
- **RF-12 (Metodología en 6 Pasos):** Desglose estructurado del proceso docente (Diagnóstico, Conceptualización, Práctica guiada, Simulacro Saber 11, Retroalimentación y Síntesis).
- **RF-13 (Cálculo de Ruta y Desplazamiento):** Proyección visual de la ruta vial entre el barrio del alumno y el tutor con estimación de tiempo de viaje (~8 min por Av. Gran Colombia / Libertadores).

### Módulo E: Gestión de Solicitudes del Estudiante (Vista 4 y Modal)
- **RF-14 (Modal de Radicación de Tutoría):** Formulario emergente para seleccionar día, hora, duración (1h, 1.5h, 2h), modalidad y verificación automática de acudiente vinculado, liquidando el total en COP.
- **RF-15 (Bandeja de Seguimiento en Tiempo Real):** Listado de solicitudes emitidas categorizadas por estado (`pending`, `accepted`, `rejected`).
- **RF-16 (Desbloqueo Seguro de Canales de Contacto):** Si el docente aprueba la solicitud (`accepted`), se habilitan los enlaces directos a WhatsApp y llamada telefónica con mensaje prellenado.

### Módulo F: Edición de Perfil de Estudiante y Acudiente (Vista 5)
- **RF-17 (Gestión de Fotografía):** Selector interactivo con carga de archivos locales (< 5MB), galería de presets y URLs remotas con vista previa instantánea.
- **RF-18 (Vinculación Obligatoria de Acudiente):** Formulario de datos del tutor legal (nombre, teléfono, parentesco) y autorización explícita para menores de 18 años.
- **RF-19 (Diagnóstico Académico y Metas):** Edición de metas formativas, dificultades particulares y estilos pedagógicos.
- **RF-20 (Sincronización Bidireccional de Perfil):** Al actualizar el nombre o foto del estudiante, se sincronizan de inmediato las solicitudes activas en las vistas del docente.

### Módulo G: Panel de Control Docente y Gestión de Solicitudes (Vista 6 y 7)
- **RF-21 (Bandeja de Entrada Docente):** Visualización de solicitudes con métricas (pendientes, aceptadas, ingresos estimados), foto del estudiante, grado, materia y match.
- **RF-22 (Acciones Atómicas Aceptar / Rechazar):** Aprobación o rechazo con actualización de estado en `storage` y retroalimentación visual inmediata.
- **RF-23 (Inspección Diagnóstica Profunda):** Vista detallada de la solicitud con desglose de dificultades del alumno, criterios de compatibilidad y liquidación económica.
- **RF-24 (Ajuste Dinámico de Radio Docente):** Slider para modificar en caliente el radio de servicio presencial (km) desde Los Caobos, proyectado sobre el mapa.

### Módulo H: Configuración del Perfil Profesional Docente (Vista 8)
- **RF-25 (Gestión de Credenciales):** Edición de fotografía profesional, título universitario, institución de egreso, años de experiencia, tarifa horaria y catálogo de materias y especialidades.

---

## 4. Requerimientos No Funcionales (RNF)

- **RNF-01 (Rendimiento):** Tiempo de carga inicial (FCP) < 1.5 segundos; respuesta de filtrado en cliente < 50 ms. Tasa de cuadros estable a 60 FPS en transiciones y mapa SVG.
- **RNF-02 (Arquitectura Tecnológica):** Construido sobre React 19, TypeScript 5.8 estricto (`noEmit: true`), Vite 6 y Tailwind CSS v4.
- **RNF-03 (Persistencia y Tolerancia a Fallos):** Capa de almacenamiento seguro `storage.ts` sobre `localStorage` con fallback a datos semilla inmutables ante excepciones de cuota o parseo JSON.
- **RNF-04 (Diseño Adaptativo y Touch):** Soporte ergonómico mobile-first para smartphones (< 640px) con barra inferior `MobileBottomNav` (target mínimo touch 44x44 px) y navegación completa desktop.
- **RNF-05 (Privacidad y Habeas Data):** Cumplimiento de la Ley Estatutaria 1581 de 2012 de Colombia. Las direcciones domiciliarias exactas y teléfonos de contacto se mantienen ofuscados y solo se revelan entre las partes tras la confirmación mutua de la tutoría.
- **RNF-06 (Georreferenciación PostGIS):** Coordenadas referenciadas al sistema geodésico WGS 84 (EPSG:4326), proyectadas a un lienzo vectorial SVG de alta precisión para el AMC.
- **RNF-07 (Accesibilidad):** Cumplimiento de lineamientos WCAG 2.1 nivel AA: ratios de contraste de texto ≥ 4.5:1, etiquetas semánticas y aria labels para navegación táctil y asistida.

---

## 5. Historias de Usuario con Criterios de Aceptación (Gherkin)

### US-01: Búsqueda y Emparejamiento por Afinidad
> **Como** estudiante de grado 11 en Cúcuta,  
> **Quiero** buscar tutores de Matemáticas filtrando por mi presupuesto y barrio,  
> **Para** encontrar un profesor calificado cercano que me prepare para las pruebas Saber 11.

```gherkin
Escenario: Laura busca tutor dentro de su presupuesto y radio
  Dado que Laura tiene un presupuesto máximo de $35.000 COP/h y vive en La Riviera
  Y selecciona un radio de búsqueda de 5.0 km para "Matemáticas"
  Cuando ejecuta la búsqueda de tutores
  Entonces el sistema muestra a "Carlos Ramírez" con un MatchScore ≥ 90%
  Y destaca que su tarifa ($30.000 COP/h) ahorra $5.000 COP frente al límite
  Y el mapa proyecta el radio de cobertura y la ubicación de Los Caobos (a 2.4 km).
```

### US-02: Supervisión y Protección de Menores por el Acudiente
> **Como** acudiente de una estudiante menor de edad,  
> **Quiero** autorizar y validar cualquier solicitud de clase particular,  
> **Para** garantizar la seguridad de mi hija y mantener comunicación directa con el docente.

```gherkin
Escenario: Solicitud con verificación obligatoria de acudiente
  Dado que la estudiante tiene 17 años
  Cuando formaliza una solicitud en el modal RequestTutorModal
  Entonces el sistema exige la vinculación de Martha Morales como acudiente responsable
  Y la solicitud se genera con estado "pending" manteniendo el teléfono protegido
  Y al ser aceptada por el docente, se habilita el enlace directo de WhatsApp con el acudiente.
```

### US-03: Aceptación y Gestión Logística del Docente
> **Como** docente particular en Los Caobos,  
> **Quiero** evaluar las dificultades conceptuales y la ubicación del estudiante antes de comprometerme,  
> **Para** aceptar únicamente clases que pueda atender con excelencia y dentro de mi radio.

```gherkin
Escenario: Carlos acepta la tutoría de Laura Martínez
  Dado que Carlos recibe la solicitud "req-laura-m" en su panel docente
  Cuando inspecciona el detalle pedagógico y verifica que la distancia es 2.4 km (≤ 5.0 km)
  Y presiona el botón "Aceptar solicitud"
  Entonces el estado de la solicitud transiciona atómicamente a "accepted"
  Y el sistema desbloquea el botón de contacto con el acudiente vía WhatsApp
  Y se refleja la sesión confirmada en la bandeja del estudiante.
```

---

## 6. Casos de Borde y Manejo de Errores

1. **Sin resultados en el radio seleccionado:**
   - Si el radio es muy estrecho (ej. 1 km), el sistema notifica que no hay tutores en esa microzona y sugiere extender el radio al siguiente anillo metropolitano (3 km o 5 km).
2. **Superación del presupuesto fijado:**
   - El algoritmo no oculta al tutor si este supera el presupuesto por poco margen, sino que aplica una penalización de -10% en el `matchScore` y explica la diferencia en COP/h.
3. **Fallo o bloqueo de localStorage en el navegador:**
   - La capa `storage.ts` captura excepciones (`try/catch`) y conmuta de forma transparente al estado en memoria inicial sin interrumpir la navegación.
4. **Archivo de fotografía mayor a 5 MB:**
   - Validación previa a la lectura; emite una alerta no intrusiva solicitando una imagen comprimida o permite seleccionar uno de los avatares predefinidos.
