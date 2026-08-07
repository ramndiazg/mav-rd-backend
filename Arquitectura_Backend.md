# Arquitectura del Backend — mav-rd-backend

> Refleja el estado REAL del código al 07/08/2026. Reemplaza la versión
> anterior de este mismo archivo. Para el historial de cómo se llegó aquí,
> ver HISTORIAL_MODIFICACIONES.md.

Stack: Node.js + Express + Mongoose (MongoDB Atlas, cluster compartido
mujeresalvolante.rd4sofa.mongodb.net, versión real 8.0.29) + JWT (sin
cookies) + Cloudinary (archivos) + Resend (email) + Telegram Bot API
(avisos internos) + despliegue en Render (mav-rd-backend.onrender.com).

## Infraestructura y despliegue

- CORS: FRONTEND_URL en Render debe apuntar exactamente a la URL de
  Vercel (https://muvo-rd.vercel.app), sin `/` al final.
- Variables de entorno relevantes: JWT_SECRET, JWT_EXPIRES_IN, Cloudinary
  (cloud name/api key/secret), RESEND_API_KEY, TELEGRAM_BOT_TOKEN,
  MONGODB_URI (o MONGO_URI, según el .env real — los scripts de
  mantenimiento en `scripts/` prueban ambos nombres).
- **Bloqueante actual, sin cambios:** Resend usa el dominio de pruebas
  (onboarding@resend.dev), que solo entrega a la dirección dueña de la
  cuenta de Resend. Requiere que la fundadora compre y verifique un
  dominio propio en su cuenta de Vercel. Prioridad #1 antes de invitar
  estudiantes reales — sigue bloqueado hasta la reunión con ella.

## Audiencia del curso (cambio de alcance, 06/08/2026)

El curso **ya no es exclusivo para mujeres** — a partir de esta fecha
también está dirigido a adolescentes de ambos sexos. El backend en sí
nunca tuvo lógica específica de género (roles, validaciones y modelos son
neutros desde el inicio), así que este cambio no tocó ninguna colección
ni controller. El impacto real está en el frontend (copy, textos de
marketing) — ver ARQUITECTURA_FRONTEND.md. Cualquier contenido nuevo
(exámenes, material de estudio, comunicaciones) que se redacte de ahora
en adelante debe usar lenguaje neutral, no dirigido a un género
específico.

## Autenticación y roles

- JWT propio (sin cookies) — cada request protegido manda
  `Authorization: Bearer <token>` a mano desde el frontend.
- 3 roles: `estudiante`, `coordinadora`, `admin` (la fundadora, María Díaz
  Guzmán — cuenta real: `maria@test.com`).
- `middleware/auth.js`: `protegerRuta` (requiere token válido) y
  `permitirRoles(...roles)` (restringe por rol).
- Login rechaza con 403 si `usuario.activo` es `false`.

### Auth (/api/auth)

Sin cambios desde la versión anterior — registro, verificación de email,
recuperación de contraseña, login con rechazo por cuenta desactivada.

## Usuarios (/api/usuarios)

Sin cambios de esquema ni de endpoints desde la versión anterior.

## Sesiones, contenido y exámenes

### `Sesion` — límite ampliado de 3 a 4 (06/08/2026)

```js
numero: { type: Number, required: true, unique: true, min: 1, max: 4 },
```

Antes tenía `max: 3` — este era el verdadero límite duro del sistema:
Mongo rechazaba cualquier intento de crear una Sesión 4 antes de que el
resto de la lógica (que ya era genérica) llegara a evaluarla.

### ⚠️ Hueco descubierto esta sesión: no existe `POST /sesiones`

`sesionController.js` solo expone tres operaciones:

- `listarSesiones` (GET /, coordinadora/admin) — lista completa.
- `obtenerSesionParaEstudiante` (GET /:numero, estudiante) — solo si tiene
  acceso desbloqueado.
- `actualizarSesion` (PATCH /:numero, admin) — **edita** una sesión que ya
  existe (`findOneAndUpdate` por `numero`); si no existe, devuelve 404.

**No hay ningún endpoint para crear una sesión nueva.** Las 3 sesiones
originales se crearon directo en Atlas, a mano — nunca hubo un camino de
API para esto. Se reveló al purgar la base de datos (ver más abajo) y
quedarse sin ninguna sesión: el panel de coordinadora no tenía forma de
recrearlas.

**Solución pragmática adoptada:** un script de terminal
(`scripts/crearSesionesIniciales.js`, ver abajo) en vez de construir un
endpoint nuevo — es una operación que se hace una vez (crear las 4
sesiones), no una función que la coordinadora vaya a necesitar seguido.
Si en el futuro hace falta crear sesiones desde el panel con frecuencia,
ahí sí valdría la pena un `POST /sesiones` real.

**Relacionado, también pendiente:** el panel de coordinadora tampoco
tiene un formulario para _renombrar_ una sesión — el backend sí lo
permite (`PATCH /sesiones/:numero` acepta `titulo`), pero el frontend no
tiene ninguna pantalla que lo use. Cuando se decidan los 4 temas reales,
alguien va a tener que renombrarlas con una petición manual (Postman/
Thunder Client) hasta que se construya ese formulario — decisión
pospuesta a propósito, se retoma más adelante.

### `ContenidoSesion` y `Examen`

Sin cambios de esquema — el patrón de soft delete (`activo: Boolean`)
sigue igual que antes. Ver DATABASE.md: ambas colecciones quedaron
**vacías** tras la purga del 06/08/2026, pendientes de contenido real.

### `intentarDesbloquear()` — lógica compartida de desbloqueo del EXAMEN

Sin cambios de comportamiento — sigue validando orden estricto contra
`sesionesAprobadas`, máximo 3 intentos, espera de 24h, etc. Nunca tuvo el
número de sesiones quemado, así que generaliza sola a 4 sesiones sin
tocarla.

### `entregarIntento()` (`intentoExamenController.js`) — actualizado a 4 sesiones (06/08/2026)

Tres números que antes decían `3` ahora dicen `4`:

```js
const siguienteSesion = Math.min(sesionDoc.numero + 1, 4); // antes: 3
if (sesionDoc.numero < 4) { ... }                          // antes: 3
if (progreso.sesionesAprobadas.length >= 4) {               // antes: 3
  progreso.cursoCompletado = true;
}
```

`cursoCompletado` ahora solo se activa después de aprobar las 4 sesiones,
no 3.

## Diplomas (/api/diplomas)

Sin cambios de backend en esta sesión — el diploma compartible en redes
(imagen generada con `<canvas>`) es 100% frontend, ver
ARQUITECTURA_FRONTEND.md. Nada de esto tocó `diplomaController.js`.

## Inscripciones y pagos

Sin cambios en esta sesión.

## Sistema de notificaciones (internas)

Sin cambios en esta sesión.

## Scripts de mantenimiento (`scripts/`, NUEVO 06/08/2026)

Carpeta nueva, a la altura de `src/`, para operaciones de datos que se
hacen por terminal — nunca desde un endpoint de la API, siguiendo la
misma decisión que ya existía para la purga de datos de prueba.

- **`purgarDatosPrueba.js`**: borra todo excepto la cuenta admin
  (`maria@test.com`) — usuarios, sesiones, exámenes, contenido de
  estudio, intentos de examen, progreso de estudiante, inscripciones y
  diplomas. Modo dry-run por defecto (solo cuenta, no borra), requiere
  `--confirmar` + escribir `BORRAR` a mano para ejecutar de verdad. **Ya
  se corrió el 06/08/2026** — ver DATABASE.md para los conteos exactos
  purgados.
- **`crearSesionesIniciales.js`**: crea las sesiones 1-4 con títulos
  provisionales ("Sesión 1"..."Sesión 4"), para poder probar
  contenido/exámenes mientras se definen los temas reales. Mismo patrón
  dry-run + `--confirmar`. **Creado pero todavía no ejecutado** — pendiente
  para la próxima sesión de trabajo.

Ambos requieren `MONGODB_URI` (o `MONGO_URI`) en el `.env` del backend y
reusan los modelos reales de `src/models/`, no queries genéricas sueltas.

## Notas de diseño

- Ningún borrado es físico donde importa la integridad histórica: `Examen`,
  `ContenidoSesion` y `User` (vía `activo`) son siempre soft delete.
  `Diploma` no tiene ni necesita soft delete.
- La purga real de datos de prueba se hace por terminal, directo a Mongo,
  nunca desde una función de UI — decisión que ya existía y que ahora
  tiene script formal reutilizable (ver arriba).

## Pendiente real (backend)

- Prioridad #1: dominio propio verificado en Resend (bloqueado hasta
  reunión con la fundadora).
