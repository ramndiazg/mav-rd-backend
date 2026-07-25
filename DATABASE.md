# Esquema de Base de Datos — MongoDB Atlas

> Base de datos: `mav_rd`, dentro del cluster compartido `mujeresalvolante.rd4sofa.mongodb.net`.
> Mongoose como ODM. Todas las colecciones usan `_id` (ObjectId) automático y
> `createdAt`/`updatedAt` (timestamps automáticos de Mongoose), salvo que se
> indique lo contrario. Refleja el estado real al 25/07/2026.

---

## 1. `users`

Estudiantes, coordinadoras y admin en la misma colección, diferenciados por `rol`.

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
  createdAt: Date, updatedAt: Date
}
```

## 2. `inscripciones`

Una por intento de inscripción activo. Ahora soporta **dos flujos de pago**:
el manual (coordinadora crea + confirma efectivo) y el de auto-inscripción
con voucher (estudiante sube su propio comprobante de transferencia/depósito).

```js
{
  _id: ObjectId,
  userId: ObjectId,        // ref: users
  tipoPlan: String,        // 'normal' | 'vip'
  monto: Number,           // SIEMPRE calculado por el backend desde `configuracion`
                            // en el flujo de auto-inscripción; en el flujo manual
                            // lo escribe la coordinadora a mano
  estadoPago: String,      // 'pendiente' | 'pendiente_verificacion' | 'pagado' | 'rechazado'
  metodoPago: String,      // 'efectivo' (default) | 'transferencia'
  fechaPago: Date,         // null hasta confirmar
  confirmadoPor: ObjectId, // ref: users (coordinadora/admin que confirmó), null hasta confirmar

  // --- campos del flujo de auto-inscripción con voucher ---
  comprobanteUrl: String,     // imagen del voucher (Cloudinary), null si no aplica
  bancoEmisor: String,        // null si no aplica
  numeroReferencia: String,   // único (sparse) — evita reusar el mismo comprobante
  fechaDeposito: Date,        // null si no aplica
  notaRechazo: String,        // motivo si la coordinadora rechaza el voucher

  createdAt: Date, updatedAt: Date
}
```

**`estadoPago` — los 4 valores:**
- `pendiente` — flujo viejo/efectivo, coordinadora creó la inscripción, falta confirmar.
- `pendiente_verificacion` — estudiante subió voucher, falta revisión de la coordinadora.
- `pagado` — confirmado, por cualquiera de los dos flujos.
- `rechazado` — coordinadora revisó el voucher y no procedió; la estudiante puede reenviar (misma inscripción se actualiza, no se duplica).

**Índice único (sparse) en `numeroReferencia`** — solo aplica cuando el campo
existe, así que no afecta inscripciones del flujo manual (que no lo usan).

## 3. `configuracion` (key-value)

Precios de planes, editables desde el panel de admin sin tocar código.

```js
{
  _id: ObjectId,
  clave: String,     // 'precio_plan_normal' | 'precio_plan_vip'
  valor: Number,
  actualizadoPor: ObjectId, // ref: users
  updatedAt: Date
}
```

Valores actuales: `precio_plan_normal: 1000`, `precio_plan_vip: 7000` (RD$).

## 4. `sesiones` (catálogo fijo — 3 documentos)

```js
{
  _id: ObjectId,
  numero: Number,           // 1, 2 o 3
  titulo: String,
  teoria: String,           // HTML/Markdown
  videos: [{ titulo: String, url: String }],
  activo: Boolean,
  createdAt: Date, updatedAt: Date
}
```

## 5. `examenes` (banco de versiones por sesión)

```js
{
  _id: ObjectId,
  sesionId: ObjectId,      // ref: sesiones
  nombreVersion: String,
  preguntas: [
    { texto: String, opciones: [String], respuestaCorrectaIndex: Number }
  ],  // exactamente 10 preguntas
  activo: Boolean,
  createdAt: Date, updatedAt: Date
}
```

Sembrado real: 9 versiones (3 por sesión), verificadas contra Ley 63-17 y
regulaciones INTRANT.

## 6. `intentosExamen`

```js
{
  _id: ObjectId,
  userId: ObjectId, sesionId: ObjectId, examenId: ObjectId, // ref: examenes (versión asignada al azar)
  numeroIntento: Number,   // 1, 2 o 3
  respuestas: [Number],
  calificacion: Number,    // 0-100
  aprobado: Boolean,       // calificacion >= 70
  desbloqueadoPor: ObjectId, // ref: users (coordinadora), o null si fue auto-desbloqueo
  fechaInicio: Date, fechaFin: Date,
  tiempoLimiteSegundos: Number, // 1800 (30 min)
  createdAt: Date
}
```

## 7. `progresoEstudiante`

```js
{
  _id: ObjectId,
  userId: ObjectId,               // único
  sesionActualDesbloqueada: Number, // 0 = ninguna, 1, 2 o 3 — DEBE inicializarse en 1 al confirmar pago
  sesionesAprobadas: [Number],
  cursoCompletado: Boolean,       // true cuando aprueba las 3
  contenidosVistos: [ObjectId],   // refs a contenidoSesion ya vistos — dispara auto-desbloqueo de examen
  updatedAt: Date
}
```

## 8. `contenidoSesion`

Materiales de estudio (video, PDF, enlace o texto) que la estudiante consume
antes de que el examen de esa sesión se habilite.

```js
{
  _id: ObjectId,
  sesionId: ObjectId,
  titulo: String,
  tipo: String,             // 'video' | 'pdf' | 'enlace' | 'texto'
  url: String,              // video/pdf/enlace
  contenidoTexto: String,   // tipo 'texto'
  imagenUrl: String,        // portada opcional (Cloudinary)
  orden: Number,            // default 0
  activo: Boolean,          // default true, borrado lógico
  createdAt: Date, updatedAt: Date
}
```

Sembrado real: 13 materiales de estudio reales, organizados en las 3 sesiones.

## 9. `diplomas`

```js
{
  _id: ObjectId,
  userId: ObjectId,             // único
  codigoVerificacion: String,   // único, MAV-<año>-000123
  fechaEmision: Date,
  generadoPor: ObjectId,        // ref: users (coordinadora)
  urlPDF: String,
  publicIdCloudinary: String,   // public_id real, para URLs de descarga firmadas
                                  // (diplomas viejos sin este campo: el backend
                                  // lo deriva de urlPDF como respaldo)
  createdAt: Date
}
```

## 10. `noticias`

```js
{
  _id: ObjectId,
  titulo: String, contenido: String,
  imagenUrl: String, videoEmbedUrl: String,
  autorId: ObjectId,        // ref: users
  likes: [ObjectId],
  comentarios: [{ _id: ObjectId, userId: ObjectId, texto: String, fecha: Date }],
  createdAt: Date, updatedAt: Date
}
```

Pendiente real: el esquema de comentario no tiene campo de likes — si se
decide implementar "me gusta" por comentario, hay que agregarlo aquí.

## 11. `testimonios`
```js
{ _id, nombre: String, texto: String, fotoUrl: String, orden: Number, activo: Boolean, creadoPor: ObjectId, createdAt, updatedAt }
```

## 12. `faqs`
```js
{ _id, pregunta: String, respuesta: String, orden: Number, activo: Boolean, creadoPor: ObjectId, createdAt, updatedAt }
```

## 13. `contenidoPagina` (key-value)

```js
{
  _id: ObjectId,
  clave: String,    // único
  valor: String,    // texto, HTML, URL o JSON según `tipo`
  tipo: String,      // 'texto' | 'html' | 'url' | 'json'
  actualizadoPor: ObjectId,
  updatedAt: Date
}
```

Claves en uso real: `inicio_hero_titulo`, `inicio_hero_texto`, `inicio_desde_texto`,
`acerca_de_historia`, `acerca_de_historia_imagen`, `acerca_de_fundadora`,
`acerca_de_fundadora_imagen`, `acerca_de_mision`, `acerca_de_vision`,
`acerca_de_valores`. Pendientes de conectar en frontend (datos ya existen):
`kit_video_urls`, `kit_libro_url`, `kit_intrant_url`, `contacto_telefono`,
`contacto_email`, `contacto_direccion`, `redes_facebook`, `redes_instagram`,
`redes_whatsapp`.

## 14. `movimientosContables`

```js
{
  _id: ObjectId,
  tipo: String,            // 'entrada' | 'salida'
  categoria: String,       // 'inscripcion' | 'sueldo' | 'materiales' | 'transporte' | 'publicidad' | 'otro'
  monto: Number, descripcion: String, fecha: Date,
  inscripcionRelacionadaId: ObjectId, // ref: inscripciones (opcional, si es auto-generado)
  registradoPor: ObjectId,
  createdAt: Date
}
```

## 15. `balancesMensuales`

```js
{
  _id: ObjectId,
  mes: Number, anio: Number,
  totalEntradas: Number, totalSalidas: Number, saldo: Number,
  urlPDF: String,
  generadoAutomaticamente: Boolean,
  generadoPor: ObjectId,
  fechaGeneracion: Date
}
```

Pendiente: campo `publicIdCloudinary` (mismo patrón que diplomas) para
resolver la descarga sin extensión `.pdf` — diseñado, no aplicado todavía.

---

## Índices recomendados
- `users`: único en `cedula` y `email`.
- `inscripciones`: `{ userId }`, único (sparse) en `numeroReferencia`.
- `intentosExamen`: compuesto `{ userId, sesionId }`.
- `diplomas`: único en `codigoVerificacion`.
- `movimientosContables`: `{ fecha }`.
- `contenidoPagina`: único en `clave`.
- `contenidoSesion`: `{ sesionId, activo }`.

## Notas de diseño
- `sesiones` (contenido fijo) separado de `examenes` (banco de versiones) para
  tener varias versiones de examen sin duplicar la teoría.
- `progresoEstudiante` existe aparte para no recorrer todos los `intentosExamen`
  en cada carga del dashboard.
- Precios de planes viven en `configuracion`, no hardcodeados.
- `Inscripcion` unifica dos flujos de pago distintos (manual y auto-servicio
  con voucher) en el mismo esquema, distinguidos por `estadoPago`/`metodoPago`
  — evita tener dos colecciones paralelas para el mismo concepto de negocio.
