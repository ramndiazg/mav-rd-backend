# Arquitectura del Backend — mav-rd-backend

> Refleja el estado REAL del código al 25/07/2026. Reemplaza `Arquitectura_Backend.md`
> + `BITACORA_1.md`. Para el historial de cómo se llegó aquí, ver `HISTORIAL_MODIFICACIONES.md`.

**Stack:** Node.js + Express + Mongoose (MongoDB Atlas) + JWT + Cloudinary (`pdf-lib` para PDFs)

## Infraestructura

- **Hosting:** Render, tier free. El servicio se duerme tras 15 min de
  inactividad — el primer request después de eso tarda ~30-60s (cold start).
  El frontend debe contemplar esa demora, especialmente en login/primera carga.
- **Base de datos:** MongoDB Atlas, cluster `mujeresalvolante.rd4sofa.mongodb.net`
  (compartido con otra app — este proyecto usa exclusivamente la base de datos
  `mav_rd` dentro de ese cluster, sin riesgo de cruce). Network Access con
  `0.0.0.0/0` habilitado (necesario para las IPs dinámicas de Render).
- **CORS:** hoy acepta un único origen exacto vía `process.env.FRONTEND_URL`
  en Render (NO una lista separada por comas — a pesar de que documentación
  anterior sugería que ya se había cambiado a lista, el incidente de dominio
  del 22/07 confirmó que sigue siendo un solo string). Mejora pendiente:
  aceptar múltiples orígenes separados por comas.
- **Repo:** `ramndiazg/mav-rd-backend` en GitHub.
- **Seguridad pendiente:** rotar `JWT_SECRET`, contraseña de MongoDB Atlas y
  secreto de Cloudinary — quedaron expuestos en conversaciones de chat en
  algún momento. Pendiente "cuando el proyecto sea definitivo".

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
│   │   │ MovimientoContable.js, BalanceMensual.js
│   ├── controllers/ (uno por recurso, mismos nombres que los modelos)
│   ├── routes/ (uno por recurso)
│   ├── middleware/
│   │   ├── auth.js → protegerRuta (verifica JWT), permitirRoles(...roles)
│   │   ├── upload.js → multer en memoria, solo imágenes, máx 5MB
│   │   └── errorHandler.js
│   ├── utils/
│   │   ├── pdfGenerator.js → generarDiplomaPDF, generarBalancePDF
│   │   ├── cloudinaryUpload.js → subirBuffer(), generarUrlDescargaFirmada()
│   │   ├── verificationCode.js → generarCodigoVerificacion (MAV-<año>-000001)
│   │   └── seedSesiones.js, seedMaterialReal.js, seedExamenesReal.js (scripts, correr una vez)
│   ├── app.js
│   └── server.js
├── .env (no se sube)
└── package.json
```

## 🔑 Autenticación

El backend NO usa cookies. Login/registro devuelven el JWT en el body:

```json
{ "success": true, "data": { "usuario": {...}, "token": "eyJ..." } }
```

- El **payload del token solo trae `{ id }`** — nada de rol ni nombre. Cualquier
  dato de perfil se obtiene con `GET /api/auth/perfil`.
- Enviar el token en cada request protegido: `Authorization: Bearer <token>`.
- Expira en 7 días (`JWT_EXPIRES_IN`). No hay refresh token — al expirar, la
  usuaria vuelve a loguearse.
- Roles: `estudiante`, `coordinadora`, `admin`. El registro público
  (`POST /api/auth/registro`) SIEMPRE crea rol `estudiante`. Cuentas de
  coordinadora las crea el admin vía `POST /api/usuarios/coordinadora`.
- No existe "olvidé mi contraseña" (requiere servicio de email, fuera de
  alcance). Sí existe cambiar contraseña estando logueada.

### Convención de respuestas
```json
{ "success": true, "data": {...} }
{ "success": false, "error": "mensaje en español, listo para mostrar al usuario" }
```

## Referencia de endpoints

### Auth (`/api/auth`)
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/registro` | público | Crea cuenta de estudiante |
| POST | `/login` | público | `{ usuario, token }` |
| GET | `/perfil` | autenticada | Datos del usuario del token actual |
| PATCH | `/cambiar-password` | autenticada | `{ passwordActual, passwordNueva }` |

### Usuarios (`/api/usuarios`)
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/?rol=&search=&activo=` | coordinadora, admin | Buscar usuarias (límite 50) |
| POST | `/coordinadora` | admin | Crear cuenta de coordinadora |
| PATCH | `/:id/estado` | admin | `{ activo: bool }` |
| PATCH | `/:id/rol` | admin | `{ rol }` |

### Configuración (`/api/configuracion`)
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/` | público | `{ precio_plan_normal, precio_plan_vip }` |
| PATCH | `/:clave` | admin | `{ valor }` |

Precios actuales: `precio_plan_normal: 1000`, `precio_plan_vip: 7000` (RD$).

