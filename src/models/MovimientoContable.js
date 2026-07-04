const mongoose = require("mongoose");

const movimientoContableSchema = new mongoose.Schema(
  {
    tipo: { type: String, enum: ["entrada", "salida"], required: true },
    categoria: {
      type: String,
      enum: [
        "inscripcion",
        "sueldo",
        "materiales",
        "transporte",
        "publicidad",
        "otro",
      ],
      required: true,
    },
    monto: { type: Number, required: true, min: 0 },
    descripcion: { type: String, default: "" },
    fecha: { type: Date, default: Date.now },
    inscripcionRelacionadaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inscripcion",
      default: null,
    },
    registradoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// Índice para acelerar las agregaciones mensuales (balance por mes/año)
movimientoContableSchema.index({ fecha: 1 });

module.exports = mongoose.model("MovimientoContable", movimientoContableSchema);
