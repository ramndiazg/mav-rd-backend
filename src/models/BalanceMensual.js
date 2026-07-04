const mongoose = require("mongoose");

const balanceMensualSchema = new mongoose.Schema(
  {
    mes: { type: Number, required: true, min: 1, max: 12 },
    anio: { type: Number, required: true },
    totalEntradas: { type: Number, required: true },
    totalSalidas: { type: Number, required: true },
    saldo: { type: Number, required: true },
    urlPDF: { type: String, required: true },
    generadoAutomaticamente: { type: Boolean, default: true },
    generadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fechaGeneracion: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// No puede haber dos balances guardados para el mismo mes/año
balanceMensualSchema.index({ mes: 1, anio: 1 }, { unique: true });

module.exports = mongoose.model("BalanceMensual", balanceMensualSchema);
