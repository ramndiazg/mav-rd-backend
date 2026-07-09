# Bitácora del Proyecto — Mujeres al Volante RD

> Este archivo se actualiza al final de cada bloque de trabajo importante.
> Contiene el historial de decisiones, lo que se hizo, lo que falta y el contexto
> necesario para que cualquier sesión futura (con Claude o con otro desarrollador)
> pueda continuar sin perder información.

---

## Cómo usar este archivo

- Cada sesión de trabajo se agrega como una nueva entrada al final (orden cronológico).
- No se borra historial anterior, solo se agrega.
- Antes de empezar una sesión nueva, leer las últimas 2-3 entradas + `DATABASE.md`,
  `BACKEND.md` y `FRONTEND.md` para tener contexto completo.
- Cada entrada debe responder: ¿qué se decidió?, ¿qué se construyó?, ¿qué falta?,
  ¿hay bloqueos o dudas pendientes?

---

## Resumen del proyecto

**Cliente:** Mujeres al Volante RD (fundación sin fines de lucro, fundada el 25/11/2017
por María Díaz, Santo Domingo, República Dominicana).

**Objetivo del sitio:** Digitalizar el proceso de inscripción, pago (manual/efectivo),
cursos teóricos (3 sesiones presenciales con soporte digital), exámenes, emisión de
diplomas, gestión de noticias/comunidad, y contabilidad interna básica.

**Restricción principal:** Todas las herramientas deben ser gratuitas (tier free) y
razonablemente simples de mantener por un solo desarrollador.

### Stack tecnológico confirmado

- **Base de datos:** MongoDB Atlas (tier gratuito, M0)
- **Backend:** Node.js + Express + Mongoose
- **Frontend:** Next.js, desplegado en Vercel (tier hobby gratuito)
- **Autenticación:** JWT propio (con roles: `estudiante`, `coordinadora`, `admin`)
- **Generación de PDF:** `pdf-lib` (diplomas y balances — más liviano) o `Puppeteer`
  si se necesita maquetado HTML→PDF más complejo. Se decide en la fase de implementación.
- **Almacenamiento de imágenes/archivos:** Cloudinary (tier gratuito)
- **Repos:** Dos repositorios separados en GitHub — `mav-rd-backend` y `mav-rd-frontend`

### Roles del sistema

1. **Estudiante** — se registra gratis, paga en efectivo (confirmado manualmente por
   coordinadora), accede al Aula Virtual solo tras pago confirmado.
2. **Coordinadora** — puede haber varias cuentas. Confirma pagos, desbloquea sesiones/
   exámenes de forma presencial y grupal, gestiona noticias, testimonios, FAQ, y genera
   diplomas de estudiantes que completaron el curso.
3. **Admin / Fundadora** — todo lo anterior + módulo de contabilidad completo
   (entradas, salidas, gastos, balances mensuales en PDF, historial).

### Mapa de secciones del sitio (confirmado)

**Públicas (sin login):**

- Inicio
- Acerca de Nosotros (historia de la fundación y de María Díaz)
- Kit de Preparación INTRANT (videos, libro descargable, link al examen de prueba INTRANT)
- Noticias (ver, dar like, comentar — comentar puede requerir estar registrado)
- Testimonios
- Preguntas Frecuentes (FAQ)
- Verificar Diploma (por código)
- Registro / Login

**Privadas — Estudiante:**

- Perfil / Dashboard (estado de pago, progreso de sesiones, notas, diploma si aplica)
- Aula Virtual (teoría + videos + examen, sesión por sesión, en orden, desbloqueada
  presencialmente por la coordinadora)

**Privadas — Coordinadora:**

- Panel de Coordinadora (confirmar pagos, desbloquear sesiones/exámenes, asignar
  versión de examen a cada estudiante)
- Gestión de Noticias (crear/editar/eliminar, moderar comentarios)
- Gestión de Testimonios (formulario CRUD)
- Gestión de FAQ (formulario CRUD)
- Generación de Diplomas (lista de estudiantes elegibles → generar PDF)

**Privadas — Admin/Fundadora:**

- Todo lo de Coordinadora, más:
- Contabilidad (entradas, salidas por categoría, pagos a empleados, balances
  mensuales automáticos + PDF, historial)
- Gestión de usuarias con rol coordinadora

### Paleta de marca (propuesta, pendiente validar con logo real)

