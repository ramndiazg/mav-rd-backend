# Esquema de Base de Datos — MongoDB Atlas

> Base de datos: mav_rd, dentro del cluster compartido
> mujeresalvolante.rd4sofa.mongodb.net (versión real confirmada: 8.0.29).
> Mongoose como ODM. Todas las colecciones usan \_id (ObjectId) automático
> y createdAt/updatedAt (timestamps automáticos de Mongoose), salvo que se
> indique lo contrario. Refleja el estado real al 07/08/2026.

---

## ⚠️ Evento importante: purga completa de datos de prueba (06/08/2026)

Se corrió `scripts/purgarDatosPrueba.js` (backend) en modo real. Conteos
purgados, para referencia histórica:

| Colección             | Documentos borrados |
| --------------------- | ------------------- |
| users (excepto admin) | 17                  |
| sesiones              | 3                   |
| examenes              | 15                  |
| contenidoSesion       | 22                  |
| intentosExamen        | 30                  |
| progresoEstudiante    | 11                  |
| inscripciones         | 13                  |
| diplomas              | 6                   |

**Sobrevivió únicamente** la cuenta `maria@test.com` (rol `admin`).

**No se tocaron**: `configuracion`, `destinatariosNotificacion`,
`noticias`, `testimonios`, `faqs`, `contenidoPagina`,
`movimientosContables`, `balancesMensuales` — ninguna depende de
estudiantes ni de sesiones.

**Estado actual de las colecciones purgadas: vacías.** `sesiones`,
`examenes` y `contenidoSesion` en particular quedaron en 0 documentos —
hasta correr `scripts/crearSesionesIniciales.js` (creado, todavía sin
ejecutar), la app no tiene ninguna sesión, lo cual es intencional
mientras se define el contenido real de las 4 sesiones nuevas.

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

Sin cambios. Ver ARQUITECTURA_BACKEND.md para el detalle de los dos
flujos de pago.

## 3. configuracion (key-value) — sin cambios

## 4. sesiones — límite ampliado de 3 a 4 (06/08/2026)

```js
{
  _id: ObjectId,
  numero: Number,   // único, 1 a 4 (antes: 1 a 3)
  titulo: String,
  teoria: String,   // HTML/Markdown
  videos: [{ titulo: String, url: String }],
  activo: Boolean,
  createdAt: Date, updatedAt: Date
}
```

**Colección vacía tras la purga.** Cuando se corra
`scripts/crearSesionesIniciales.js --confirmar`, va a crear las 4 con
títulos provisionales ("Sesión 1"..."Sesión 4") — renombrarlas a los
temas reales es una simple actualización de `titulo` vía
`PATCH /sesiones/:numero`, no requiere cambio de esquema ni de código.

## 5. examenes — sin cambios de esquema

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

**Colección vacía tras la purga.** Pendiente crear versiones nuevas para
las 4 sesiones una vez definido el contenido real.

## 6. intentosExamen — sin cambios de esquema, colección vacía tras la purga

## 7. progresoEstudiante — sin cambios de esquema, colección vacía tras la purga

## 8. contenidoSesion — sin cambios de esquema, colección vacía tras la purga

## 9. diplomas — sin cambios de esquema, colección vacía tras la purga

## 10. noticias, 11. testimonios, 12. faqs, 13. contenidoPagina — sin cambios, no purgadas

## 14. movimientosContables — sin cambios, no purgada

## 15. balancesMensuales — sin cambios, no purgada

## 16. destinatariosNotificacion — sin cambios, no purgada

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
- La purga de datos de prueba ahora tiene un script formal y repetible
  (`scripts/purgarDatosPrueba.js`, con dry-run por defecto) en vez de ser
  solo un procedimiento manual documentado — ver ARQUITECTURA_BACKEND.md.

## Pendiente (base de datos)

- Correr `scripts/crearSesionesIniciales.js --confirmar` para recrear las
  4 sesiones con títulos provisionales.
- Definir los 4 temas reales del curso, renombrar las sesiones, y
  cargar `contenidoSesion` + `examenes` reales para cada una — todo
  quedó en 0 documentos tras la purga, es trabajo pendiente completo,
  no una migración de datos existentes.
- Afinar el rol `backup_readonly` en Atlas de `readAnyDatabase@admin` a
  un rol Read específico sobre `mav_rd` (no urgente).
