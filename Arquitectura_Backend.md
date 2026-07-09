Arquitectura del Backend — mav-rd-backend

Stack: Node.js + Express + Mongoose (MongoDB Atlas) + JWT + Cloudinary (pdf-lib para PDFs)

Este documento refleja la implementación REAL y probada del backend, no el plan
inicial. Es la fuente de verdad para construir el frontend.

Estructura de carpetas

mav-rd-backend/
├── src/
│ ├── config/
│ │ ├── db.js
│ │ └── cloudinary.js
│ ├── models/
│ │ ├── User.js, Inscripcion.js, Configuracion.js, Sesion.js, Examen.js,
│ │ │ IntentoExamen.js, ProgresoEstudiante.js, Diploma.js, Noticia.js,
│ │ │ Testimonio.js, FAQ.js, MovimientoContable.js, BalanceMensual.js
│ ├── controllers/ (uno por recurso, mismos nombres que los modelos)
│ ├── routes/ (uno por recurso)
│ ├── middleware/
│ │ ├── auth.js → protegerRuta (verifica JWT), permitirRoles(...roles)
│ │ ├── upload.js → multer en memoria, solo imágenes, máx 5MB
│ │ └── errorHandler.js
│ ├── utils/
│ │ ├── pdfGenerator.js → generarDiplomaPDF, generarBalancePDF
│ │ ├── cloudinaryUpload.js → subirBuffer(buffer, {folder, resourceType, filename})
│ │ ├── verificationCode.js → generarCodigoVerificacion (formato MAV-2026-000001)
│ │ └── seedSesiones.js → script, correr una vez: node src/utils/seedSesiones.js
│ ├── app.js
│ └── server.js
├── .env (no se sube — ver .env.example)
└── package.json

🔑 AUTENTICACIÓN — IMPORTANTE PARA EL FRONTEND

El backend NO usa cookies. El login devuelve un JWT en el body de la respuesta:

json{ "success": true, "data": { "usuario": {...}, "token": "eyJ..." } }

El frontend debe:

Guardar el token (recomendado: localStorage o estado en memoria + sessionStorage).
Enviarlo en cada request protegido como header: Authorization: Bearer <token>.
El token expira en 7 días (configurable vía JWT_EXPIRES_IN).
No hay endpoint de "refresh token" — al expirar, la usuaria debe volver a loguearse.
Para saber si una sesión sigue siendo válida al cargar la app, llamar a
GET /api/auth/perfil con el token guardado; si responde 401, redirigir a login.

Roles: estudiante, coordinadora, admin. El registro público (/api/auth/registro)
siempre crea cuentas con rol estudiante — no hay forma de auto-registrarse como
coordinadora o admin (por diseño, es una medida de seguridad). Las cuentas de
coordinadora las crea la fundadora (admin) vía POST /api/usuarios/coordinadora.

Convención de respuestas

Todas las respuestas son JSON con la forma:

json{ "success": true, "data": {...} }
{ "success": false, "error": "mensaje en español, listo para mostrar al usuario" }

Referencia completa de endpoints

Auth (/api/auth)

MétodoRutaRolDescripciónPOST/registropúblicoCrea cuenta de estudiantePOST/loginpúblicoDevuelve { usuario, token }GET/perfilautenticadaDatos del usuario del token actualPATCH/cambiar-passwordautenticadaBody { passwordActual, passwordNueva }

> ⚠️ "Olvidé mi contraseña" (sin sesión iniciada) sigue sin existir — requiere
> servicio de email y queda fuera del alcance actual. `cambiar-password` es
> distinto: solo sirve si la usuaria ya puede loguearse.

Usuarios (/api/usuarios)

MétodoRutaRolDescripciónGET/?rol=&search=&activo=coordinadora, adminBuscar usuarias (para elegir estudiante al inscribir)POST/coordinadoraadminCrear cuenta de coordinadoraPATCH/:id/estadoadminBody { activo: bool }PATCH/:id/roladminBody { rol }

Configuración (/api/configuracion)

MétodoRutaRolDescripciónGET/público{ precio_plan_normal, precio_plan_vip }PATCH/:claveadminBody { valor }

Inscripciones (/api/inscripciones)