- Azul institucional: `#1B3A6B`
- Azul claro: `#4A7FC9`
- Rosa institucional: `#D6336C`
- Rosa claro (fondos): `#FBE4EC`
- Fondo general: `#FFFFFF` / `#F7F8FA`
- Texto: `#1F2937`
- Éxito: `#2F9E44` — Alerta: `#F0A500`
- Tipografía: `Poppins` (títulos) + `Inter`/`Nunito Sans` (cuerpo)

---

## Reglas de negocio clave (para no perder de vista)

1. **Registro:** gratuito. Datos: nombre, apellido, cédula, teléfono, email, provincia,
   fecha de nacimiento, contraseña. Sin foto.
2. **Inscripción:** dos planes con precios distintos — `normal` y `vip`. El pago es en
   efectivo, lo confirma la coordinadora manualmente en el sistema. Sin pago confirmado
   → sin acceso al Aula Virtual (el registro en sí sí es gratis y no requiere pago).
3. **Sesiones:** 3 sesiones, en orden estricto. Cada una tiene teoría + videos + examen.
   El examen **no se autodesbloquea**: es presencial y grupal, la coordinadora lo
   desbloquea para cada estudiante en el momento de la clase.
4. **Exámenes:** 10 preguntas, banco de varias versiones por sesión (la coordinadora
   elige cuál asignar al desbloquear). Nota mínima para aprobar: 70%. Máximo 3 intentos;
   si se agotan, solo puede reintentar si la coordinadora vuelve a desbloquear.
   Tiempo límite: 30 minutos por examen.
5. **Diploma:** se emite un único diploma al completar y aprobar las 3 sesiones. Lo
   genera la coordinadora manualmente, eligiendo entre las estudiantes que ya completaron
   todo. Lleva: nombre, cédula, fecha, firma de la fundadora, logo, código de verificación
   único (verificable en página pública).
6. **Noticias:** texto + imágenes + video embebido + botones de compartir (Facebook,
   WhatsApp, X, Web Share API nativo para Instagram/TikTok vía sistema operativo).
   Like y comentarios habilitados para usuarias logueadas. Comentarios se publican
   directo (sin aprobación previa); coordinadora/admin pueden eliminar comentarios
   inapropiados, pero no editarlos.
7. **Contabilidad:** categorías de gasto = sueldos, materiales, transporte, publicidad,
   otros (sin alquiler). Balance mensual se calcula automáticamente a partir de los
   movimientos. Pagos de inscripción confirmados generan automáticamente una entrada
   contable. Debe existir historial de balances + exportación a PDF.

---

## Historial de sesiones de trabajo

### Sesión 1 — 02/07/2026 — Planificación y alcance

**Se hizo:**

- Revisión del sitio actual en Weebly (Inicio, Acerca de Nosotros, Aula Virtual) para
  contexto de marca y contenido existente.
- Definición completa de secciones públicas y privadas.
- Definición de roles y reglas de negocio (inscripción, pago, sesiones, exámenes,
  diplomas, noticias, contabilidad).
- Confirmación de stack tecnológico (MongoDB Atlas + Node/Express + Mongoose +
  Next.js/Vercel + JWT + Cloudinary).
- Propuesta de paleta de colores y tipografía institucional.
- Creación de documentos base: `BITACORA.md`, `DATABASE.md`, `BACKEND.md`,
  `FRONTEND.md`, `README.md`.

**Pendiente para la próxima sesión:**

- [ ] Confirmar interpretación de moderación de comentarios (asumido: publicación
      directa, borrado posterior por staff).
- [ ] Recibir logo oficial en alta resolución para ajustar paleta de colores exacta.
- [ ] Crear los dos repositorios en GitHub (`mav-rd-backend`, `mav-rd-frontend`).
- [ ] Definir monto exacto de inscripción `normal` vs `vip` (puede quedar configurable
      desde el panel de admin en vez de hardcodeado).
- [ ] Empezar investigación de contenido: Ley 63-17 de Tránsito Terrestre de RD y
      mejores prácticas de conducción, para la teoría de las 3 sesiones.
- [ ] Iniciar modelado de datos en MongoDB Atlas (crear cluster gratuito).
- [ ] Iniciar scaffolding del backend (Express + Mongoose + estructura de carpetas).
- [ ] Iniciar scaffolding del frontend (Next.js + Tailwind + paleta de marca).

