# Arquitectura del Backend — mav-rd-backend

> Refleja el estado REAL del código al 04/08/2026. Reemplaza la versión
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
  (cloud name/api key/secret), RESEND_API_KEY, TELEGRAM_BOT_TOKEN
  (regenerado el 03/08/2026 tras quedar expuesto en texto plano durante la
  config original — no reusar el token viejo si aparece en algún log
  antiguo).
- **Bloqueante actual:** Resend usa el dominio de pruebas
  (onboarding@resend.dev), que solo entrega a la dirección dueña de la
  cuenta de Resend — confirmado por 403 en el log real de Resend para
  cualquier otro destinatario. Ningún correo a una estudiante real llega
  todavía. Requiere que la fundadora compre y verifique un dominio propio
  en su cuenta de Vercel (manual paso a paso ya entregado). Prioridad #1
  antes de invitar estudiantes reales.

## Autenticación y roles

- JWT propio (sin cookies) — cada request protegido manda
  `Authorization: Bearer <token>` a mano desde el frontend.
- 3 roles: `estudiante`, `coordinadora`, `admin` (la fundadora, María Díaz
  Guzmán).
- `middleware/auth.js`: `protegerRuta` (requiere token válido) y
  `permitirRoles(...roles)` (restringe por rol).
- Login rechaza con 403 si `usuario.activo` es `false` — una cuenta
  archivada no puede iniciar sesión (ver sección de Usuarios abajo).

### Auth (/api/auth)

- POST /registro — cuenta gratuita de estudiante, dispara correo de
  verificación (sin await, no bloquea la respuesta).
- GET /verificar-email?token=... — público, viene de un link de correo.
- POST /reenviar-verificacion — requiere estar logueada.
- POST /olvide-password — público, siempre responde éxito exista o no la
  cuenta (no revela qué correos están registrados).
- POST /restablecer-password — público, con token de 1h de vigencia.
- PATCH /cambiar-password — autenticada, requiere la contraseña actual.
- POST /login — rechaza con 403 si la cuenta está desactivada.
- GET /perfil — autenticada. Si el rol es admin, dispara (sin await) la
  verificación de balance mensual pendiente.

## Usuarios (/api/usuarios)

- GET / (coordinadora, admin) — listar por rol/búsqueda, con paginación
  real (page/limit, máx. 100 por página). Query params: `rol`, `search`
  (regex sobre nombre/apellido/cedula/email), `activo` (true/false),
  `conDiploma` (NUEVO 04/08/2026 — true/false, filtra cruzando contra la
  colección `Diploma` **a nivel de base de datos**, no en el frontend,
  para que la paginación salga exacta en cada pestaña del panel de
  estudiantes), `page`, `limit`.
- PATCH /:id/estado (admin) — activa/desactiva una cuenta (`activo`
  true/false). Usado por el panel de estudiantes para archivar/reactivar.
- PATCH /:id/rol (admin) — cambia el rol de una cuenta (caso excepcional).
- POST /coordinadora (admin) — crea directamente una cuenta de
  coordinadora.

## Sesiones, contenido y exámenes

- `Sesion`: numeradas 1-3, orden estricto (no se puede tomar el examen de
  la N sin haber aprobado la N-1).
- **`ContenidoSesion`**: material de estudio por sesión, con
  `activo: Boolean`. Patrón de soft delete maduro desde antes de esta
  sesión — nunca se borra físico:
  - GET /contenido-sesion/sesion/:sesionId (cualquier autenticada) — solo
    `activo: true`, es lo que ve la estudiante.
  - GET /contenido-sesion/admin/sesion/:sesionId (coordinadora/admin) —
    todos, incluidos inactivos.
  - POST/PATCH — crear/editar, PATCH admite tocar `activo` directo.
  - DELETE /:id (admin) — soft delete puro (`activo = false`).
  - POST /:id/marcar-visto (estudiante) — al completar TODO el contenido
    **activo** de una sesión (desactivar contenido viejo no deja a nadie
    con progreso colgado), intenta desbloquear el examen automáticamente
    vía `intentarDesbloquear` (ver abajo). Si hay espera de 24h activa,
    responde `esperaActiva: true` sin que sea un error — el contenido
    igual queda marcado como visto.
- **`Examen`**: versiones de examen por sesión, con `activo: Boolean`.
  Mismo patrón maduro, confirmado el 04/08/2026 sin necesidad de tocar
  nada:
  - POST /examenes (coordinadora/admin) — crea una nueva versión.
  - GET /examenes/sesion/:sesionId (coordinadora/admin) — solo versiones
    activas.
  - PATCH /examenes/:id — editar nombre/preguntas (exactamente 10).
  - DELETE /examenes/:id (admin) — soft delete puro (`activo = false`),
    nunca borra físico — preserva la integridad de `IntentoExamen` viejos
    que apuntan a esa versión.
  - Pueden existir **varias versiones activas a la vez** para la misma
    sesión — `intentarDesbloquear` elige una al azar entre las activas al
    crear un intento nuevo. Desactivar una versión vieja al publicar una
    nueva es una acción manual (DELETE), no automática.

### `intentarDesbloquear()` — lógica compartida de desbloqueo del EXAMEN

Vive en `examenController.js`, exportada y reusada desde
`contenidoSesionController.js` e `intentoExamenController.js`. La llaman
tres caminos distintos: la coordinadora manual (con
`esOverrideManual: true`, se salta la espera de 24h), el sistema
automático al completar el contenido de una sesión, y la propia
estudiante vía autoservicio una vez cumplida la espera.

