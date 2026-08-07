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
    numero: { type: Number, required: true, unique: true, min: 1, max: 4 },
    titulo: { type: String, required: true },
    teoria: { type: String, default: "" }, // HTML/Markdown
    videos: { type: [videoSchema], default: [] },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Sesion", sesionSchema);