**Dudas / decisiones abiertas:**

- ¿El monto de inscripción (`normal`/`vip`) debe ser editable por el admin desde el
  panel, o fijo en el código? (Recomendado: editable, se documentará como tal en
  `DATABASE.md` salvo objeción).

  ### Sesión 2 — 03/07/2026 — Backend: autenticación funcionando

  **Se hizo:**

- Scaffold inicial del backend: estructura de carpetas, conexión a MongoDB Atlas,
  modelo `User`, y flujo completo de autenticación (registro, login, JWT).
- Resuelto: el cluster de MongoDB Atlas es compartido con otra app existente.
  Solución: se usa una base de datos separada dentro del mismo cluster,
  agregando `/mav_rd` en el connection string antes del `?`. No hay riesgo de
  cruce de datos entre apps porque son bases de datos independientes.
- Probado con éxito vía curl: `/api/health`, `POST /api/auth/registro`,
  `POST /api/auth/login`. Todo responde correctamente.
- Commit y push realizados.

**Nota técnica importante:** el `MONGODB_URI` real está en `.env` (no se sube a
git). El cluster `mujeresalvolante.rd4sofa.mongodb.net` es compartido con otra
aplicación — nuestra app usa exclusivamente la base de datos `mav_rd` dentro de
ese cluster. La contraseña del usuario de base de datos se rotará antes de
pasar a producción.

**Pendiente para la próxima sesión:**

- [ ] Modelo `Inscripcion` + `Configuracion` (precios de planes normal/vip editables)
- [ ] Endpoint para que la coordinadora confirme pago en efectivo
- [ ] Endpoint para crear inscripción (elegir plan al momento de inscribir)
- [ ] Middleware de roles aplicado (solo coordinadora/admin pueden confirmar pagos)

### Sesión 3 — 03/07/2026 — Backend: inscripciones y pagos funcionando

**Se hizo:**

- Modelos `Configuracion`, `Inscripcion`, `ProgresoEstudiante`.
- Endpoints de configuración (precios de planes, editable solo por admin).
- Endpoints de inscripción: crear inscripción, confirmar pago (coordinadora/admin),
  listar inscripciones. Al confirmar el pago se crea automáticamente el registro
  de `ProgresoEstudiante` (arranca en sesionActualDesbloqueada: 0).
- Probado con éxito vía curl: creación de inscripción, confirmación de pago,
  verificación de permisos por rol (admin vs coordinadora vs estudiante).
- Middleware de roles (`permitirRoles`) confirmado funcionando correctamente.

**Pendiente para la próxima sesión:**

- [ ] Modelos `Sesion`, `Examen`, `IntentoExamen`
- [ ] Script de seed para las 3 sesiones base (contenido teórico real pendiente
      de investigación de la Ley 63-17 de Tránsito de RD)
- [ ] Endpoint para que la coordinadora desbloquee sesión/examen a una estudiante
- [ ] Endpoint para que la estudiante inicie y entregue un examen (con timer de 30 min)
- [ ] Lógica de 3 intentos máximo y actualización de progreso al aprobar

### Sesión 4 — 03/07/2026 — Backend: módulo de Diplomas completo

**Se hizo:**

- Modelos `Sesion`, `Examen`, `IntentoExamen`, `Diploma`.
- Script de seed para las 3 sesiones base (contenido teórico pendiente de
  investigación de la Ley 63-17 — placeholder por ahora).
- Endpoints de sesiones (ver/editar), exámenes (crear versiones, desbloquear a
  estudiante), intentos de examen (iniciar/entregar con cálculo de nota).
- Endpoints de diplomas: listar elegibles, generar (PDF con pdf-lib + subida a
  Cloudinary + código de verificación único), verificación pública sin login.
- **Probado con éxito el ciclo completo end-to-end**: registro → inscripción →
  confirmación de pago → 3 sesiones desbloqueadas/aprobadas → diploma generado
  con PDF real accesible en Cloudinary → verificación pública del código.
- Confirmado: reglas de negocio funcionando (orden estricto de sesiones, límite
  de 3 intentos, nota mínima 70%, diploma requiere `cursoCompletado: true`).

**Pendiente para la próxima sesión:**

