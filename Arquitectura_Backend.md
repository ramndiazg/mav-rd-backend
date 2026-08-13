# Arquitectura del Backend — mav-rd-backend

> Refleja el estado REAL del código al 13/08/2026. Reemplaza la versión
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
  (cloud name/api key/secret), RESEND_API_KEY, RESEND_FROM,
  TELEGRAM_BOT_TOKEN, MONGODB_URI (o MONGO_URI, según el .env real — los
  scripts de mantenimiento en `scripts/` prueban ambos nombres).
- **Bloqueante actual, sin cambios:** Resend usa el dominio de pruebas
  (onboarding@resend.dev), que solo entrega a la dirección dueña de la
  cuenta de Resend. Requiere que la fundadora compre y verifique un
  dominio propio en su cuenta de Vercel. Prioridad #1 antes de invitar
  estudiantes reales — sigue bloqueado hasta la reunión con ella. Esto
  también afecta al formulario de Empresas (ver más abajo): el envío al
  backend funciona, pero el correo real a la fundadora no va a llegar
  hasta que esto se resuelva.

## Audiencia del curso (cambio de alcance, 06/08/2026)

El curso **ya no es exclusivo para mujeres** — a partir de esta fecha
también está dirigido a adolescentes de ambos sexos. El backend en sí
nunca tuvo lógica específica de género (roles, validaciones y modelos son
neutros desde el inicio), así que este cambio no tocó ninguna colección
ni controller. El impacto real está en el frontend (copy, textos de
marketing) — ver ARQUITECTURA_FRONTEND.md.

## Estructura real de planes (aclarado 13/08/2026)

Un solo curso teórico (4 sesiones, igual para todas) con **dos variantes
de práctica de manejo**: `normal` y `vip` — la diferencia es solo en la
práctica (más personalizada, más tiempo con el instructor en el plan
VIP), no en el contenido teórico. Esto ya estaba modelado así desde antes
en `Inscripcion.tipoPlan` (`enum: ["normal", "vip"]`); lo nuevo es que
ahora también se muestra en el home público (ver
ARQUITECTURA_FRONTEND.md), leyendo los mismos precios de
`GET /api/configuracion` que ya usaba `/inscripcion`.

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

### `Sesion` — límite de 4, colección ya recreada (06-13/08/2026)

```js
numero: { type: Number, required: true, unique: true, min: 1, max: 4 },
```