Reglas que aplica, en orden: sesión existe → progreso existe (pago
confirmado) → orden estricto de sesiones (`sesionesAprobadas`) → máximo 3
intentos por sesión → si ya hay un intento sin entregar, lo devuelve tal
cual en vez de duplicar → espera mínima de 24h desde que aprobó la sesión
anterior (solo aplica al primer intento de una sesión que no sea la 1, y
solo si no es override manual) → elige una versión de examen activa al
azar → crea el `IntentoExamen`.

**Separación de responsabilidades importante:** esta función SOLO decide
si se puede crear un intento de examen. El acceso a la TEORÍA de la
siguiente sesión (`progreso.sesionActualDesbloqueada`) se adelanta
inmediatamente al aprobar un examen, dentro de `entregarIntento`
(`intentoExamenController.js`) — no aquí. El orden para efectos del
EXAMEN se valida contra `sesionesAprobadas`, no contra
`sesionActualDesbloqueada`.

## Diplomas (/api/diplomas)

- POST /:userId/generar (coordinadora/admin) — genera el PDF (pdf-lib),
  lo sube a Cloudinary, y dispara (sin await) un correo a la estudiante
  con el código de verificación y link a /diploma.
- GET /elegibles (coordinadora/admin) — estudiantes con
  `progreso.cursoCompletado: true` que todavía no tienen diploma.
- **GET / (NUEVO 04/08/2026)** (coordinadora/admin) — `listarTodos`, todos
  los diplomas generados (`{ userId, codigoVerificacion, fechaEmision }`).
  Usado por el panel de estudiantes para cruzar "tiene diploma" (pestaña
  Graduadas) — mismo patrón que ya se usaba con `GET /inscripciones` para
  cruzar estados de pago en el frontend.
- GET /verificar/:codigo — público, sin login, usado por
  /verificar-diploma.
- GET /me (estudiante) — su propio diploma.
- GET /me/descargar y GET /:id/descargar — descarga firmada desde
  Cloudinary. **No usan `protegerRuta`** porque aceptan el token también
  por `?token=` en vez de solo el header (un `<a href>` de descarga no
  puede mandar headers personalizados) — la verificación se hace a mano
  con `obtenerUsuarioDesdeToken()` dentro del controller.
- `derivarPublicIdDeUrl()`: para diplomas generados antes de que existiera
  el campo `publicIdCloudinary`, deriva el public_id desde la URL guardada
  como respaldo.

## Inscripciones y pagos

Sin cambios en esta sesión. Dos flujos conviven en el mismo esquema
(`Inscripcion`): manual (coordinadora crea + confirma efectivo) y
auto-inscripción con voucher (la estudiante sube su propio comprobante,
bloqueado si su email no está verificado). Pasarela de pago automática
(Azul): decisión cerrada, no se implementará — el flujo manual con
voucher ya resuelve la necesidad real.

## Sistema de notificaciones (internas)

Sin cambios en esta sesión. `destinatariosNotificacion` (CRUD admin) más
`utils/notificaciones.js` con plantilla de correo compartida (logo +
colores de marca) para 6 tipos de correo: verificación de cuenta, pago
confirmado, pago rechazado (con motivo), diploma listo, recuperación de
contraseña, y el recordatorio de balance mensual pendiente (con marcador
en `Configuracion` para no repetir el aviso sobre el mismo mes, ya que no
hay cron real — Render se duerme en el tier free, así que esto se revisa
cada vez que un admin abre la app vía `GET /auth/perfil`). Avisos internos
de voucher nuevo también van por Telegram Bot API.

## Notas de diseño

- Ningún borrado es físico donde importa la integridad histórica: `Examen`,
  `ContenidoSesion` y `User` (vía `activo`) son siempre soft delete.
  `Diploma` no tiene ni necesita soft delete — es un documento de emisión,
  no algo que se "desactive".
- La purga real de datos de prueba se hace por terminal, directo a Mongo,
  nunca desde una función de UI — decisión tomada a propósito por el
  riesgo de que un hard delete genérico rompa diplomas ya emitidos
  (públicamente verificables en /verificar-diploma). Ver
  HISTORIAL_MODIFICACIONES.md para el detalle de qué colecciones debe
  tocar en cascada cuando se retome.

## Pendiente real (backend)

- Prioridad #1: dominio propio verificado en Resend (bloqueado hasta
  reunión con la fundadora).
- Terminar Telegram para el celular de la fundadora (`chat_id`, bloqueado
  hasta la misma reunión).
- Diploma compartible en redes: **no requiere cambios de backend**, es
  100% frontend (ver ARQUITECTURA_FRONTEND.md y
  HISTORIAL_MODIFICACIONES.md para el diseño acordado).
- Recordatorios por correo (examen disponible / voucher sin seguimiento):
  ideas a futuro, sin diseñar, falta resolver el disparador sin cron real.
- Seguridad/confiabilidad: rotar credenciales expuestas, rate limiting en
  login/verificar-diploma, CORS dinámico, Sentry — al final, cuando la app
  esté más madura.
- Afinar el rol `backup_readonly` en Atlas de `readAnyDatabase@admin` a
  un rol Read específico sobre `mav_rd` (no urgente, es de solo lectura).
