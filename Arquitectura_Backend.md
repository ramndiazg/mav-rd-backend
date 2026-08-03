# Arquitectura del Backend — mav-rd-backend

> Refleja el estado REAL del código al 03/08/2026. Reemplaza la versión anterior
> de este mismo archivo. Para el historial de cómo se llegó aquí, ver
> `HISTORIAL_MODIFICACIONES.md`.

**Stack:** Node.js + Express + Mongoose (MongoDB Atlas) + JWT + Cloudinary
(`pdf-lib` para PDFs) + Resend (correo) + Telegram Bot API (avisos internos)

## Pendiente urgente — antes de invitar estudiantes reales

**El correo saliente (Resend) solo funciona para la cuenta con la que se
registró Resend.** Mientras `RESEND_FROM` siga usando el dominio de pruebas
(`onboarding@resend.dev`), Resend rechaza con 403 cualquier envío a un
correo que no sea el del dueño de la cuenta de Resend — confirmado en el log
real de Resend. Esto significa que hoy, en producción, ningún correo
dirigido a una estudiante real llega: ni verificación de cuenta, ni
confirmación/rechazo de pago, ni recuperación de contraseña. Solo Telegram
funciona sin restricciones.

Solución (prioridad #1, pendiente de que la fundadora decida/actúe):

1. Comprar un dominio propio (no hace falta que sea el del sitio).
2. Verificarlo en Resend (Dashboard -> Domains -> Add Domain, agregar los
   registros DNS que Resend indique).
3. Cambiar RESEND_FROM en Render a "Nombre <algo@tudominio.com>".
4. Volver a probar los 3 flujos de correo con una cuenta que no sea la del
   dueño de Resend.

## Infraestructura

- Hosting: Render, tier free. El servicio se duerme tras 15 min de
  inactividad, el primer request después de eso tarda ~30-60s (cold start).
- Base de datos: MongoDB Atlas, cluster mujeresalvolante.rd4sofa.mongodb.net
  (compartido con otra app, este proyecto usa exclusivamente mav_rd).
  Network Access con 0.0.0.0/0 habilitado.
- CORS: origenesPermitidos en app.js ya es un arreglo
  (["http://localhost:3000", process.env.FRONTEND_URL]), no un solo string
  como se pensaba antes, pero sigue siendo una lista corta fija, no
  dinámica por comas en una sola variable.
- FRONTEND_URL en Render: confirmado apuntando a
  https://muvo-rd.vercel.app (la URL nueva, en la cuenta de Vercel de la
  fundadora).
- Repo: ramndiazg/mav-rd-backend en GitHub.
- Correo: Resend (RESEND_API_KEY, RESEND_FROM), ver advertencia arriba.
- Avisos internos: Telegram Bot API (TELEGRAM_BOT_TOKEN), sin
  restricciones de destinatario, funciona para cualquier chat_id.
  TELEGRAM_BOT_TOKEN regenerado (el original había quedado expuesto en
  texto plano durante la configuración) y actualizado en Render.
- Seguridad pendiente: rotar JWT_SECRET, contraseña de MongoDB Atlas y
  secreto de Cloudinary, quedaron expuestos en conversaciones de chat en
  algún momento. Pendiente "cuando el proyecto sea definitivo".
- Backup manual redundante (fuera de este repo, vive en la PC de Ramon):
  usuario de solo lectura `backup_readonly` creado en Atlas Database
  Access para este propósito. Ver HISTORIAL_MODIFICACIONES.md, entrada
  del 31/07/2026, para el detalle completo del proceso.
- Decisión tomada: no se integrará una pasarela de pago automática
  (Azul) por ahora, la auto-inscripción con voucher (ver más abajo) ya
  resuelve la necesidad real de que la estudiante se inscriba por su cuenta.
  Ver HISTORIAL_MODIFICACIONES.md para el análisis completo que se hizo.

## Estructura de carpetas