El script `scripts/crearSesionesIniciales.js --confirmar` (documentado
como pendiente en la versión anterior de este archivo) **ya se ejecutó**
— las 4 sesiones existen en Atlas con títulos provisionales ("Sesión
1"..."Sesión 4"). Sigue sin haber un `POST /sesiones` — `sesionController.js`
solo expone `listarSesiones`, `obtenerSesionParaEstudiante` y
`actualizarSesion` (PATCH). Ver DATABASE.md para el estado real de la
colección.

**Sigue pendiente:** definir los 4 temas reales con la fundadora y
renombrar las sesiones — el backend ya soporta el rename vía
`PATCH /sesiones/:numero` (`titulo`), pero el panel de coordinadora
todavía no tiene un formulario para eso (ver ARQUITECTURA_FRONTEND.md).

### `ContenidoSesion` — ahora soporta subir PDF como archivo, no solo pegar URL (13/08/2026)

Antes, `tipo: "pdf"` solo aceptaba una URL pegada a mano en `url`. Ahora
se puede **subir el archivo real** desde el panel de coordinadora, con
entrega firmada — mismo patrón que ya existía para los diplomas.

```js
{
  sesionId: ObjectId,
  titulo: String,
  tipo: "video" | "pdf" | "enlace" | "texto",
  url: String,               // video/pdf/enlace
  publicIdCloudinary: String, // NUEVO — solo si el pdf se subió como archivo
  contenidoTexto: String,    // texto
  imagenUrl: String,         // portada opcional, cualquier tipo
  orden: Number,
  activo: Boolean,
}
```

Flujo completo:

1. **Subida** — `POST /api/uploads/pdf` (coordinadora/admin, multipart,
   campo `pdf`, límite 15MB, `middleware/upload.js` → `uploadPDF`).
   Sube a Cloudinary con `resourceType: "raw"` (carpeta
   `mav-rd/contenido-sesion`) y devuelve `{ url, publicId }`.
2. **Guardado** — `crearContenido`/`editarContenido` en
   `contenidoSesionController.js` aceptan y guardan `publicIdCloudinary`
   igual que cualquier otro campo.
3. **Entrega** — `GET /api/contenido-sesion/:id/archivo` (NUEVO). Como
   Cloudinary bloquea la entrega pública de recursos `raw` sin firmar
   (mismo motivo por el que existe `generarUrlDescargaFirmada` para los
   diplomas), este endpoint genera una URL firmada al momento, hace
   fetch a Cloudinary y sirve el PDF inline. Vive **fuera** de
   `protegerRuta` en `routes/contenidoSesion.js` porque un `<a href>` de
   descarga no puede mandar headers — verifica el token manualmente
   (header o `?token=`), mismo patrón exacto que
   `diplomaController.js#obtenerUsuarioDesdeToken`. A diferencia del
   diploma, aquí sí valida que la estudiante tenga la sesión
   desbloqueada (`sesion.numero <= progreso.sesionActualDesbloqueada`)
   antes de entregarle el archivo — coordinadora/admin tienen acceso
   libre.
4. **Fallback** — si el material tiene `url` pero no
   `publicIdCloudinary` (porque alguien pegó un link externo a mano en
   vez de subir un archivo), el frontend usa `url` directo. Contenido
   viejo (de antes de este cambio) sigue funcionando así.

**Todavía no se cargó contenido real** — la colección sigue vacía de
PDFs/material real, solo se confirmó que el flujo de subida despliega y
responde bien. Pendiente cargar contenido de verdad cuando estén listos
los temas reales de las 4 sesiones.

### `intentarDesbloquear()` y `entregarIntento()` — sin cambios en esta sesión

Sin cambios de comportamiento desde la versión anterior de este archivo.

## Diplomas (/api/diplomas)

Sin cambios en esta sesión.

## Inscripciones y pagos

Sin cambios en esta sesión.

## Sistema de notificaciones (internas)

`utils/notificaciones.js` — se agregó `enviarSolicitudEmpresarial`
(13/08/2026), que reutiliza exactamente el mismo mecanismo que
`notificarNuevoVoucher`/`notificarBalancePendiente`: busca todos los
`DestinatarioNotificacion` con `activo: true` y notifica a cada uno por
su `tipo` (`email` vía Resend, `telegram` vía Bot API). No se agregó
ninguna colección ni configuración nueva — llega al mismo correo
institucional que ya recibe los demás avisos internos.

## NUEVO: Formulario empresarial (Empresas)

Primera versión, deliberadamente simple — **solo generación de leads**,
sin modelo de precios escalonado ni inscripción grupal real (decisión
explícita: evaluar demanda real antes de construir esa lógica).

- `routes/empresasRoutes.js` — `POST /api/empresas/contacto`, público
  (fuera de `protegerRuta`, es un formulario de contacto abierto en
  `/empresas`).
- `controllers/empresasController.js#enviarContactoEmpresarial` — valida
  que vengan `nombreEmpresa`, `contacto`, `telefono` y `email`, y llama a
  `enviarSolicitudEmpresarial`. **No persiste nada en Mongo** — si el
  correo falla o se pierde, no queda registro. Ver "Pendiente" más abajo.
- Montado en `app.js` como `app.use("/api/empresas", empresasRoutes)`.

## Scripts de mantenimiento (`scripts/`)

- **`purgarDatosPrueba.js`**: sin cambios, ya documentado. Corrido el
  06/08/2026.
- **`crearSesionesIniciales.js`**: **ya se ejecutó** (con `--confirmar`)
  — las 4 sesiones existen con títulos provisionales. Este cambio no se
  había registrado formalmente en la versión anterior de este documento;
  queda corregido aquí.

## Notas de diseño

- Ningún borrado es físico donde importa la integridad histórica:
  `Examen`, `ContenidoSesion` y `User` (vía `activo`) son siempre soft
  delete. `Diploma` no tiene ni necesita soft delete.
- Patrón de "entrega firmada al momento" para recursos `raw` de
  Cloudinary: nació con los diplomas, ahora también lo usa el PDF de
  material de estudio. Si en el futuro se necesita un tercer caso,
  replicar el mismo patrón (`generarUrlDescargaFirmada` +
  verificación manual de token) en vez de inventar uno nuevo.

## Pendiente real (backend)

- Prioridad #1: dominio propio verificado en Resend (bloqueado hasta
  reunión con la fundadora) — también bloquea que el formulario de
  Empresas llegue de verdad por correo.
- Terminar Telegram para el celular de la fundadora (`chat_id`, bloqueado
  hasta la misma reunión) — sería el canal de respaldo mientras Resend
  sigue bloqueado.
- Definir los 4 temas reales del curso con la fundadora, renombrar las
  sesiones (a mano vía `PATCH /sesiones/:numero` hasta que exista un
  formulario en el panel).
- Subir `ContenidoSesion` real (con PDFs de verdad, usando el flujo ya
  construido) y crear versiones de `Examen` para las 4 sesiones — todo
  sigue vacío.
- **NUEVO:** evaluar si el formulario de Empresas necesita persistir los
  leads en una colección (hoy solo se envían por correo/Telegram — si
  Resend falla o el mensaje se pierde entre notificaciones, no queda
  ningún registro). Bajo esfuerzo si se decide hacerlo, pospuesto a
  propósito por ahora.
- **NUEVO:** no existe una UI de admin para editar `Configuracion`
  (`precio_plan_normal`/`precio_plan_vip`) — hoy se cambian a mano en
  Atlas. Ahora que el precio también se muestra en el home público, un
  cambio de precio mal hecho ahí se refleja directo en el sitio; vale la
  pena construir un formulario simple en el panel de admin en algún
  momento.
- Decidir si vale la pena construir `POST /sesiones` (crear sesión desde
  el panel) o si el script de terminal es suficiente a largo plazo.
- Recordatorios por correo (examen disponible / voucher sin seguimiento):
  ideas a futuro, sin diseñar, falta resolver el disparador sin cron real.
- Seguridad/confiabilidad: rotar credenciales expuestas, rate limiting en
  login/verificar-diploma/**empresas/contacto** (formulario público
  nuevo, sin límite de envíos todavía), CORS dinámico, Sentry — al final,
  cuando la app esté más madura.
- Afinar el rol `backup_readonly` en Atlas de `readAnyDatabase@admin` a
  un rol Read específico sobre `mav_rd` (no urgente, es de solo lectura).