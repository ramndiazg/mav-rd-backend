const mongoose = require("mongoose");

const TIPOS_REPORTE = ["tecnico", "contenido", "pago", "otro"];
const ESTADOS_REPORTE = ["abierto", "en_revision", "resuelto"];

// Hilo de respuestas dentro de un reporte — no es chat en tiempo real,
// es una conversación asíncrona (mismo espíritu que un ticket).
const respuestaSchema = new mongoose.Schema(
  {
    autor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rolAutor: {
      type: String,
      enum: ["estudiante", "coordinadora", "admin"],
      required: true,
    },
    mensaje: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: "fecha", updatedAt: false } },
);

const reporteSchema = new mongoose.Schema(
  {
    estudianteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tipo: { type: String, enum: TIPOS_REPORTE, required: true },
    // Solo se usa cuando tipo === "otro" — descripción corta libre.
    tipoOtro: { type: String, trim: true, default: null },
    mensaje: { type: String, required: true, trim: true },
    estado: {
      type: String,
      enum: ESTADOS_REPORTE,
      default: "abierto",
    },
    respuestas: [respuestaSchema],
  },
  { timestamps: true },
);

reporteSchema.statics.TIPOS = TIPOS_REPORTE;
reporteSchema.statics.ESTADOS = ESTADOS_REPORTE;

module.exports = mongoose.model("Reporte", reporteSchema);