```
mav-rd-backend/
├── src/
│   ├── config/
│   │   ├── db.js
│   │   └── cloudinary.js
│   ├── models/
│   │   ├── User.js, Inscripcion.js, Configuracion.js, Sesion.js, Examen.js,
│   │   │ IntentoExamen.js, ProgresoEstudiante.js, ContenidoSesion.js, Diploma.js,
│   │   │ Noticia.js, Testimonio.js, FAQ.js, ContenidoPagina.js,
│   │   │ MovimientoContable.js, BalanceMensual.js, DestinatarioNotificacion.js
│   ├── controllers/ (uno por recurso, mismos nombres que los modelos,
│   │   │ + destinatarioController.js)
│   ├── routes/ (uno por recurso, + destinatarioRoutes.js)
│   ├── middleware/
│   │   ├── auth.js -> protegerRuta (verifica JWT), permitirRoles(...roles)
│   │   ├── upload.js -> multer en memoria, solo imágenes, máx 5MB
│   │   └── errorHandler.js
│   ├── utils/
│   │   ├── pdfGenerator.js -> generarDiplomaPDF, generarBalancePDF (rediseñado)
│   │   ├── cloudinaryUpload.js -> subirBuffer(), generarUrlDescargaFirmada()
│   │   ├── verificationCode.js -> generarCodigoVerificacion (MAV-<año>-000001)
│   │   ├── notificaciones.js -> plantilla de correo compartida + 6 funciones
│   │   │ de envío (Resend + Telegram)
│   │   ├── recordatorios.js -> chequeo de balance mensual pendiente
│   │   └── seedSesiones.js, seedMaterialReal.js, seedExamenesReal.js (scripts)
│   ├── app.js
│   └── server.js
├── .env (no se sube)
└── package.json
```

## Autenticación

El backend NO usa cookies. Login/registro devuelven el JWT en el body:

```json
{ "success": true, "data": { "usuario": {...}, "token": "eyJ..." } }
```

- El payload del token solo trae { id }, nada de rol ni nombre.
- Enviar el token en cada request protegido: Authorization: Bearer <token>.
- Expira en 7 días (JWT_EXPIRES_IN). No hay refresh token.
- Roles: estudiante, coordinadora, admin. El registro público SIEMPRE
  crea rol estudiante.
- Verificación de email (nuevo): al registrarse, la cuenta queda con
  emailVerificado: false y recibe un correo con un link
  (/verificar-email?token=..., válido 24h). Puede loguearse y usar la app
  igual sin verificar, el único bloqueo real está en
  POST /inscripciones/mia (no puede auto-inscribirse sin verificar).
- Recuperación de contraseña (nuevo): POST /auth/olvide-password (con
  el email) manda un link a /restablecer-password?token=... (válido 1h).
  Por seguridad, responde éxito exista o no la cuenta, para no revelar qué
  correos están registrados.

### Convención de respuestas

```json
{ "success": true, "data": {...} }
{ "success": false, "error": "mensaje en español, listo para mostrar al usuario" }
```

## Referencia de endpoints

### Auth (/api/auth)

| Método | Ruta                    | Rol         | Descripción                                                                                                  |
| ------ | ----------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| POST   | /registro               | público     | Crea cuenta de estudiante, envía correo de verificación                                                      |
| POST   | /login                  | público     | { usuario, token }                                                                                           |
| GET    | /perfil                 | autenticada | Datos del usuario del token actual. Si es admin, dispara (sin await) el chequeo de balance mensual pendiente |
| PATCH  | /cambiar-password       | autenticada | { passwordActual, passwordNueva }                                                                            |
| GET    | /verificar-email?token= | público     | Marca emailVerificado: true                                                                                  |
| POST   | /reenviar-verificacion  | autenticada | Genera un token nuevo y reenvía el correo                                                                    |
| POST   | /olvide-password        | público     | { email } -> manda link de recuperación si existe la cuenta                                                  |
| POST   | /restablecer-password   | público     | { token, passwordNueva }                                                                                     |

### Usuarios (/api/usuarios)

| Método | Ruta                   | Rol                 | Descripción                  |
| ------ | ---------------------- | ------------------- | ---------------------------- |
| GET    | /?rol=&search=&activo= | coordinadora, admin | Buscar usuarias (límite 50)  |
| POST   | /coordinadora          | admin               | Crear cuenta de coordinadora |
| PATCH  | /:id/estado            | admin               | { activo: bool }             |
| PATCH  | /:id/rol               | admin               | { rol }                      |