- [ ] Módulo de Noticias (CRUD + likes + comentarios)
- [ ] Módulo de Testimonios (CRUD desde panel de coordinadora)
- [ ] Módulo de FAQ (CRUD desde panel de coordinadora)
- [ ] Módulo de Contabilidad (movimientos, balances mensuales automáticos + PDF)
- [ ] Backend queda completo después de estos 4 módulos — arrancar frontend

### Sesión 5 — 03/07/2026 — Backend: módulo de Noticias completo

**Se hizo:**

- Modelo `Noticia` (con comentarios embebidos y likes por referencia a usuarias).
- Endpoint genérico de subida de imágenes a Cloudinary (`/api/uploads/imagen`),
  reutilizable para noticias y testimonios.
- CRUD completo de noticias (público en lectura, coordinadora/admin en escritura).
- Likes (toggle) y comentarios abiertos a cualquier usuaria autenticada;
  eliminación de comentarios restringida a coordinadora/admin.
- Se actualizó `multer` de 1.x a 2.x por vulnerabilidades conocidas en la
  versión anterior (advertencia de npm).
- Probado con éxito: creación de noticia vía curl.

**Pendiente para la próxima sesión:**

- [ ] Módulo de Testimonios (CRUD desde panel de coordinadora)
- [ ] Módulo de FAQ (CRUD desde panel de coordinadora)
- [ ] Módulo de Contabilidad (movimientos, balances mensuales automáticos + PDF)
- [ ] Backend queda completo después de estos 3 módulos — arrancar frontend

Sesión 6 — 04/07/2026 — Backend COMPLETO + preparación para frontend

Se hizo:

Módulo de Testimonios y FAQ (CRUD, patrón idéntico entre sí).
Módulo de Contabilidad: movimientos, balances mensuales (con PDF vía
Cloudinary), y conexión automática pago-confirmado → movimiento contable.
Módulo de Usuarios (nuevo, cerraba un vacío funcional):
GET /api/usuarios (búsqueda por rol/nombre/cédula/email — necesario para que
la coordinadora encuentre estudiantes al inscribir/generar diplomas),
POST /api/usuarios/coordinadora (admin crea cuentas de coordinadora sin
tener que hacerlo a mano en Atlas), PATCH /:id/estado y PATCH /:id/rol.
Backend queda en 9 módulos completos: auth, usuarios, configuración,
inscripciones, sesiones/exámenes/intentos/progreso, diplomas, uploads,
noticias, testimonios, FAQ, contabilidad. 52 archivos fuente, todos
verificados por sintaxis y resolución de imports.
Documentación regenerada para reflejar el estado REAL (no el plan inicial):
BACKEND_ACTUALIZADO.md (reemplaza a Arquitectura_Backend.md como fuente
de verdad) y FRONTEND_CORRECCION_AUTH.md (corrige un error de diseño en
Arquitectura_Frontend.md: el backend NO usa cookies, usa Bearer token).

IMPORTANTE — corrección de arquitectura antes de tocar el frontend:
El documento original de frontend asumía JWT en cookie httpOnly + middleware
de Next.js. Eso no se implementó así. El backend real devuelve el token en el
body y espera Authorization: Bearer <token>. Ver FRONTEND_CORRECCION_AUTH.md
para la estrategia correcta (Context + localStorage + componente de ruta
protegida en cliente, no middleware de servidor).

Estado de las pruebas manuales (con curl) — todas exitosas:

Ciclo completo estudiante: registro → inscripción → confirmación de pago →
3 sesiones desbloqueadas y aprobadas → diploma generado con PDF real en
Cloudinary → verificación pública del código. ✅
Permisos por rol (admin/coordinadora/estudiante) rechazando correctamente
accesos indebidos. ✅
Noticias: creación confirmada. Testimonios/FAQ: no probados por curl pero
siguen el mismo patrón ya validado en otros módulos — probar con el frontend.
Contabilidad: probado movimiento manual + balance generado correctamente.
Pendiente de confirmar: que el movimiento automático se dispare al
confirmar un pago NUEVO (el primero que probamos fue anterior a que existiera
esa lógica, por eso no apareció en el balance — no es un bug, es orden
cronológico de cuándo se escribió el código).
Usuarios (nuevo): no probado aún, hacerlo apenas se retome el proyecto.

Datos de prueba que existen en la base de datos Atlas (mav_rd) ahora mismo:

