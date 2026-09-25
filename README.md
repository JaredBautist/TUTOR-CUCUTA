# 🎓 TutorCúcuta — Plataforma de Tutorías Georreferenciadas

<div align="center">

![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black&style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white&style=for-the-badge)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white&style=for-the-badge)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css&logoColor=white&style=for-the-badge)
![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?logo=supabase&logoColor=white&style=for-the-badge)
![MapLibre](https://img.shields.io/badge/MapLibre-GL%20JS-blue?logo=maplibre&logoColor=white&style=for-the-badge)
![Tests](https://img.shields.io/badge/Tests-85%20Passing-success?style=for-the-badge)

**Conectando estudiantes y tutores particulares en Cúcuta y su Área Metropolitana mediante geolocalización, filtrado multicriterio y recomendación algorítmica explicable.** 🚀

[🚀 Demostración](#-guía-rápida-de-instalación) • [✨ Características](#-características-principales) • [🛠️ Tecnologías](#-stack-tecnológico) • [📱 Modo Móvil](#-diseño-mobile-first-y-cards) • [👥 Cuentas de demostración](#-cuentas-de-demostración)

</div>

---

## 📖 ¿Qué es TutorCúcuta?

**TutorCúcuta** es una plataforma web integral diseñada para resolver la dificultad de encontrar apoyo escolar y universitario de calidad en el Área Metropolitana de Cúcuta (Cúcuta, Los Patios, Villa del Rosario, El Zulia y alrededores).

A diferencia de directorios tradicionales, TutorCúcuta incorpora un **motor de compatibilidad determinístico** y un **mapa interactivo con actualización de zonas aproximadas publicadas**, permitiendo a estudiantes y acudientes comparar docentes según cercanía geográfica, materias específicas, disponibilidad horaria semanal y presupuesto en pesos colombianos ($ COP). La aplicación no realiza seguimiento GPS continuo ni publica domicilios exactos.

---

## ✨ Características Principales

### 🔍 1. Búsqueda y Filtrado Multicriterio
* **Materias y Áreas:** Matemáticas, Álgebra, Cálculo, Física, Química, Razonamiento Cuantitativo, Saber 11, Inglés, etc.
* **Nivel Educativo:** Básica primaria, básica secundaria, grado 11 - media, universidad y educación de adultos.
* **Modalidad:** Presencial (en domicilio/punto convenido) y/o Virtual.
* **Presupuesto Ajustable:** Filtro por tarifa máxima por hora académica ($20.000 a $60.000 COP).
* **Disponibilidad Horaria:** Selección de días (L–D) y franjas (Mañana, Tarde, Noche).

### 🗺️ 2. Geolocalización y Mapas Interactivos
* **Cartografía Abierta:** Integración con **MapLibre GL JS** y **OpenFreeMap** sin cobros de API externa ni dependencias privativas.
* **Radio Geográfico:** Visualización dinámica de círculos de cobertura (1 a 15 km) centrados en la ubicación del estudiante o en barrios de Cúcuta (Caobos, Guaimaral, La Riviera, Centro, UFPS, etc.).
* **Privacidad Protegida:** Posicionamiento por zonas de atención aproximadas para proteger la privacidad del docente.

### 🧠 3. Motor de Recomendación Explicable
* **Porcentaje de Coincidencia (%):** Cálculo transparente de afinidad basado en coincidencia de materia, nivel, presupuesto, cruce de disponibilidad y proximidad.
* **Explicabilidad Clara:** Acordeón interactivo *"¿Por qué te recomendamos este tutor?"* que detalla punto por punto las razones de compatibilidad algorítmica sin opacidad.

### 👥 4. Dos Portales en un Mismo Lugar
* **Portal Estudiante:** Búsqueda avanzada, mapa interactivo, lista de favoritos persistente, visualización de perfiles completos y envío de solicitudes con validación de acudiente para menores.
* **Portal Docente:** Panel de solicitudes recibidas (Aceptar / Rechazar), edición de perfil pedagógico en 5 pasos, fijación de tarifas por hora, disponibilidad semanal y carga de soportes académicos (PDF/imágenes).

### 🔐 5. Acceso y persistencia
* **Autenticación:** Registro e inicio de sesión mediante Google o correo y contraseña con Supabase Auth.
* **Datos persistentes:** Perfiles, ofertas, horarios, favoritos, documentos y solicitudes permanecen asociados a la cuenta.
* **Seguridad:** Las políticas RLS separan la información privada del catálogo publicado y los contactos se revelan únicamente cuando corresponde al flujo de una solicitud aceptada.

---

## 📱 Diseño Mobile-First y Cards

La plataforma cuenta con una arquitectura optimizada para dispositivos móviles (smartphones de 360px a 420px):

* 🎴 **Tarjetas Autocontenidas (Cards):** Visualización modular de cada tutor con avatar, badges de datos declarados, grilla de 3 métricas clave (Tarifa, Sector, Disponibilidad) y botones apilables para el pulgar.
* ☀️ **100% Modo Claro (Light Theme):** Interfaz limpia con alto contraste visual (reglas WCAG 2.2 y directrices de UI/UX Pro Max).
* 👆 **Áreas Táctiles Accesibles:** Botones de acción y controles interactivos con tamaño mínimo de 44×44 px (`touch-target-size`).
* 🧭 **Navegación Inferior (Mobile Bottom Nav):** Barra fija de acceso rápido (`Buscar`, `Tutores`, `Solicitudes`, `Perfil`) con respeto estricto de zonas seguras (`safe-area-inset-bottom`).

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Frontend** | [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/) |
| **Estilos** | [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) (iconos vectoriales SVG) |
| **Mapas & Geo** | [MapLibre GL JS](https://maplibre.org/), [OpenFreeMap](https://openfreemap.org/) |
| **Backend & Auth** | [Supabase](https://supabase.com/), PostgreSQL 15, PostGIS, Row Level Security (RLS) |
| **Almacenamiento** | Supabase Storage (Bucket privado con URLs firmadas para soportes académicos) |
| **Testing** | Node.js Test Runner, pruebas de integración E2E con Chromium |

---

## 🚀 Guía Rápida de Instalación

### Prerrequisitos
* **Node.js**: v20 o superior (recomendado v22)
* **npm**: v10 o superior

### 1. Clonar el repositorio
```bash
git clone https://github.com/JaredBautist/TUTOR-CUCUTA.git
cd tutorcúcuta
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto tomando como base `.env.example`:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-publica
```

### 4. Iniciar el servidor de desarrollo
```bash
npm run dev
```
Abre en tu navegador: [http://127.0.0.1:3000](http://127.0.0.1:3000)

---

## 🧪 Pruebas y Validación de Calidad

El proyecto cuenta con una sólida suite de pruebas automatizadas que validan reglas de negocio, cálculo geográfico, recomendaciones y seguridad RLS:

```bash
# Ejecutar todas las pruebas unitarias y de integración (85 tests)
npm test

# Validar tipado y linter sin errores
npm run lint

# Generar compilación optimizada para producción
npm run build

# Previsualizar el bundle de producción
npm run preview
```

La configuración alojada de Supabase tiene activados Google y correo, las migraciones
del MVP y las políticas RLS. La entrega fue verificada con cuatro cuentas docentes,
cuatro estudiantiles, cuatro ofertas publicadas y seis escenarios de recomendación
multicriterio. Las credenciales vigentes permanecen fuera del repositorio.

---

## 👥 Cuentas de demostración

La entrega incluye cuatro perfiles docentes y cuatro estudiantiles alojados en
Supabase. Sus credenciales no se publican en el repositorio. El operador autorizado
las encuentra únicamente en el archivo local privado documentado en
[`docs/delivery-accounts.md`](docs/delivery-accounts.md).

---

## 📂 Estructura del Proyecto

```text
tutorcúcuta/
├── src/
│   ├── components/
│   │   ├── common/         # Header, navegación móvil y mapa unificado MapLibre
│   │   ├── marketplace/    # Paneles de ofertas y documentos de soporte
│   │   ├── modals/         # Modal de solicitud y reserva de tutorías
│   │   └── views/          # Vistas principales (Búsqueda, Resultados, Perfil, etc.)
│   ├── features/
│   │   ├── accounts/       # Autenticación, perfiles y sesiones
│   │   ├── favorites/      # Gestión de tutores guardados en Supabase
│   │   ├── maps/           # Lógica geoespacial, cálculo de distancias y radio
│   │   ├── marketplace/    # Repositorio de ofertas y solicitudes
│   │   └── recommender/    # Algoritmo determinístico de compatibilidad
│   ├── App.tsx             # Enrutador principal y control de sesión
│   └── main.tsx            # Punto de entrada de la aplicación
├── docs/                   # Documentación técnica, contratos y decisiones
├── scripts/                # Verificación del entorno alojado y datos de entrega
├── tests/                  # Pruebas automatizadas de regresión y comportamiento
└── package.json            # Dependencias y scripts de ejecución
```

---

## 📄 Licencia

Este proyecto fue desarrollado con fines académicos para la asignatura de **Tecnologías Emergentes** (Ingeniería de Software - FESC Cúcuta, 2026). Todos los derechos reservados.