MétodoRutaRolDescripciónPOST/coordinadora, adminBody { userId, tipoPlan: 'normal'|'vip', monto }GET/?estadoPago=coordinadora, adminListar (con datos de la estudiante poblados)GET/meestudianteSu propia inscripción (o null si no se ha inscrito) — así el dashboard sabe su estado de pago sin inferir nadaPATCH/:id/confirmar-pagocoordinadora, adminMarca pagado, crea ProgresoEstudiante y un MovimientoContable automático

> **Regla formal (antes era un supuesto sin confirmar):** al confirmar el pago,
> el `ProgresoEstudiante` que se crea DEBE inicializar `sesionActualDesbloqueada: 1`.
> Si se crea en `0`, la estudiante paga y no puede ver ni la teoría de la
> Sesión 1 (`GET /api/sesiones/:numero` exige `numero <= sesionActualDesbloqueada`).
> Verificar esto en el código existente antes de dar por hecho que ya funciona así.

Sesiones (/api/sesiones)

MétodoRutaRolDescripciónGET/coordinadora, adminLas 3 sesiones completas (gestión)GET/:numeroestudianteSolo si numero <= sesionActualDesbloqueadaPATCH/:numeroadminEditar teoría/videos

Exámenes (/api/examenes) — banco de preguntas por sesión

MétodoRutaRolDescripciónPOST/coordinadora, adminCrear versión: { sesionId, nombreVersion, preguntas: [10 exactas] }GET/sesion/:sesionIdcoordinadora, adminVersiones disponibles de esa sesión (para mantenimiento del banco)PATCH/:idcoordinadora, adminEditar preguntas/opciones/respuesta correcta de una versión existente (ej. si cambia la Ley 63-17)DELETE/:idadminBorrado lógico (`activo: false`), NUNCA borrado físico — los `IntentoExamen` históricos siguen referenciando ese `examenId`POST/:sesionId/desbloquearcoordinadora, admin**Override manual** — ver nota abajo, ya no es el camino normal

> **Cambio de diseño respecto a la versión anterior:** antes la coordinadora
> elegía manualmente `examenId` al desbloquear. Ahora la ruta recibe `sesionId`
> y el backend asigna al azar una versión activa. La fundadora (admin)
> mantiene el banco de preguntas actualizado con PATCH/DELETE cuando cambie la ley.

> **Cambio de diseño más grande (posterior):** el desbloqueo del examen dejó
> de ser manual como camino normal. Ahora es **automático**: cuando la
> estudiante marca como visto el último material de `contenidoSesion` de una
> sesión, el backend desbloquea el examen solo (ver módulo `contenidoSesion`
> abajo). `POST /:sesionId/desbloquear` sigue existiendo pero es una
> **excepción/override** para la coordinadora — casos donde se necesita
> forzar el desbloqueo sin pasar por el contenido.
>
> La lógica real de desbloqueo (orden estricto, límite de 3 intentos, azar de
> versión, no duplicar si ya hay un intento activo) vive en una función
> interna reutilizable, `intentarDesbloquear()`, en `examenController.js` —
> la usan tres caminos distintos: este endpoint manual, el auto-desbloqueo de
> `contenidoSesion`, y el reintento de autoservicio de la estudiante (ver
> abajo). No es un endpoint propio, es una función de JS que cualquier
> controller puede importar y llamar directamente.

Contenido de Estudio por Sesión (/api/contenido-sesion) — NUEVO

Los materiales que la estudiante consume antes de que el examen se habilite.
Reemplaza la idea original de que el examen se desbloqueaba puramente por
acción manual de la coordinadora — ahora el consumo de contenido es lo que
dispara el desbloqueo.

MétodoRutaRolDescripciónGET/sesion/:sesionIdestudiante, coordinadora, adminMateriales activos de una sesión (lo que ve la estudiante para estudiar)GET/admin/sesion/:sesionIdcoordinadora, adminTodos los materiales de una sesión, incluidos inactivos (gestión)POST/coordinadora, adminCrear material: { sesionId, titulo, tipo: 'video'\|'pdf'\|'enlace'\|'texto', url?, contenidoTexto?, orden? }PATCH/:idcoordinadora, adminEditar un materialDELETE/:idadminBorrado lógico (`activo: false`)POST/:id/marcar-vistoestudianteMarca un material como visto. **Si con este ya vio TODOS los materiales activos de la sesión, dispara `intentarDesbloquear()` automáticamente** — sin que la coordinadora haga nada. Responde `{ contenidoId, examenDesbloqueado: bool }`

