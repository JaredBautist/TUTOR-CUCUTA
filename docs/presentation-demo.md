# TutorCúcuta — Guion de presentación

Datos ficticios persistentes en Supabase para mostrar la aplicación funcionando.
El conjunto ampliado tiene diez ofertas docentes y diez cuentas de estudiante.
Cada docente dispone de una solicitud preparada para mostrar la aceptación.
Las solicitudes nuevas se distribuyen entre los ocho estudiantes adultos; los dos
menores conservan la protección de acudiente.
Las contraseñas están únicamente en el archivo privado local:

`~/.local/share/tutorcucuta/academic-2026-09-17/CREDENCIALES_ENTREGA.md`

No mostrar ese archivo durante la grabación o al compartir pantalla. Las cuentas
con dominio `.example` permiten acceso por contraseña; no reciben correos ni prueban
recuperación de contraseña o consentimiento de Google.

## Cuentas para presentar

| Cuenta | Rol | Uso sugerido |
| --- | --- | --- |
| Santiago Suárez | Estudiante adulto | Matemáticas, favoritos, solicitar y cancelar |
| Mariana Castro | Estudiante adulta | Inglés, solicitud aceptada y contactos |
| Mateo Rojas | Estudiante menor | Búsqueda de límites y validación de acudiente |
| Salomé Torres | Estudiante menor | Búsqueda de física y validación de acudiente |
| Sebastián Mendoza | Docente | Matemáticas presencial, $30.000/h, lunes 15–18 |
| Valentina Duarte | Docente | Matemáticas/Física, $45.000/h, lunes 14–18 |
| Camilo Becerra | Docente | Matemáticas virtual, $25.000/h, cinco franjas semanales |
| Laura Quintero | Docente | Inglés presencial/virtual, $35.000/h, martes 18–21 |

La ampliación añade estos docentes (presencial y virtual, miércoles/viernes 14–18):

| Docente | Materia | Tarifa COP/h |
| --- | --- | ---: |
| Andrés Martínez | Matemáticas | 28.000 |
| Paula Rodríguez | Física | 32.000 |
| Daniel Gómez | Programación | 38.000 |
| Natalia Vargas | Química | 30.000 |
| Julián Cárdenas | Estadística | 35.000 |
| Carolina Herrera | Inglés | 27.000 |

Estudiantes adultos añadidos: Alejandro Pérez, Valeria Moreno, Nicolás Castillo,
Isabella Ramírez, David Ortiz y Manuela Silva. Sus credenciales están en el mismo
archivo privado, actualizado para las veinte cuentas. No mostrarlo en capturas.

Horarios en Colombia. Usar dos ventanas o perfiles de navegador independientes para
mostrar estudiante y docente a la vez. No contactar los teléfonos de demostración.

Camilo atiende lunes y jueves de 18:00 a 20:00, martes de 18:00 a 21:00,
miércoles de 16:00 a 19:00 y sábado de 09:00 a 12:00. Van en hora de Colombia.
Su ficha explica cómo trabaja límites, continuidad y gráficas. Santiago busca
preparar un parcial de Cálculo I. Ambos tienen retratos ficticios.

## Recorrido sugerido

1. Entrar como Santiago; buscar Matemáticas, Universidad, Virtual, martes/noche y
   presupuesto $30.000. Camilo cumple; desplegar razones y horario completo.
2. Abrir el perfil; mostrar el PDF **Guía de práctica: límites (demostración)**.
   Es material ficticio de apoyo, no un diploma ni una acreditación.
3. Volver; comprobar que conserva la búsqueda. Abrir Favoritos, donde Camilo está
   guardado. Mostrar el cambio de fecha/duración y las horas compatibles al solicitar.
4. En Mis Solicitudes, confirmar que el envío nuevo quedó pendiente. Entrar como
   Camilo en otra ventana, abrir esa solicitud y aceptarla. Volver a Santiago
   para comprobar el cambio de estado y la aparición del contacto.
5. Entrar como Mariana y Laura para mostrar la solicitud aceptada: los contactos
   se comparten después de aceptar. Mostrar la cancelada, que ya no expone contactos.
6. Probar presencial desde una zona aproximada en Centro, radio de 5 km, Matemáticas,
   lunes/tarde y $40.000: aparece Sebastián. Con $50.000 también puede entrar
   Valentina. Cambiar a Inglés/virtual/martes/noche/$40.000 para mostrar a Laura.
7. Mostrar la vista móvil, mapa, radio y denegación opcional de GPS. Explicar que
   las zonas son aproximadas, sin seguimiento continuo.

Los estados cambian al operar: aceptar/cancelar durante la presentación modifica
los registros demo reales. La preparación conserva lo ya cambiado, no vuelve a
convertir una solicitud aceptada o cancelada en pendiente.

## Preparación y límites

```sh
node --import tsx scripts/prepare-presentation-demo.ts          # solo muestra el plan
node --import tsx scripts/prepare-presentation-demo.ts --apply  # conserva datos demo
```

El comando usa cuentas existentes, completa contactos de los dos adultos con el
contacto demo controlado, guarda favoritos, crea cuatro solicitudes identificadas
en un registro local privado y publica un PDF ficticio. No envía mensajes.
Las fechas se eligen futuras y dentro de los horarios publicados. Si pasa el tiempo,
las solicitudes históricas siguen visibles, pero habrá que crear una solicitud
nueva para demostrar la aceptación de un horario futuro.

El nuevo cálculo de 100 % es código local hasta que se publique esa versión. La web
Vercel usa la misma base, pero publicar datos no publica cambios de interfaz/cálculo.
Las pruebas de navegador automatizadas y las operaciones API no sustituyen pruebas
en Android/iPhone físicos ni prueban que una tutoría real ocurrió.


## Ampliación a diez por rol

```sh
node --import tsx scripts/expand-presentation-demo.ts          # plan
node --import tsx scripts/expand-presentation-demo.ts --apply  # ampliar/reanudar
```

La ampliación mantiene las cuentas originales y crea seis por rol. Las solicitudes
se registran en un ledger privado para reanudar sin duplicarlas. Si aceptas o rechazas
una durante la presentación, volver a ejecutar el comando conserva ese estado.

## Ensayar de nuevo con Santiago y Camilo

El HTML privado `credenciales.html` contiene la pareja de cuentas y el recorrido
para enviar una solicitud nueva. El ensayo en la web publicada verificó que Camilo
aparece en la búsqueda, que se puede elegir la nueva franja del sábado y que ambos
portales reflejan la aceptación y la cancelación.

El siguiente comando actualiza esos dos perfiles y cancela las solicitudes activas
entre ellos para empezar de nuevo. Conserva el historial y las solicitudes de otras
cuentas. Ejecútalo solamente cuando quieras reiniciar la práctica.

```sh
node --import tsx scripts/refresh-presentation-pair.ts --apply
```