### Configuración (/api/configuracion)

| Método | Ruta    | Rol     | Descripción                             |
| ------ | ------- | ------- | --------------------------------------- |
| GET    | /       | público | { precio_plan_normal, precio_plan_vip } |
| PATCH  | /:clave | admin   | { valor }                               |

Precios actuales: precio_plan_normal: 1000, precio_plan_vip: 7000 (RD$).
También se usa esta misma colección como marcador interno para no repetir
avisos de balance pendiente (ver utils/recordatorios.js más abajo), claves
tipo recordatorio_balance_202606.

### Inscripciones (/api/inscripciones)

| Método | Ruta                | Rol                 | Descripción                                                                                                                                                                                                                                         |
| ------ | ------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | /                   | coordinadora, admin | Flujo manual/efectivo, { userId, tipoPlan, monto }                                                                                                                                                                                                  |
| POST   | /mia                | estudiante          | Auto-inscripción con voucher, { tipoPlan, bancoEmisor, numeroReferencia, fechaDeposito, comprobanteUrl }. Requiere emailVerificado: true. El monto se calcula SIEMPRE desde Configuracion. Reintenta sobre la misma inscripción si estaba rechazado |
| GET    | /?estadoPago=       | coordinadora, admin | Listar (con datos de la estudiante poblados)                                                                                                                                                                                                        |
| GET    | /me                 | estudiante          | Su propia inscripción más reciente (o null)                                                                                                                                                                                                         |
| PATCH  | /:id/confirmar-pago | coordinadora, admin | Marca pagado, crea ProgresoEstudiante, MovimientoContable, y manda correo de confirmación a la estudiante                                                                                                                                           |
| PATCH  | /:id/rechazar-pago  | coordinadora, admin | { motivo }, marca rechazado, manda correo con el motivo a la estudiante                                                                                                                                                                             |

estadoPago: pendiente (flujo viejo/efectivo), pendiente_verificacion
(voucher subido, por revisar), pagado, rechazado. numeroReferencia
tiene índice único (sparse).

Al subir un voucher nuevo (POST /mia), se dispara (sin await)
notificarNuevoVoucher() -> avisa por email/Telegram a todos los
DestinatarioNotificacion activos.

### Sesiones, Exámenes, Contenido de Estudio, Intentos, Progreso

Sin cambios desde la versión anterior de este documento, ver ahí para el
detalle completo de endpoints y reglas de negocio (orden estricto de
sesiones, máx. 3 intentos, 70% para aprobar, auto-desbloqueo de examen al
terminar el contenido).

### Diplomas (/api/diplomas)

Igual que antes, con una adición: al generar el diploma
(POST /:userId/generar), se manda (sin await) un correo a la estudiante
con el código de verificación y un link a /diploma.

### Uploads (/api/uploads)

POST /imagen, roles coordinadora, admin, estudiante (agregado
para que pueda subir su comprobante de pago desde /inscripcion).

### Noticias, Testimonios, FAQ, Contenido de Página, Contabilidad (movimientos)

Sin cambios de endpoints desde la versión anterior.

### Contabilidad, balances (/api/contabilidad)

| Método | Ruta                           | Rol                            | Descripción                                                                                                                                                                                                                                    |
| ------ | ------------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | /movimientos                   | admin                          | Igual que antes                                                                                                                                                                                                                                |
| GET    | /movimientos                   | admin                          | Igual que antes                                                                                                                                                                                                                                |
| POST   | /balances/generar              | admin                          | Ahora también guarda publicIdCloudinary                                                                                                                                                                                                        |
| GET    | /balances                      | admin                          | Igual que antes                                                                                                                                                                                                                                |
| GET    | /balances/:id                  | admin                          | Igual que antes                                                                                                                                                                                                                                |
| GET    | /balances/:id/descargar?token= | admin (verificado manualmente) | Nuevo, sirve el PDF con cabeceras correctas, resolviendo el bug de descarga sin extensión .pdf (mismo patrón que diplomas). Va montado ANTES del middleware protegerRuta del router porque un <a href> no puede mandar el header Authorization |

