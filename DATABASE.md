# Esquema de Base de Datos — MongoDB Atlas

> Base de datos: `mav_rd` (nombre sugerido). Mongoose como ODM en el backend.
> Todas las colecciones usan `_id` (ObjectId) automático de MongoDB y campos
> `createdAt` / `updatedAt` (timestamps automáticos de Mongoose).

---

## 1. `users`

Estudiantes, coordinadoras y admin viven en la misma colección, diferenciados por `rol`.

```js
{
  _id: ObjectId,
  nombre: String,          // requerido
  apellido: String,        // requerido
  cedula: String,          // requerido, único
  telefono: String,        // requerido
  email: String,           // requerido, único
  passwordHash: String,    // requerido (bcrypt)
  provincia: String,       // requerido
  fechaNacimiento: Date,   // requerido
  rol: String,             // enum: 'estudiante' | 'coordinadora' | 'admin'
  activo: Boolean,         // default true (para desactivar cuentas sin borrarlas)
  createdAt: Date,
  updatedAt: Date
}
```

## 2. `inscripciones`

Una por estudiante (o una por intento de curso, si en el futuro permiten recursar).

```js
{
  _id: ObjectId,
  userId: ObjectId,        // ref: users
  tipoPlan: String,        // enum: 'normal' | 'vip'
  monto: Number,           // monto realmente cobrado (permite descuentos/becas)
  estadoPago: String,      // enum: 'pendiente' | 'pagado'
  metodoPago: String,      // default: 'efectivo'
  fechaPago: Date,         // null hasta confirmar
  confirmadoPor: ObjectId, // ref: users (coordinadora que confirmó), null hasta confirmar
  createdAt: Date,
  updatedAt: Date
}
```

## 3. `configuracion` (colección de un solo documento, o key-value)

Para que los precios de los planes sean editables desde el panel de admin sin tocar código.

```js
{
  _id: ObjectId,
  clave: String,     // ej: 'precio_plan_normal', 'precio_plan_vip'
  valor: Number,
  actualizadoPor: ObjectId, // ref: users
  updatedAt: Date
}
```

## 4. `sesiones` (catálogo fijo — 3 documentos: sesión 1, 2 y 3)