- Terminar Telegram para el celular de la fundadora (`chat_id`, bloqueado
  hasta la misma reunión).
- Correr `scripts/crearSesionesIniciales.js --confirmar` para recrear las
  4 sesiones (con títulos provisionales) y poder retomar la carga de
  contenido.
- Definir los 4 temas reales del curso con la fundadora, y renombrar las
  sesiones (por ahora, a mano vía `PATCH /sesiones/:numero`; considerar
  construir un formulario en el panel si esto se vuelve frecuente).
- Subir `ContenidoSesion` y crear versiones de `Examen` reales para las 4
  sesiones — todo quedó vacío tras la purga.
- Decidir si vale la pena construir `POST /sesiones` (crear sesión desde
  el panel) o si el script de terminal es suficiente a largo plazo.
- Recordatorios por correo (examen disponible / voucher sin seguimiento):
  ideas a futuro, sin diseñar, falta resolver el disparador sin cron real.
- Seguridad/confiabilidad: rotar credenciales expuestas, rate limiting en
  login/verificar-diploma, CORS dinámico, Sentry — al final, cuando la app
  esté más madura.
- Afinar el rol `backup_readonly` en Atlas de `readAnyDatabase@admin` a
  un rol Read específico sobre `mav_rd` (no urgente, es de solo lectura).
