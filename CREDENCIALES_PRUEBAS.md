# Credenciales de Acceso para Pruebas — TutorCúcuta

Este documento contiene los usuarios y contraseñas registrados en la base de datos de **Supabase** para realizar pruebas directamente en la plataforma web.

---

## 1. Cuentas de Docentes / Tutores

Para ingresar como docente, selecciona el rol **"Docente"** en la pantalla de inicio y utiliza cualquiera de las siguientes credenciales:

| Docente | Correo electrónico | Contraseña | Materia(s) | Modalidad | Tarifa/h | Zona | Teléfono |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| **Sebastián Mendoza** | `sebastian-mendoza@demo.tutorcucuta.example` | `OM9UiWgkC2fHH86r2_sVjO_IT2jZhPQb` | Matemáticas | Presencial | $30.000 | Centro | `+57 300 481 9273` |
| **Valentina Duarte** | `valentina-duarte@demo.tutorcucuta.example` | `rWjO2f0fcXpM3bwrTrkWxbi4bQreqPlW` | Matemáticas, Física | Presencial y Virtual | $45.000 | Guaimaral | `+57 312 849 1056` |
| **Camilo Becerra** | `camilo-becerra@demo.tutorcucuta.example` | `VIrQAwFeTmuuQ8xKnIwmo2ybqZShxoxV` | Matemáticas | Virtual | $25.000 | Cúcuta | `+57 320 634 5182` |
| **Laura Quintero** | `laura-quintero@demo.tutorcucuta.example` | `9r0O-PvsuZ1RP1eByNOOi2JY3MUbL_Z7` | Inglés | Presencial y Virtual | $35.000 | Los Patios | `+57 315 902 4731` |
| **Docente Adicional** | `balckyfureu@gmail.com` | `12345uwu` | Varias | Ambas | Personalizada | Cúcuta | - |

---

## 2. Cuentas de Estudiantes (Para Búsqueda y Solicitudes)

Para ingresar como estudiante, selecciona el rol **"Estudiante"** en la pantalla de inicio y utiliza cualquiera de las siguientes credenciales:

| Estudiante | Correo electrónico | Contraseña | Nivel Educativo | Objetivo de Aprendizaje |
| :--- | :--- | :--- | :--- | :--- |
| **Santiago Suárez** | `santiago-suarez@demo.tutorcucuta.example` | `B3xf-wK8N5D_ZidLR_pJIOlv7Swy7QDi` | Universidad | Cálculo y funciones |
| **Mariana Castro** | `mariana-castro@demo.tutorcucuta.example` | `LeMMcjyMt05rYpKv8P0S762XMVGj3YWz` | Universidad | Inglés y conversación |
| **Mateo Rojas** | `mateo-rojas@demo.tutorcucuta.example` | `5X5I_cUEYvGIlO787lpAyndE5xnvyVVz` | Grado 11 - Media | Matemáticas Saber 11 |
| **Salomé Torres** | `salome-torres@demo.tutorcucuta.example` | `HdoTLZ8sZJwZn5ZQ2tKAfnDnpOy6YjT6` | Grado 11 - Media | Física y cinemática |

---

## 3. Pasos para Probar la Plataforma

1. **Abrir la aplicación web** en el navegador (`http://localhost:3000` o en el enlace desplegado).
2. **Iniciar sesión como Estudiante** (ej. `santiago-suarez@demo.tutorcucuta.example`).
3. **Buscar tutores:**
   - **Prueba 1 (Filtro por Materia y Presupuesto):** Seleccionar *Matemáticas*, *Presencial*, presupuesto máximo *$40.000 COP*. El sistema mostrará a **Sebastián Mendoza** ($30.000) y excluirá a **Valentina Duarte** ($45.000).
   - **Prueba 2 (Explicación de compatibilidad):** Hacer clic en *"¿Por qué te recomendamos este tutor?"* para ver el desglose transparente de porcentaje y motivos.
   - **Prueba 3 (Filtro de Idiomas):** Seleccionar materia *Inglés* y aparecerá **Laura Quintero**.
   - **Prueba 4 (Filtro Virtual):** Seleccionar modalidad *Virtual* y aparecerá **Camilo Becerra** ($25.000).
4. **Cerrar sesión** e ingresar como **Docente** (ej. `sebastian-mendoza@demo.tutorcucuta.example`) para revisar el panel de control del docente, la oferta publicada y solicitudes recibidas.
