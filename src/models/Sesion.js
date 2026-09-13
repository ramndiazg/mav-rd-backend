const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false },
);

const sesionSchema = new mongoose.Schema(
  {
    // Límite ampliado de 3 a 4 sesiones (04/08/2026 → próxima fecha real).
    // Si el curso vuelve a crecer, este es el primer lugar a revisar —
    // Mongo rechaza cualquier `numero` fuera de este rango antes de que el
    // resto de la lógica (que sí es genérica) llegue a evaluarlo.
    //
    // CORREGIDO (11/09/2026): `numero` ya NO es único a nivel de campo —
    // era un índice único global, así que una segunda `Sesion { numero: 1
    // }` para un programa distinto (Motorista/Pesados, ver
    // ARQUITECTURA_BACKEND.md) habría chocado como duplicado contra la
    // `Sesion { numero: 1 }` de `estandar`. La unicidad real es por
    // `{ programaContenido, numero }` (ver índice compuesto más abajo).
    numero: { type: Number, required: true, min: 1, max: 4 },

    // NUEVO (11/09/2026): qué currículo pertenece esta sesión — mismo
    // espíritu que `Plan.programa`/`Inscripcion.programa`. Sin enum
    // cerrado a propósito, por los mismos motivos que esos dos campos
    // (no pagar una migración de esquema cuando se agregue un programa
    // nuevo). Decisión de diseño ya cerrada con la fundadora (ver
    // ARQUITECTURA_BACKEND.md): `Sesion`/`ContenidoSesion`/`Examen` no
    // se duplican por programa, se distinguen con este campo.
    // `ContenidoSesion` y `Examen` no necesitan su propio campo — ambos
    // referencian `sesionId`, así que quedan filtrados transitivamente.
    programaContenido: { type: String, default: "estandar" },

    titulo: { type: String, required: true },
    teoria: { type: String, default: "" }, // HTML/Markdown
    videos: { type: [videoSchema], default: [] },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Único por programa, no global — mismo patrón ya usado en
// `Plan.index({ programa: 1, codigo: 1 })`.
sesionSchema.index({ programaContenido: 1, numero: 1 }, { unique: true });

module.exports = mongoose.model("Sesion", sesionSchema);