maria@test.com / 12345678 — rol admin (cuenta de la fundadora de prueba)
ana@test.com / 12345678 — rol coordinadora
estudiante@test.com / 12345678 — rol estudiante, curso completo, diploma
emitido (código MAV-2026-000001)
3 sesiones creadas por el seed, con teoría placeholder (pendiente contenido real)
3 exámenes de prueba (Sesión 1, 2 y 3), con preguntas ficticias "P1"—"P10"
de una sola opción correcta (índice 0) — hay que borrar o reemplazar estos
exámenes de prueba antes de producción, son solo para testing.
1 noticia de prueba, 1 balance mensual de julio 2026 con datos parciales
(afectado por el orden cronológico explicado arriba)

Pendiente real para producción (no bloquea el inicio del frontend, pero no
hay que olvidarlo):

Contenido teórico real de las 3 sesiones (Ley 63-17 de Tránsito RD +
buenas prácticas de conducción) — investigación pendiente
Reemplazar exámenes de prueba por preguntas reales
Rotar la contraseña del usuario de MongoDB Atlas antes de producción
(el cluster es compartido con otra app del desarrollador)
Recuperación de contraseña (no existe todavía)
Logo oficial en alta resolución para ajustar la paleta de colores exacta
Decidir montos reales de precio_plan_normal y precio_plan_vip

### Sesión 7 — 05/07/2026 — Revisión de arquitectura: corrección de vacíos de lógica

**Contexto:** sesión de pausa antes de retomar el Aula Virtual en el frontend
(iban por la Sesión 5/frontend, viendo `BITACORA_FRONTEND.md`). Se aprovechó
para revisar los 5 documentos de arquitectura completos y corregir todo lo
detectado antes de seguir codeando, en vez de arreglarlo a mitad de una feature.

**Se decidió (documentación actualizada en `Arquitectura_Backend.md`,
`DATABASE.md` y `Arquitectura_Frontend.md`, léelos para el detalle completo):**

1. La estudiante no podía recuperar el `id` de su `IntentoExamen` → nuevo
   `GET /api/intentos-examen/activo/:sesionId`.
2. `sesionActualDesbloqueada` arranca en 0 y nada lo subía a 1 al pagar →
   se confirmó que era un bug real (no solo documentación desactualizada) y
   se corrigió: `confirmar-pago` ahora lo inicializa en 1 con `$setOnInsert`.
3. La estudiante no podía ver su propio estado de pago → nuevo
   `GET /api/inscripciones/me`.
4. No estaba definido quién elige la versión de examen al desbloquear →
   se cambió el diseño: el backend elige al azar entre versiones activas de
   la sesión (`POST /api/examenes/:sesionId/desbloquear`, antes recibía
   `examenId`). La coordinadora ya no elige versión, solo decide cuándo
   desbloquear.
5. Faltaba poder editar el banco de preguntas cuando cambie la ley de tránsito
   → nuevos `PATCH /api/examenes/:id` y `DELETE /api/examenes/:id` (borrado
   lógico, para no romper intentos históricos).
6. Faltaba endpoint de cambiar contraseña (logueada) → nuevo
   `PATCH /api/auth/cambiar-password`. La recuperación sin sesión sigue
   pendiente (requiere email, fuera de alcance por ahora).
7. Faltaba una forma de que la fundadora edite el texto estático de las
   páginas públicas (Inicio, Acerca de, Kit, Contacto) sin pedir despliegue →
   nuevo módulo `contenidoPagina` + `/api/contenido` (mismo patrón que
   `configuracion`, que ya se usaba para los precios). Se sembró con el
   contenido real ya publicado en el Weebly (incluyendo los 21 módulos de
   video del Kit de Preparación, no solo 3 como se había asumido al inicio).
8. `Arquitectura_Frontend.md` tenía una sección vieja contradictoria que
   todavía hablaba de JWT en cookie httpOnly + middleware de servidor — se
   eliminó, queda solo la versión real (Context + localStorage + `RutaProtegida`).
9. Verificado: el código de verificación de diploma YA usaba
   `new Date().getFullYear()` dinámicamente — no era un bug real, solo una
   suposición equivocada durante la revisión inicial. No se tocó.

**✅ Implementado, probado y desplegado (05-06/07/2026):**

