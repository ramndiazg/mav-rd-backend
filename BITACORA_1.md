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