generarBalancePDF() fue rediseñado: ya no es texto plano, ahora tiene 3
tarjetas de totales (entradas/salidas/saldo) + una tabla de categorías con
columnas alineadas y encabezado con el logo, mismo nivel de cuidado visual
que el diploma.

### Destinatarios de notificación (/api/destinatarios) — NUEVO

| Método | Ruta | Rol   | Descripción                                   |
| ------ | ---- | ----- | --------------------------------------------- |
| GET    | /    | admin | Listar todos (incluidos inactivos)            |
| POST   | /    | admin | { tipo: 'email'/'telegram', valor, etiqueta } |
| PATCH  | /:id | admin | { valor?, etiqueta?, activo? }                |
| DELETE | /:id | admin | Borrado real (no hay nada que la referencie)  |

Exclusivo de admin (ni siquiera coordinadora), mismo nivel de acceso que
Contabilidad. Gestiona quién recibe avisos de: voucher nuevo por verificar,
y balance mensual pendiente.

## Sistema de notificaciones (utils/notificaciones.js)

Plantilla de correo compartida (plantillaCorreo()) con logo, colores de
marca, botón de acción y pie de página, todos los correos se ven
consistentes. Funciones actuales:

- notificarNuevoVoucher() -> a los DestinatarioNotificacion activos (email + Telegram)
- notificarBalancePendiente() -> a los DestinatarioNotificacion activos (email + Telegram)
- enviarCorreoVerificacion() -> a la estudiante
- enviarCorreoPagoConfirmado() -> a la estudiante
- enviarCorreoPagoRechazado() -> a la estudiante
- enviarCorreoDiplomaListo() -> a la estudiante
- enviarCorreoRecuperacion() -> a la estudiante

Todas atrapan sus propios errores y solo los registran en consola, nunca
deben tumbar el flujo principal que las llama. Casi todas se llaman sin
await a propósito, para no demorar la respuesta al usuario.

## Recordatorio de balance pendiente (utils/recordatorios.js)

Como Render se duerme en el tier free, no se usa un cron tradicional.
En su lugar, cada vez que un admin llama a GET /api/auth/perfil (pasa
cada vez que abre la app), se revisa en silencio si el balance del mes
calendario anterior ya existe. Si falta, y si no se ha avisado ya sobre
ese mes específico (marcador en Configuracion), se notifica una sola vez.

## Reglas de negocio implementadas (no reinventar en el frontend)

- Orden estricto de sesiones, máx. 3 intentos, 70% para aprobar (sin cambios).
- Pago confirmado -> MovimientoContable automático + correo a la estudiante.
- Balances mensuales son "upsert".
- Examen se desbloquea automático al terminar el contenido de la sesión.
- Auto-inscripción con voucher requiere emailVerificado: true.
- numeroReferencia no se puede reusar entre inscripciones (índice único sparse).

## Pendiente de implementar (NO existe todavía)

- Dominio propio verificado en Resend, ver advertencia al inicio, prioridad #1.
  Bloqueado hasta la próxima reunión con la fundadora (ella compra el
  dominio en Vercel).
- Rate limiting en /api/auth/login y /api/diplomas/verificar/:codigo.
- CORS con lista de orígenes dinámica separada por comas.
- Monitoreo de errores en producción (ej. Sentry).
- Tests unitarios para intentarDesbloquear().
- "Me gusta" en comentarios de noticias.

Nota sobre backups: Atlas M0 (gratis) NO ofrece backups automáticos —
confirmado, no es un pendiente de "verificar" sino un hecho del tier.
Se resolvió con un proceso manual externo a Atlas (Docker local +
Dropbox cifrado), ver HISTORIAL_MODIFICACIONES.md.

## Testing

Flujo completo probado end-to-end: registro -> verificación de email (cuando
Resend funcione con dominio propio) -> auto-inscripción con voucher ->
verificación por coordinadora (confirmar/rechazar) -> 3 sesiones -> examen ->
diploma -> correo de diploma listo. Sistema de notificaciones (email +
Telegram) probado y funcionando para avisos internos; pendiente de
verificar dominio para que funcione hacia estudiantes reales.
