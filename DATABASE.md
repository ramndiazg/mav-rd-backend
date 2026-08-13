# Esquema de Base de Datos — MongoDB Atlas

> Base de datos: mav_rd, dentro del cluster compartido
> mujeresalvolante.rd4sofa.mongodb.net (versión real confirmada: 8.0.29).
> Mongoose como ODM. Todas las colecciones usan \_id (ObjectId) automático
> y createdAt/updatedAt (timestamps automáticos de Mongoose), salvo que se
> indique lo contrario. Refleja el estado real al 13/08/2026.

---

## Purga completa de datos de prueba (06/08/2026) — para referencia histórica

Se corrió `scripts/purgarDatosPrueba.js` (backend) en modo real. Conteos
purgados:

| Colección             | Documentos borrados |
| --------------------- | -------------------- |
| users (excepto admin) | 17                   |
| sesiones              | 3                    |
| examenes              | 15                   |
| contenidoSesion       | 22                   |
| intentosExamen        | 30                   |
| progresoEstudiante    | 11                   |
| inscripciones         | 13                   |
| diplomas              | 6                    |

**Sobrevivió únicamente** la cuenta `maria@test.com` (rol `admin`).

**No se tocaron**: `configuracion`, `destinatariosNotificacion`,
`noticias`, `testimonios`, `faqs`, `contenidoPagina`,
`movimientosContables`, `balancesMensuales` — ninguna depende de
estudiantes ni de sesiones.

**Actualización (13/08/2026): `sesiones` ya no está vacía.**
`scripts/crearSesionesIniciales.js --confirmar` se ejecutó — las 4
sesiones existen con títulos provisionales ("Sesión 1"..."Sesión 4").
`examenes` y `contenidoSesion` **siguen vacías** — ese script solo crea
las sesiones, no contenido ni exámenes; esos se cargan aparte una vez
definidos los temas reales.

---

## 1. users — sin cambios de esquema

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
  activo: Boolean,

  emailVerificado: Boolean,
  tokenVerificacionEmail: String,
  tokenVerificacionExpira: Date,

  tokenRecuperacion: String,
  tokenRecuperacionExpira: Date,

  createdAt: Date, updatedAt: Date
}
```

## 2. inscripciones — sin cambios de esquema

`tipoPlan` (`"normal" | "vip"`) sigue siendo la única diferencia
estructurada entre planes — la teoría es la misma para ambos, la
diferencia real es la práctica de manejo (ver ARQUITECTURA_BACKEND.md).
Ver ese mismo archivo para el detalle de los dos flujos de pago.

## 3. configuracion (key-value) — sin cambios de esquema

Incluye `precio_plan_normal` y `precio_plan_vip` — ya se leían desde
`/inscripcion`, y desde el 13/08/2026 también se leen en el home público
(`GET /api/configuracion`, sin auth) para mostrar los precios ahí. **No
hay todavía una UI de admin para editarlos** — se cambian a mano en
Atlas (ver pendientes en ARQUITECTURA_BACKEND.md).

## 4. sesiones — ya recreada tras la purga (13/08/2026)

```js
{
  _id: ObjectId,
  numero: Number,   // único, 1 a 4
  titulo: String,
  teoria: String,   // HTML/Markdown
  videos: [{ titulo: String, url: String }],
  activo: Boolean,
  createdAt: Date, updatedAt: Date
}
```

4 documentos con títulos provisionales ("Sesión 1"..."Sesión 4").
Renombrarlos a los temas reales es una simple actualización de `titulo`
vía `PATCH /sesiones/:numero`, no requiere cambio de esquema ni de
código — sigue pendiente definir esos temas con la fundadora.

## 5. examenes — sin cambios de esquema, colección vacía

```js
{
  _id: ObjectId,
  sesionId: ObjectId,   // ref: sesiones
  nombreVersion: String,
  preguntas: Array,     // exactamente 10 elementos
  activo: Boolean,
  createdAt: Date, updatedAt: Date
}
```

Pendiente crear versiones nuevas para las 4 sesiones una vez definido el
contenido real.

## 6. intentosExamen — sin cambios de esquema, colección vacía

## 7. progresoEstudiante — sin cambios de esquema, colección vacía

## 8. contenidoSesion — NUEVO campo `publicIdCloudinary` (13/08/2026)

```js
{
  _id: ObjectId,
  sesionId: ObjectId,      // ref: sesiones
  titulo: String,
  tipo: String,            // 'video' | 'pdf' | 'enlace' | 'texto'
  url: String,              // video/pdf/enlace
  publicIdCloudinary: String, // NUEVO — solo si el pdf se subió como archivo
                              // (permite generar una URL de descarga
                              // firmada al momento; si está vacío, se usa
                              // `url` directo como fallback)
  contenidoTexto: String,   // texto
  imagenUrl: String,        // portada opcional, cualquier tipo
  orden: Number,
  activo: Boolean,
  createdAt: Date, updatedAt: Date
}
```

Colección todavía vacía de contenido real — el flujo de subida de PDF ya
se probó en producción, pero no se ha cargado ningún material real
todavía.

## 9. diplomas — sin cambios de esquema, colección vacía tras la purga

## 10. noticias, 11. testimonios, 12. faqs, 13. contenidoPagina — sin cambios, no purgadas

## 14. movimientosContables — sin cambios, no purgada

## 15. balancesMensuales — sin cambios, no purgada

## 16. destinatariosNotificacion — sin cambios, no purgada

Es el mismo mecanismo que ahora también usa la solicitud del formulario
de Empresas (ver ARQUITECTURA_BACKEND.md) — no se agregó ninguna
colección nueva para ese formulario, y por ahora tampoco se persisten
los leads que llegan por ahí (solo se notifican por correo/Telegram).

---

## Índices recomendados — sin cambios

- users: único en cedula y email.
- inscripciones: { userId }, único (sparse) en numeroReferencia.
- intentosExamen: compuesto { userId, sesionId }.
- diplomas: único en codigoVerificacion.
- movimientosContables: { fecha }.
- contenidoPagina: único en clave.
- contenidoSesion: { sesionId, activo }.
- examenes: recomendado { sesionId, activo } (no confirmado si ya existe
  físico en Atlas).
- balancesMensuales: compuesto único { mes, anio }.

## Notas de diseño

- `activo` como patrón de soft delete sigue siendo consistente en las 3
  colecciones donde importa preservar historial (`users`, `examenes`,
  `contenidoSesion`).
- La purga de datos de prueba tiene un script formal y repetible
  (`scripts/purgarDatosPrueba.js`, con dry-run por defecto) — ver
  ARQUITECTURA_BACKEND.md.

## Pendiente (base de datos)

- Definir los 4 temas reales del curso, renombrar las sesiones, y cargar
  `contenidoSesion` + `examenes` reales para cada una — sigue en 0
  documentos, es trabajo pendiente completo, no una migración de datos
  existentes.
- Evaluar si el formulario de Empresas necesita una colección propia
  para no depender solo del correo/Telegram (ver ARQUITECTURA_BACKEND.md).
- Construir una UI de admin para editar `configuracion` (precios) en vez
  de cambiarlos a mano en Atlas — ahora que se muestran en el home
  público, un error ahí es más visible.
- Afinar el rol `backup_readonly` en Atlas de `readAnyDatabase@admin` a
  un rol Read específico sobre `mav_rd` (no urgente).