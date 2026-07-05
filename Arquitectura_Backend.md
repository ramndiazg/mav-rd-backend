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

⚠️ "Olvidé mi contraseña" (sin sesión iniciada) sigue sin existir — requiere
servicio de email y queda fuera del alcance actual. cambiar-password es
distinto: solo sirve si la usuaria ya puede loguearse.

Usuarios (/api/usuarios)

MétodoRutaRolDescripciónGET/?rol=&search=&activo=coordinadora, adminBuscar usuarias (para elegir estudiante al inscribir)POST/coordinadoraadminCrear cuenta de coordinadoraPATCH/:id/estadoadminBody { activo: bool }PATCH/:id/roladminBody { rol }

Configuración (/api/configuracion)

MétodoRutaRolDescripciónGET/público{ precio_plan_normal, precio_plan_vip }PATCH/:claveadminBody { valor }

Inscripciones (/api/inscripciones)

MétodoRutaRolDescripciónPOST/coordinadora, adminBody { userId, tipoPlan: 'normal'|'vip', monto }GET/?estadoPago=coordinadora, adminListar (con datos de la estudiante poblados)GET/meestudianteSu propia inscripción (o null si no se ha inscrito) — así el dashboard sabe su estado de pago sin inferir nadaPATCH/:id/confirmar-pagocoordinadora, adminMarca pagado, crea ProgresoEstudiante y un MovimientoContable automático

Regla formal (antes era un supuesto sin confirmar): al confirmar el pago,
el ProgresoEstudiante que se crea DEBE inicializar sesionActualDesbloqueada: 1.
Si se crea en 0, la estudiante paga y no puede ver ni la teoría de la
Sesión 1 (GET /api/sesiones/:numero exige numero <= sesionActualDesbloqueada).
Verificar esto en el código existente antes de dar por hecho que ya funciona así.

Sesiones (/api/sesiones)

MétodoRutaRolDescripciónGET/coordinadora, adminLas 3 sesiones completas (gestión)GET/:numeroestudianteSolo si numero <= sesionActualDesbloqueadaPATCH/:numeroadminEditar teoría/videos

Exámenes (/api/examenes) — banco de preguntas por sesión

MétodoRutaRolDescripciónPOST/coordinadora, adminCrear versión: { sesionId, nombreVersion, preguntas: [10 exactas] }GET/sesion/:sesionIdcoordinadora, adminVersiones disponibles de esa sesión (para mantenimiento del banco)PATCH/:idcoordinadora, adminEditar preguntas/opciones/respuesta correcta de una versión existente (ej. si cambia la Ley 63-17)DELETE/:idadminBorrado lógico (activo: false), NUNCA borrado físico — los IntentoExamen históricos siguen referenciando ese examenIdPOST/:sesionId/desbloquearcoordinadora, adminBody { userId } → el backend elige al azar una versión activa entre las de esa sesión, crea el IntentoExamen, valida orden y límite de 3 intentos

Cambio de diseño respecto a la versión anterior: antes la coordinadora
elegía manualmente examenId al desbloquear. Ahora la ruta recibe sesionId
y el backend asigna al azar una versión activa. Esto resuelve la ambigüedad
de "¿quién elige la versión?" — la coordinadora solo decide cuándo
desbloquear, no cuál versión le toca a cada estudiante. La fundadora (admin)
mantiene el banco de preguntas actualizado con PATCH/DELETE cuando cambie la ley.

Intentos de examen (/api/intentos-examen) — todo estudiante (dueña del intento)

MétodoRutaDescripciónGET/activo/:sesionIdDevuelve el intento sin entregar (fechaFin: null) más reciente de la estudiante para esa sesión — así el frontend obtiene el id que necesita para iniciar/entregar. 404 si no hay ninguno pendientePOST/:id/iniciarArranca el timer, devuelve preguntas SIN respuesta correctaPOST/:id/entregarBody { respuestas: [10 índices] } → califica (≥70% aprueba)

Este GET /activo/:sesionId es lo que cierra el vacío detectado antes de
construir el Aula Virtual: sin él, la estudiante no tenía forma de saber el
id de su propio intento.

Progreso (/api/progreso)

MétodoRutaRolDescripciónGET/meestudianteSu propio progresoGET/:userIdcoordinadora, adminProgreso de una estudiante

Diplomas (/api/diplomas)

MétodoRutaRolDescripciónGET/elegiblescoordinadora, adminEstudiantes con curso completo sin diploma aúnPOST/:userId/generarcoordinadora, adminGenera PDF + código, sube a CloudinaryGET/verificar/:codigopúblicoVerificación pública del diploma

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

Claves iniciales sugeridas: inicio_hero_titulo, inicio_hero_texto,
acerca_de_historia, acerca_de_fundadora, kit_video_urls (tipo json),
kit_libro_url, kit_intrant_url, contacto_telefono, contacto_email,
contacto_direccion, redes_facebook, redes_instagram, redes_whatsapp.

Noticias, testimonios, FAQ y comentarios ya tenían CRUD para coordinadora/admin
— eso ya estaba bien resuelto. Lo que faltaba era el contenido estático de
las páginas públicas, que es lo que resuelve este módulo nuevo.

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

recuperación del id del IntentoExamen por la estudiante, 2) inicialización
de sesionActualDesbloqueada al confirmar pago, 3) endpoint GET /inscripciones/me,
asignación al azar de versión de examen + PATCH/DELETE para mantenerlas,
endpoint de cambio de contraseña, 6) módulo de contenido de página editable,
código de verificación de diploma con año dinámico (ver nota abajo).

Nota — código de verificación de diploma: verificationCode.js debe generar
el año con new Date().getFullYear(), no con 2026 hardcodeado. Revisar el
archivo real y corregirlo si sigue fijo (los diplomas de prueba actuales usan
MAV-2026-000001, lo cual es correcto solo porque coincide con el año real).

Testing

Antes de cualquier cambio importante: npm run dev local + probar con curl o
Postman los endpoints tocados. El flujo completo (registro → inscripción → pago
→ 3 sesiones → diploma → verificación) ya fue probado end-to-end exitosamente.
