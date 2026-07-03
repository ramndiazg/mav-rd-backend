const mongoose = require("mongoose");

const inscripcionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tipoPlan: { type: String, enum: ["normal", "vip"], required: true },
    monto: { type: Number, required: true },
    estadoPago: {
      type: String,
      enum: ["pendiente", "pagado"],
      default: "pendiente",
    },
    metodoPago: { type: String, default: "efectivo" },
    fechaPago: { type: Date, default: null },
    confirmadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Inscripcion", inscripcionSchema);
