const mongoose = require("mongoose");

const preguntaSchema = new mongoose.Schema(
  {
    texto: { type: String, required: true },
    opciones: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => arr.length >= 2,
        message: "Cada pregunta debe tener al menos 2 opciones.",
      },
    },
    respuestaCorrectaIndex: { type: Number, required: true },
  },
  { _id: false },
);

const examenSchema = new mongoose.Schema(
  {
    sesionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sesion",
      required: true,
    },
    nombreVersion: { type: String, required: true }, // ej: "Versión A"
    preguntas: {
      type: [preguntaSchema],
      required: true,
      validate: {
        validator: (arr) => arr.length === 10,
        message: "Cada examen debe tener exactamente 10 preguntas.",
      },
    },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Examen", examenSchema);
