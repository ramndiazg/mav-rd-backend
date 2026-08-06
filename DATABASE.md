# Esquema de Base de Datos — MongoDB Atlas

> Base de datos: mav_rd, dentro del cluster compartido
> mujeresalvolante.rd4sofa.mongodb.net (versión real confirmada: 8.0.29).
> Mongoose como ODM. Todas las colecciones usan \_id (ObjectId) automático
> y createdAt/updatedAt (timestamps automáticos de Mongoose), salvo que se
> indique lo contrario. Refleja el estado real al 04/08/2026 — **sin
> cambios de esquema desde la versión anterior (03/08/2026)**. Esta sesión
> solo confirmó, revisando el código real, que `Examen` y `ContenidoSesion`
> ya tenían `activo` desde antes — no se agregó ni modificó ningún campo.

---

## 1. users

Estudiantes, coordinadoras y admin en la misma colección, diferenciados por rol.

```js
{
  _id: ObjectId,
  nombre: String, apellido: String,
  cedula: String,          // único
  telefono: String,
  email: String,           // único
  passwordHash: String,    // bcrypt
  provincia: String,
  fechaNacimiento: Date,
  rol: String,             // 'estudiante' | 'coordinadora' | 'admin'
  activo: Boolean,         // default true — usado para archivar/reactivar
                            // cuentas desde el panel (PATCH /usuarios/:id/estado);
                            // login() rechaza con 403 si es false.

  // --- Verificación de email ---
  emailVerificado: Boolean,        // default false
  tokenVerificacionEmail: String,  // default null (nunca se devuelve en JSON)
  tokenVerificacionExpira: Date,   // default null

  // --- Recuperación de contraseña ---
  tokenRecuperacion: String,       // default null (nunca se devuelve en JSON)
  tokenRecuperacionExpira: Date,   // default null

  createdAt: Date, updatedAt: Date
}
```

Nota: cuentas creadas antes de estos campos existentes quedan con
emailVerificado: false por defecto de Mongoose. Se marcaron manualmente
como true en Atlas para las cuentas ya existentes al momento de agregar
esta verificación, para no bloquearlas retroactivamente.

## 2. inscripciones

Soporta dos flujos de pago: manual (coordinadora crea + confirma efectivo)
y auto-inscripción con voucher (estudiante sube su propio comprobante).

```js
{
  _id: ObjectId,
  userId: ObjectId,        // ref: users
  tipoPlan: String,        // 'normal' | 'vip'
  monto: Number,
  estadoPago: String,      // 'pendiente' | 'pendiente_verificacion' | 'pagado' | 'rechazado'
  metodoPago: String,      // 'efectivo' (default) | 'transferencia'
  fechaPago: Date,
  confirmadoPor: ObjectId, // ref: users

  comprobanteUrl: String,     // imagen del voucher (Cloudinary)
  bancoEmisor: String,
  numeroReferencia: String,   // único (sparse)
  fechaDeposito: Date,
  notaRechazo: String,        // motivo si la coordinadora rechaza

  createdAt: Date, updatedAt: Date
}
```

## 3. configuracion (key-value)

```js
{
  _id: ObjectId,
  clave: String,     // 'precio_plan_normal' | 'precio_plan_vip' | marcadores internos
  valor: Number,
  actualizadoPor: ObjectId, // ref: users, puede ser null (marcadores internos)
  updatedAt: Date
}
```

Valores actuales: precio_plan_normal: 1000, precio_plan_vip: 7000 (RD$).

También se usa para marcadores internos de una sola vez, tipo
recordatorio_balance_202606 (evita repetir el aviso de balance pendiente
para ese mes específico). Estos marcadores se crean con
actualizadoPor: null.

## 4. sesiones

Sin cambios. Numeradas 1-3, orden estricto validado contra
`progreso.sesionesAprobadas`.

## 5. examenes

Sin cambios de esquema — **confirmado el 04/08/2026** (revisando
`examenController.js` real) que ya tenía todo lo necesario desde antes:

```js
{
  _id: ObjectId,
  sesionId: ObjectId,   // ref: sesiones
  nombreVersion: String,
  preguntas: Array,     // exactamente 10 elementos
  activo: Boolean,      // default true — soft delete puro, nunca se borra físico
  createdAt: Date, updatedAt: Date
}
```

Pueden existir varias versiones `activo: true` a la vez para la misma
sesión — el sistema elige una al azar entre las activas al crear un
intento de examen nuevo.

## 6. intentosExamen

Sin cambios.

## 7. progresoEstudiante

Sin cambios.

## 8. contenidoSesion

Sin cambios de esquema — **confirmado el 04/08/2026** (revisando
`contenidoSesionController.js` real) que ya tenía `activo` desde antes,
mismo patrón de soft delete que `examenes`.

## 9. diplomas

Sin cambios de esquema. Al generarse, dispara un correo a la estudiante
(ver ARQUITECTURA_BACKEND.md). No tiene ni necesita `activo` — es un
documento de emisión, no algo que se desactive.

## 10. noticias, 11. testimonios, 12. faqs, 13. contenidoPagina

Sin cambios.

## 14. movimientosContables

Sin cambios.

## 15. balancesMensuales

```js
{
  _id: ObjectId,
  mes: Number, anio: Number,
  totalEntradas: Number, totalSalidas: Number, saldo: Number,
  urlPDF: String,
  publicIdCloudinary: String,  // mismo patrón que Diploma, para descargas
                                 // firmadas. Balances viejos sin este campo
                                 // lo derivan de urlPDF como respaldo.
  generadoAutomaticamente: Boolean,
  generadoPor: ObjectId,
  fechaGeneracion: Date
}
```

## 16. destinatariosNotificacion

Quién recibe avisos internos (voucher nuevo, balance pendiente) por email o Telegram.

```js
{
  _id: ObjectId,
  tipo: String,       // 'email' | 'telegram'
  valor: String,       // dirección de correo, o chat_id numérico de Telegram
  etiqueta: String,    // ej: "María (fundadora)"
  activo: Boolean,     // default true
  creadoPor: ObjectId, // ref: users, default null
  createdAt: Date, updatedAt: Date
}
```

---

## Índices recomendados

- users: único en cedula y email.
- inscripciones: { userId }, único (sparse) en numeroReferencia.
- intentosExamen: compuesto { userId, sesionId }.
- diplomas: único en codigoVerificacion.
- movimientosContables: { fecha }.
- contenidoPagina: único en clave.
- contenidoSesion: { sesionId, activo }.
- examenes: recomendado { sesionId, activo } (mismo patrón que
  contenidoSesion — no confirmado si ya existe como índice físico en
  Atlas, revisar si se nota lentitud al escalar).
- balancesMensuales: compuesto único { mes, anio } (ya existía).

## Notas de diseño

- Inscripcion unifica dos flujos de pago distintos en el mismo esquema,
  distinguidos por estadoPago/metodoPago.
- Configuracion se reusa como mecanismo simple de "marcador de una sola
  vez" para el recordatorio de balance, en vez de crear una colección
  nueva solo para eso.
- destinatariosNotificacion es intencionalmente simple (sin relación a
  otras colecciones) porque no necesita más que una lista plana de
  contactos administrada por admin.
- `activo` como patrón de soft delete es consistente en las 3 colecciones
  donde importa preservar historial (`users`, `examenes`,
  `contenidoSesion`) — ninguna de las tres se borra físico nunca desde la
  aplicación. El único borrado real y planeado es la purga manual de
  datos de prueba por terminal, pendiente y pospuesta a propósito (ver
  HISTORIAL_MODIFICACIONES.md).

## Pendiente (base de datos)

- Purga en cascada de usuarios/datos de prueba: pospuesta a propósito
  hasta que la app esté lista para producción. Debe incluir Inscripcion,
  IntentoExamen, ProgresoEstudiante, Diploma (ya hay 6 diplomas de prueba
  confirmados) y MovimientoContable — no solo User. Ver
  HISTORIAL_MODIFICACIONES.md para el detalle completo.
- Afinar el rol `backup_readonly` en Atlas de `readAnyDatabase@admin` a
  un rol Read específico sobre `mav_rd` (no urgente).