- Los 8 archivos de backend modificados/nuevos (`inscripcionController.js`,
  `inscripciones.js`, `examenController.js`, `examenes.js`,
  `intentoExamenController.js`, `intentosExamen.js`, `authController.js` +`cambiarPassword`, `ContenidoPagina.js` + `contenidoController.js` +
  `contenido.js`) ya están en el código real.
- Bug encontrado y corregido durante la implementación: al agregar
  `cambiarPassword` al `authController.js`, el `module.exports` no se
  actualizó y causó `Route.patch() requires a callback function but got
undefined` al arrancar — corregido agregando `cambiarPassword` al export.
- Probado con curl en local los 4 endpoints nuevos: `cambiar-password`,
  `inscripciones/me`, `examenes/:sesionId/desbloquear` (rechazó bien un
  intento de saltar de la Sesión 0 a la 2, y desbloqueó correctamente la
  Sesión 1 asignando un examen al azar), y `intentos-examen/activo/:sesionId`.
  Los 4 respondieron correctamente.
- Nota de dato de prueba: las cuentas de prueba viejas (`ana@test.com`, etc.)
  quedaron con `sesionActualDesbloqueada` en 0 porque se crearon antes del
  fix — el fix solo aplica a inscripciones confirmadas de ahora en adelante,
  no corrige retroactivamente. **No es un bug, es esperado.**
- Push a GitHub y deploy manual en Render completado — servicio corriendo sin
  errores (`✅ MongoDB conectado` / `🚀 Servidor corriendo`).
- `node src/utils/seedContenido.js` corrido una vez contra la base real de
  Atlas — el script se desconecta solo al terminar, no importa si se cierra
  la terminal después.

**Pendiente para más adelante (no urgente):**

- [ ] Corregir `sesionActualDesbloqueada` de las cuentas de prueba viejas que
      quedaron en 0 con pago ya confirmado (solo afecta datos de prueba, no
      usuarias reales nuevas)
- [ ] Reemplazar exámenes de prueba por preguntas reales ahora que el banco
      soporta PATCH/DELETE
- [x] Retomar el Aula Virtual del frontend con el backend ya corregido —
      hecho, ver `BITACORA_FRONTEND.md` Sesión 6

### Sesión 8 — 06/07/2026 — Backend: endpoint de diploma propio de la estudiante

Mientras se construía la página `app/(estudiante)/diploma/page.tsx` en el
frontend, se detectó el mismo tipo de vacío que ya habíamos resuelto antes con
`inscripciones/me`: los endpoints de diplomas (`GET /elegibles`,
`POST /:userId/generar`, `GET /verificar/:codigo`) son todos para
coordinadora/admin o público — no había forma de que la propia estudiante
viera su diploma.

**Se agregó:** `GET /api/diplomas/me` (estudiante) — devuelve su propio
diploma, o 404 si todavía no se ha generado. Implementado, y el backend
desplegó sin errores en Render tras el push.

**Pendiente para más adelante:**

- [ ] Probar el flujo completo diploma (coordinadora genera → estudiante lo
      ve) con una cuenta que de verdad complete y apruebe las 3 sesiones desde
      el navegador — no se alcanzó a hacer en esta sesión porque ninguna
      cuenta de prueba tenía `cursoCompletado: true` todavía.

---

### Sesión 9 — 07/07/2026 — Contenido de estudio + auto-desbloqueo de examen, y fix del diploma PDF

**Contexto:** después de que el frontend construyera todo el panel de
coordinadora/admin (Sesión 7/8 de frontend), surgieron 8 puntos de mejora al
usar la app de verdad. Dos de ellos tocaron el backend a fondo.

**1) Arquitectura nueva — contenido de estudio con auto-desbloqueo (decisión
tomada con la persona, no asumida):** antes, el examen se desbloqueaba
exclusivamente por acción manual de la coordinadora, sin relación con si la
estudiante había estudiado algo. Se decidió que el examen debía desbloquearse
**automáticamente** al terminar de consumir el contenido de estudio de la
sesión. Esto requirió:

- Modelo nuevo `ContenidoSesion` (materiales por sesión: video/pdf/enlace/texto).
- `ProgresoEstudiante` gana `contenidosVistos: [ObjectId]`.
- La lógica de desbloqueo de `examenController.js` se extrajo a una función
  interna reutilizable, `intentarDesbloquear()` — no es un endpoint, es una
  función de JS que llaman tres caminos distintos: el endpoint manual de la
  coordinadora (que ahora es solo un override/excepción, ya no el camino
  normal), el auto-disparo desde `POST /api/contenido-sesion/:id/marcar-visto`
  cuando la estudiante termina todo el contenido, y el nuevo endpoint de
  autoservicio `POST /api/intentos-examen/reintentar/:sesionId` (para que la
  estudiante pida otro intento después de reprobar sin depender de la
  coordinadora, ya que el contenido no hay que volver a verlo).