Intentos de examen (/api/intentos-examen)

MétodoRutaRolDescripciónGET/activo/:sesionIdestudianteDevuelve el intento sin entregar (`fechaFin: null`) más reciente de la estudiante para esa sesión — así el frontend obtiene el `id` que necesita para iniciar/entregar. 404 si no hay ninguno pendienteGET/historial/:sesionIdestudianteTodos sus intentos (entregados o no) de esa sesión — para que el frontend sepa si mostrar el botón de reintentoPOST/reintentar/:sesionIdestudiante**NUEVO** — autoservicio: si reprobó y le quedan intentos, la propia estudiante pide otro intento sin pasar por la coordinadora (ya vio el contenido la primera vez, no tiene sentido pedírselo de nuevo). Usa la misma `intentarDesbloquear()` internaPOST/:id/iniciarestudianteArranca el timer, devuelve preguntas SIN respuesta correctaPOST/:id/entregarestudianteBody { respuestas: [10 índices] } → califica (≥70% aprueba)GET/estudiante/:userIdcoordinadora, admin**NUEVO** — todos los intentos de una estudiante en todas las sesiones (con `sesionId` poblado), para el panel "Estudiantes"

> Este `GET /activo/:sesionId` es lo que cierra el vacío detectado antes de
> construir el Aula Virtual: sin él, la estudiante no tenía forma de saber el
> `id` de su propio intento.

Progreso (/api/progreso)

MétodoRutaRolDescripciónGET/meestudianteSu propio progresoGET/:userIdcoordinadora, adminProgreso de una estudiante

> `ProgresoEstudiante` ahora también guarda `contenidosVistos` (array de ids
> de `ContenidoSesion` ya vistos) — ver `DATABASE.md`.

Diplomas (/api/diplomas)

MétodoRutaRolDescripciónGET/meestudianteSu propio diploma (404 si todavía no se ha generado)GET/elegiblescoordinadora, adminEstudiantes con curso completo sin diploma aúnPOST/:userId/generarcoordinadora, adminGenera PDF + código, sube a CloudinaryGET/verificar/:codigopúblicoVerificación pública del diploma

> **Bug corregido:** el diploma se descargaba como un archivo genérico
> ("file") en vez de `.pdf`. La causa estaba en `utils/cloudinaryUpload.js`:
> el `public_id` se mandaba sin extensión (`diploma-MAV-2026-000123` en vez
> de `...pdf`), así que la URL final de Cloudinary tampoco la tenía y el
> navegador no reconocía el tipo de archivo al descargar. Corregido para que
> `subirBuffer()` agregue automáticamente la extensión cuando el
> `resourceType` es `raw` y el nombre no trae una. Los diplomas generados
> _antes_ de este fix quedaron mal en Cloudinary y hay que regenerarlos
> (borrar el documento `Diploma` viejo en Atlas y generar de nuevo).

Uploads (/api/uploads)

MétodoRutaRolDescripciónPOST/imagencoordinadora, adminmultipart/form-data, campo imagen → { url }

Noticias (/api/noticias)

MétodoRutaRolDescripciónGET/públicoTodas, con autor y comentarios pobladosGET/:idpúblicoDetallePOST/coordinadora, admin{ titulo, contenido, imagenUrl?, videoEmbedUrl? }PATCH/:idcoordinadora, adminEditarDELETE/:idcoordinadora, adminEliminarPOST/:id/likecualquier autenticadaTogglePOST/:id/comentarioscualquier autenticada{ texto }, se publica directoDELETE/:id/comentarios/:comentarioIdcoordinadora, adminEliminar comentario

Testimonios (/api/testimonios)

MétodoRutaRolDescripciónGET/públicoSolo activosGET/admincoordinadora, adminTodos (incluye inactivos)POST /, PATCH /:id, DELETE /:idcoordinadora, adminCRUD

FAQ (/api/faqs) — mismo patrón que Testimonios

Contenido de Página (/api/contenido) — NUEVO

Cubre todo el texto/enlaces estáticos del sitio (Inicio, Acerca de Nosotros, Kit
de Preparación, Contacto/redes) que antes vivía hardcodeado en el frontend. Con
esto la fundadora edita el contenido de la página sin depender de un despliegue.

