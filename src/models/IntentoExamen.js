const mongoose = require("mongoose");

const intentoExamenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sesionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sesion",
      required: true,
    },
    examenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Examen",
      required: true,
    },
    numeroIntento: { type: Number, required: true },
    respuestas: { type: [Number], default: null }, // null hasta que entrega
    calificacion: { type: Number, default: null }, // 0-100
    aprobado: { type: Boolean, default: null },
    desbloqueadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fechaInicio: { type: Date, default: null },
    fechaFin: { type: Date, default: null },
    tiempoLimiteSegundos: { type: Number, default: 1800 }, // 30 min
  },
  { timestamps: true },
);

module.exports = mongoose.model("IntentoExamen", intentoExamenSchema);