- Nuevos endpoints: `GET/POST/PATCH/DELETE /api/contenido-sesion` (CRUD,
  coordinadora/admin), `POST /:id/marcar-visto` (estudiante),
  `GET /api/intentos-examen/historial/:sesionId` (estudiante, para saber si
  mostrar el botón de reintento), `GET /api/intentos-examen/estudiante/:userId`
  (coordinadora/admin, para el panel "Estudiantes" del frontend).
- `routes/intentosExamen.js` se reestructuró: ya no es 100% estudiante, ahora
  mezcla roles por ruta (como ya se había hecho antes con `inscripciones.js`).

**2) Bug corregido — diploma se descargaba como archivo genérico, no `.pdf`:**
la causa estaba en `utils/cloudinaryUpload.js`, no en `pdfGenerator.js` (que
genera un PDF válido sin problema). El `public_id` se mandaba sin extensión
(`diploma-MAV-2026-000123` en vez de `...pdf`), así que la URL final de
Cloudinary tampoco la tenía y el navegador no reconocía el tipo de archivo al
descargar. `subirBuffer()` ahora agrega la extensión automáticamente cuando
`resourceType` es `raw` y el nombre no trae una ya.

**⚠️ Pendiente real:** el diploma de prueba generado _antes_ de este fix quedó
mal guardado en Cloudinary — hay que borrar ese documento `Diploma` en Atlas
y regenerarlo para esa estudiante en particular. No se corrige solo.

**Implementado, y confirmado funcionando por la persona** (contenido +
auto-desbloqueo probado en el navegador de punta a punta).

**Pendiente para más adelante:**

- [ ] Regenerar el diploma de prueba que quedó mal con el bug viejo
- [ ] Conectar `kit-preparacion/page.tsx` y `contacto` (si existe como página
      separada) a `contenidoPagina`, igual que ya se hizo con Inicio y
      Acerca de Nosotros
- [ ] `admin/contabilidad/page.tsx` ya se construyó del lado de frontend en
      paralelo a esta sesión — confirmar que los endpoints de `/api/contabilidad`
      siguen sin cambios (no se tocaron en esta sesión)

---

🚀 CÓMO ARRANCAR LA SESIÓN DE FRONTEND (sin contexto de este chat)

Si estás leyendo esto desde una conversación nueva sin el historial anterior,
esto es lo que necesitas saber:

Lee en este orden: este archivo completo → BACKEND_ACTUALIZADO.md →
FRONTEND_CORRECCION_AUTH.md → DATABASE.md (esquema de datos) →
Arquitectura_Frontend.md (estructura de páginas, ES el plan válido EXCEPTO
la sección de autenticación, ya corregida en el archivo aparte).
Stack confirmado: Next.js + Tailwind, desplegado en Vercel (gratis).
Paleta de marca: azul #1B3A6B, rosa #D6336C (ver Arquitectura_Frontend.md
para la paleta completa). Tipografía: Poppins (títulos) + Inter (cuerpo).
El backend ya está desplegado? Verificar con la persona si el backend
corre en local (http://localhost:4000) o si ya se desplegó a algún hosting
gratuito (Render, Railway, Fly.io) — el proyecto no lo ha hecho todavía, así
que probablemente haya que desplegarlo antes o en paralelo al frontend, o
trabajar contra localhost:4000 mientras se desarrolla.
Usar las cuentas de prueba de la tabla de arriba para probar cada rol.
Repos: mav-rd-backend (todo el código + toda la documentación vive
aquí) y mav-rd-frontend (solo el frontend). Ambos en GitHub, ya clonados
localmente por la persona.
Primera pregunta a hacerle a la persona al empezar: "¿el backend sigue
corriendo igual que lo dejamos, o hiciste cambios? ¿quieres que empecemos
por la página de Login+Registro, o prefieres el layout general (Navbar,
Footer, Home) primero?" — no asumir, confirmar antes de generar código.