MétodoRutaRolDescripciónGET/públicoTodos los bloques { clave, valor, tipo }GET/:clavepúblicoUn bloque específicoPOST/adminCrear un bloque nuevo { clave, valor, tipo } (para cuando se necesite uno que no existía)PATCH/:claveadminActualizar el valor de un bloque existente

Claves iniciales sugeridas: `inicio_hero_titulo`, `inicio_hero_texto`,
`acerca_de_historia`, `acerca_de_fundadora`, `kit_video_urls` (tipo `json`),
`kit_libro_url`, `kit_intrant_url`, `contacto_telefono`, `contacto_email`,
`contacto_direccion`, `redes_facebook`, `redes_instagram`, `redes_whatsapp`.

> Noticias, testimonios, FAQ y comentarios ya tenían CRUD para coordinadora/admin
> — eso ya estaba bien resuelto. Lo que faltaba era el contenido _estático_ de
> las páginas públicas, que es lo que resuelve este módulo nuevo.

Contabilidad (/api/contabilidad) — todo exclusivo de admin

MétodoRutaDescripciónPOST/movimientos{ tipo, categoria, monto, descripcion?, fecha? }GET/movimientos?mes=&anio=&tipo=&categoria=Listar/filtrarPOST/balances/generar{ mes, anio } → recalcula, genera PDF, guarda (upsert por mes/año)GET/balancesHistorial completoGET/balances/:idUn balance específico

Reglas de negocio ya implementadas (no reinventar en el frontend)

Orden estricto de sesiones: no se puede desbloquear la sesión N+2 sin haber
desbloqueado la N+1 primero.
Máximo 3 intentos por sesión; el backend lo rechaza automáticamente al 4to.
Nota mínima 70% para aprobar (calculado en el backend, no confiar en el frontend).
Diploma requiere ProgresoEstudiante.cursoCompletado === true (las 3 aprobadas).
Un pago confirmado genera automáticamente un MovimientoContable de tipo
entrada/categoría inscripcion — el frontend de contabilidad no debe
duplicar esto manualmente.
Los balances mensuales son "upsert": generar de nuevo el mismo mes/año lo
reemplaza (útil si se corrige un movimiento a posteriori).
**NUEVO:** el examen se desbloquea automáticamente cuando la estudiante
termina de ver todo el contenido activo de `contenidoSesion` de esa sesión —
la coordinadora ya no tiene que desbloquearlo manualmente en el flujo normal
(el endpoint manual sigue existiendo solo como excepción/override).

Pendiente de implementar (NO existe todavía)

Recuperación de contraseña ("olvidé mi contraseña", sin sesión) — requiere
servicio de email, queda fuera de alcance por ahora. (Cambiar contraseña
estando logueada SÍ existe: PATCH /api/auth/cambiar-password.)
Paginación real en listados largos (noticias, movimientos) — hoy se listan
todos sin límite salvo /api/usuarios que sí tiene límite de 50.
Notificaciones (email/SMS) de ningún tipo.
Contenido teórico real de las 3 sesiones (Ley 63-17 y buenas prácticas) —
hoy son placeholders, se editan con PATCH /api/sesiones/:numero.

Correcciones de esta sesión de revisión (antes de continuar codeando)

Estos son los puntos que se detectaron como vacíos de lógica o inconsistencias
y quedaron resueltos en este mismo documento (ver secciones correspondientes):

1. recuperación del id del IntentoExamen por la estudiante, 2) inicialización
   de sesionActualDesbloqueada al confirmar pago, 3) endpoint GET /inscripciones/me,
2. asignación al azar de versión de examen + PATCH/DELETE para mantenerlas,
3. endpoint de cambio de contraseña, 6) módulo de contenido de página editable,
4. código de verificación de diploma con año dinámico (ver nota abajo).

Nota — código de verificación de diploma: `verificationCode.js` debe generar
el año con `new Date().getFullYear()`, no con `2026` hardcodeado. Revisar el
archivo real y corregirlo si sigue fijo (los diplomas de prueba actuales usan
`MAV-2026-000001`, lo cual es correcto solo porque coincide con el año real).

Testing

Antes de cualquier cambio importante: npm run dev local + probar con curl o
Postman los endpoints tocados. El flujo completo (registro → inscripción → pago
→ 3 sesiones → diploma → verificación) ya fue probado end-to-end exitosamente.