### Inscripciones (`/api/inscripciones`)
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/` | coordinadora, admin | Flujo manual/efectivo — `{ userId, tipoPlan, monto }` |
| POST | `/mia` | estudiante | **Auto-inscripción con voucher** — `{ tipoPlan, bancoEmisor, numeroReferencia, fechaDeposito, comprobanteUrl }`. El `monto` se calcula SIEMPRE en el backend desde `Configuracion`, nunca del body. Si la inscripción más reciente de la estudiante estaba `rechazado`, la actualiza (reenvío) en vez de crear una nueva |
| GET | `/?estadoPago=` | coordinadora, admin | Listar (con datos de la estudiante poblados) |
| GET | `/me` | estudiante | Su propia inscripción más reciente (o `null`) |
| PATCH | `/:id/confirmar-pago` | coordinadora, admin | Marca `pagado`, crea `ProgresoEstudiante` (con `sesionActualDesbloqueada: 1`) y un `MovimientoContable` automático |
| PATCH | `/:id/rechazar-pago` | coordinadora, admin | `{ motivo }` — marca `rechazado`, la estudiante puede reenviar |

`estadoPago` tiene 4 valores: `pendiente` (flujo viejo/efectivo), `pendiente_verificacion`
(voucher subido, por revisar), `pagado`, `rechazado`. `numeroReferencia` tiene
índice único (sparse) — no se puede reusar el mismo comprobante en dos inscripciones.

### Sesiones (`/api/sesiones`)
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/` | coordinadora, admin | Las 3 sesiones completas (gestión) |
| GET | `/:numero` | estudiante | Solo si `numero <= sesionActualDesbloqueada` |
| PATCH | `/:numero` | admin | Editar teoría/videos |

### Exámenes (`/api/examenes`) — banco de preguntas
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/` | coordinadora, admin | Crear versión: `{ sesionId, nombreVersion, preguntas: [10 exactas] }` |
| GET | `/sesion/:sesionId` | coordinadora, admin | Versiones de esa sesión |
| PATCH | `/:id` | coordinadora, admin | Editar preguntas/opciones/respuesta correcta |
| DELETE | `/:id` | admin | Borrado lógico (`activo: false`) — nunca físico |
| POST | `/:sesionId/desbloquear` | coordinadora, admin | Override manual (excepción, no el camino normal) |

La asignación de versión de examen es **al azar** entre las activas de la sesión.
La lógica real de desbloqueo (orden estricto, máx. 3 intentos, no duplicar intento
activo) vive en `intentarDesbloquear()`, función interna de `examenController.js`
reutilizada por 3 caminos: el override manual, el auto-desbloqueo de `contenidoSesion`,
y el reintento de autoservicio de la estudiante.

### Contenido de Estudio por Sesión (`/api/contenido-sesion`)
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/sesion/:sesionId` | estudiante, coordinadora, admin | Materiales activos |
| GET | `/admin/sesion/:sesionId` | coordinadora, admin | Todos, incluidos inactivos |
| POST | `/` | coordinadora, admin | `{ sesionId, titulo, tipo, url?, contenidoTexto?, orden?, imagenUrl? }` |
| PATCH | `/:id` | coordinadora, admin | Editar |
| DELETE | `/:id` | admin | Borrado lógico |
| POST | `/:id/marcar-visto` | estudiante | Marca visto. Si con este ya vio TODO el contenido activo de la sesión, dispara `intentarDesbloquear()` automáticamente → `{ contenidoId, examenDesbloqueado }` |

### Intentos de examen (`/api/intentos-examen`)
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/activo/:sesionId` | estudiante | Intento sin entregar más reciente (404 si no hay) |
| GET | `/historial/:sesionId` | estudiante | Todos sus intentos de esa sesión |
| POST | `/reintentar/:sesionId` | estudiante | Autoservicio: pide otro intento si reprobó y le quedan |
| POST | `/:id/iniciar` | estudiante | Arranca timer, preguntas sin respuesta correcta |
| POST | `/:id/entregar` | estudiante | `{ respuestas: [10 índices] }` → califica (≥70% aprueba) |
| GET | `/:id/detalle` | estudiante | Correctas/incorrectas por pregunta, tras entregar |
| GET | `/estudiante/:userId` | coordinadora, admin | Todos los intentos de una estudiante (para panel Estudiantes) |

### Progreso (`/api/progreso`)
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/me` | estudiante | Su propio progreso |
| GET | `/:userId` | coordinadora, admin | Progreso de una estudiante |

