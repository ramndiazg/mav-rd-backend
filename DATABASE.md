# Esquema de Base de Datos — MongoDB Atlas

> Base de datos: mav_rd, dentro del cluster compartido
> mujeresalvolante.rd4sofa.mongodb.net. Mongoose como ODM. Todas las
> colecciones usan \_id (ObjectId) automático y createdAt/updatedAt
> (timestamps automáticos de Mongoose), salvo que se indique lo contrario.
> Refleja el estado real al 26/07/2026.

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
  activo: Boolean,         // default true

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

## 4. sesiones, 5. examenes, 6. intentosExamen, 7. progresoEstudiante,

## 8. contenidoSesion

Sin cambios desde la versión anterior de este documento.

## 9. diplomas

Sin cambios de esquema. Al generarse, ahora también dispara un correo a la
estudiante (ver ARQUITECTURA_BACKEND.md).

## 10. noticias, 11. testimonios, 12. faqs, 13. contenidoPagina

Sin cambios desde la versión anterior.

## 14. movimientosContables

Sin cambios.

## 15. balancesMensuales

```js
{
  _id: ObjectId,
  mes: Number, anio: Number,
  totalEntradas: Number, totalSalidas: Number, saldo: Number,
  urlPDF: String,
  publicIdCloudinary: String,  // NUEVO — mismo patrón que Diploma, para
                                 // descargas firmadas. Balances viejos sin
                                 // este campo lo derivan de urlPDF como respaldo.
  generadoAutomaticamente: Boolean,
  generadoPor: ObjectId,
  fechaGeneracion: Date
}
```

## 16. destinatariosNotificacion (NUEVO)

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