```js
{
  _id: ObjectId,
  numero: Number,           // 1, 2 o 3
  titulo: String,
  teoria: String,           // HTML/Markdown con el contenido teórico
  videos: [
    { titulo: String, url: String }
  ],
  activo: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## 5. `examenes` (banco de exámenes — varias versiones por sesión)

```js
{
  _id: ObjectId,
  sesionId: ObjectId,      // ref: sesiones
  nombreVersion: String,   // ej: "Versión A"
  preguntas: [
    {
      texto: String,
      opciones: [String],      // 4 opciones normalmente
      respuestaCorrectaIndex: Number
    }
  ],  // exactamente 10 preguntas
  activo: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## 6. `intentosExamen`

Cada vez que una estudiante toma un examen (permite hasta 3 intentos).

```js
{
  _id: ObjectId,
  userId: ObjectId,        // ref: users
  sesionId: ObjectId,      // ref: sesiones
  examenId: ObjectId,      // ref: examenes (versión específica asignada)
  numeroIntento: Number,   // 1, 2 o 3
  respuestas: [Number],    // índice de opción elegida por pregunta
  calificacion: Number,    // porcentaje 0-100
  aprobado: Boolean,       // calificacion >= 70
  desbloqueadoPor: ObjectId, // ref: users (coordinadora)
  fechaInicio: Date,
  fechaFin: Date,
  tiempoLimiteSegundos: Number, // 1800 (30 min)
  createdAt: Date
}
```

## 7. `progresoEstudiante`

Estado consolidado de avance (evita recalcular todo desde `intentosExamen` en cada request).

```js
{
  _id: ObjectId,
  userId: ObjectId,              // ref: users, único
  sesionActualDesbloqueada: Number, // 0 = ninguna, 1, 2 o 3
  sesionesAprobadas: [Number],   // ej: [1, 2]
  cursoCompletado: Boolean,      // true cuando aprueba las 3
  contenidosVistos: [ObjectId],  // NUEVO — refs a contenidoSesion ya vistos
  updatedAt: Date
}
```

> **Regla obligatoria:** al crearse este documento (dentro de
> `confirmar-pago`), `sesionActualDesbloqueada` debe inicializarse en `1`, no en
> `0`. En `0` la estudiante paga y no puede ver ni la teoría de la Sesión 1.

> **NUEVO:** `contenidosVistos` es lo que dispara el desbloqueo automático del
> examen. Cuando todos los `contenidoSesion` activos de una sesión están en
> este arreglo, el backend desbloquea el examen de esa sesión sin que la
> coordinadora tenga que hacer nada (ver `Arquitectura_Backend.md`,
> módulo `contenidoSesion`).

## 7.1 `contenidoSesion` (NUEVO)

Los materiales de estudio (video, PDF, enlace o texto) que la estudiante
consume antes de que el examen de esa sesión se habilite.

```js
{
  _id: ObjectId,
  sesionId: ObjectId,       // ref: sesiones
  titulo: String,
  tipo: String,             // enum: 'video' | 'pdf' | 'enlace' | 'texto'
  url: String,              // para video (embed de YouTube), pdf o enlace
  contenidoTexto: String,   // para tipo 'texto' (HTML/Markdown corto)
  orden: Number,            // default 0, controla el orden de aparición
  activo: Boolean,          // default true, borrado lógico
  createdAt: Date,
  updatedAt: Date
}
```

## 8. `diplomas`

```js
{
  _id: ObjectId,
  userId: ObjectId,             // ref: users, único
  codigoVerificacion: String,   // único, ej: MAV-2026-000123
  fechaEmision: Date,
  generadoPor: ObjectId,        // ref: users (coordinadora)
  urlPDF: String,               // URL en Cloudinary
  createdAt: Date
}
```

## 9. `noticias`

```js
{
  _id: ObjectId,
  titulo: String,
  contenido: String,        // HTML/Markdown
  imagenUrl: String,        // Cloudinary
  videoEmbedUrl: String,    // opcional, YouTube/IG embed
  autorId: ObjectId,        // ref: users (coordinadora o admin)
  likes: [ObjectId],        // array de userId que dieron like
  comentarios: [
    {
      _id: ObjectId,
      userId: ObjectId,
      texto: String,
      fecha: Date
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

## 10. `testimonios`

```js
{
  _id: ObjectId,
  nombre: String,
  texto: String,
  fotoUrl: String,       // opcional, Cloudinary
  orden: Number,         // para controlar el orden de aparición
  activo: Boolean,
  creadoPor: ObjectId,   // ref: users
  createdAt: Date,
  updatedAt: Date
}
```

## 11. `faqs`

```js
{
  _id: ObjectId,
  pregunta: String,
  respuesta: String,
  orden: Number,
  activo: Boolean,
  creadoPor: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

## 12. `contenidoPagina` (NUEVO — key-value, mismo patrón que `configuracion`)

Para que la fundadora edite el texto estático del sitio (Inicio, Acerca de
Nosotros, Kit de Preparación, Contacto/redes) sin depender de un despliegue.

```js
{
  _id: ObjectId,
  clave: String,          // único, ej: 'inicio_hero_titulo', 'kit_libro_url'
  valor: String,          // texto, HTML, URL o JSON serializado según `tipo`
  tipo: String,           // enum: 'texto' | 'html' | 'url' | 'json'
  actualizadoPor: ObjectId, // ref: users
  updatedAt: Date
}
```

## 13. `movimientosContables`

```js
{
  _id: ObjectId,
  tipo: String,            // enum: 'entrada' | 'salida'
  categoria: String,       // enum: 'inscripcion' | 'sueldo' | 'materiales' |
                            //       'transporte' | 'publicidad' | 'otro'
  monto: Number,
  descripcion: String,
  fecha: Date,
  inscripcionRelacionadaId: ObjectId, // ref: inscripciones (opcional, si es auto-generado)
  registradoPor: ObjectId, // ref: users
  createdAt: Date
}
```

## 14. `balancesMensuales`

```js
{
  _id: ObjectId,
  mes: Number,              // 1-12
  anio: Number,
  totalEntradas: Number,
  totalSalidas: Number,
  saldo: Number,
  urlPDF: String,           // Cloudinary
  generadoAutomaticamente: Boolean,
  generadoPor: ObjectId,    // ref: users (admin)
  fechaGeneracion: Date
}
```

---

## Índices recomendados

- `users`: índice único en `cedula` y `email`.
- `inscripciones`: índice en `userId`.
- `intentosExamen`: índice compuesto en `{ userId, sesionId }` — usado también
  por `GET /api/intentos-examen/activo/:sesionId` para encontrar el intento
  sin entregar (`fechaFin: null`) más reciente.
- `diplomas`: índice único en `codigoVerificacion`.
- `movimientosContables`: índice en `{ fecha }` (para agregaciones mensuales rápidas).
- `contenidoPagina`: índice único en `clave`.
- `contenidoSesion`: índice en `{ sesionId, activo }` (se filtra por ambos en cada consulta).

## Notas de diseño

- Se separan `sesiones` (contenido fijo) de `examenes` (banco de versiones) para poder
  tener varias versiones de examen por sesión sin duplicar la teoría.
- `progresoEstudiante` existe como colección aparte para no tener que recorrer todos los
  `intentosExamen` cada vez que se pinta el dashboard de la estudiante.
- El precio de los planes vive en `configuracion`, no hardcodeado, para que el admin
  pueda cambiarlo sin intervención del desarrollador.