### Diplomas (`/api/diplomas`)
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/me` | estudiante | Su propio diploma (404 si no generado) |
| GET | `/elegibles` | coordinadora, admin | Curso completo sin diploma aún |
| POST | `/:userId/generar` | coordinadora, admin | Genera PDF + código, sube a Cloudinary |
| GET | `/verificar/:codigo` | público | Verificación pública |
| GET | `/me/descargar?token=` | estudiante | Descarga firmada (token por query, no header) |
| GET | `/:id/descargar?token=` | coordinadora, admin | Descarga firmada de cualquier diploma |

Los endpoints de descarga sirven el PDF directamente con `Content-Type:
application/pdf` (no redirigen a Cloudinary) porque Cloudinary bloquea la
entrega pública de PDFs por defecto — se usa `generarUrlDescargaFirmada()`
internamente y el backend hace `fetch` del archivo él mismo.

### Uploads (`/api/uploads`)
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/imagen` | coordinadora, admin, **estudiante** | multipart/form-data, campo `imagen` → `{ url }` |

`estudiante` se agregó para que pueda subir su comprobante de pago desde
`/inscripcion`. Es una ruta genérica compartida — si en el futuro se necesitan
límites distintos de tamaño/tipo entre "comprobante" y "imagen de noticia",
valdría la pena separarlas.

### Noticias (`/api/noticias`)
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/` | público | Todas, con autor y comentarios poblados, paginado (`?page=&limit=`) |
| GET | `/:id` | público | Detalle |
| POST | `/` | coordinadora, admin | `{ titulo, contenido, imagenUrl?, videoEmbedUrl? }` |
| PATCH | `/:id` | coordinadora, admin | Editar |
| DELETE | `/:id` | coordinadora, admin | Eliminar |
| POST | `/:id/like` | cualquier autenticada | Toggle |
| POST | `/:id/comentarios` | cualquier autenticada | `{ texto }` |
| DELETE | `/:id/comentarios/:comentarioId` | coordinadora, admin | Eliminar comentario |

Pendiente real: "me gusta" en comentarios individuales (no en la noticia) —
el esquema de comentario no tiene campo de likes todavía.

### Testimonios (`/api/testimonios`) y FAQ (`/api/faqs`)
Mismo patrón: `GET /` público (solo activos), `GET /admin` coordinadora/admin
(incluye inactivos), `POST /`, `PATCH /:id`, `DELETE /:id` coordinadora/admin.

### Contenido de Página (`/api/contenido`)
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/` | público | Todos los bloques `{ clave, valor, tipo }` |
| GET | `/:clave` | público | Un bloque específico |
| POST | `/` | admin | Crear bloque nuevo |
| PATCH | `/:clave` | admin | Actualizar valor de un bloque existente |

Cubre texto/imágenes estáticas de Inicio, Acerca de Nosotros, Kit de
Preparación y Contacto — editable sin depender de un despliegue.

### Contabilidad (`/api/contabilidad`) — todo exclusivo de admin
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/movimientos` | `{ tipo, categoria, monto, descripcion?, fecha? }` |
| GET | `/movimientos?mes=&anio=&tipo=&categoria=` | Listar/filtrar, paginado |
| POST | `/balances/generar` | `{ mes, anio }` → recalcula, genera PDF, guarda (upsert) |
| GET | `/balances` | Historial completo |
| GET | `/balances/:id` | Un balance específico |

**Pendiente diseñado pero no aplicado:** rediseño visual del PDF de balance
(tarjetas de totales + tabla) y fix de la descarga sin extensión `.pdf` vía
`publicIdCloudinary` (mismo patrón que ya resolvió esto para diplomas) — el
`contabilidadController.js` real hoy sigue siendo la versión sin estos cambios.
El botón de descarga en `admin/contabilidad/page.tsx` sigue usando
`href={b.urlPDF}` directo.

## Reglas de negocio implementadas (no reinventar en el frontend)

- Orden estricto de sesiones: no se desbloquea N+2 sin haber desbloqueado N+1.
- Máximo 3 intentos por sesión; el backend rechaza automáticamente el 4to.
- Nota mínima 70% para aprobar (calculado en backend).
- Diploma requiere `ProgresoEstudiante.cursoCompletado === true`.
- Pago confirmado → `MovimientoContable` automático (`entrada`/`inscripcion`).
- Balances mensuales son "upsert" — regenerar el mismo mes/año lo reemplaza.
- Examen se desbloquea automático al terminar todo el contenido de la sesión.

## Pendiente de implementar (NO existe todavía)
- Recuperación de contraseña sin sesión (requiere servicio de email).
- Rate limiting en `/api/auth/login` y `/api/diplomas/verificar/:codigo`.
- CORS con lista de orígenes separada por comas.
- Monitoreo de errores en producción (ej. Sentry).
- Confirmar backups automáticos en MongoDB Atlas (M0 free tier normalmente no los tiene).
- Tests unitarios para `intentarDesbloquear()` — lógica más sensible del sistema, sin ningún test.
- Notificaciones (email/SMS) de ningún tipo.
- "Me gusta" en comentarios de noticias.

## Testing
`npm run dev` local + Postman/curl antes de cambios importantes. Flujo completo
(registro → inscripción → pago → 3 sesiones → examen → diploma → verificación)
ya probado end-to-end exitosamente, incluyendo el flujo nuevo de auto-inscripción
con voucher (`POST /inscripciones/mia` → verificación → confirmar/rechazar).
