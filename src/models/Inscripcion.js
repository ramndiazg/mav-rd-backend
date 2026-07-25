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
      // 'pendiente'             -> flujo viejo, coordinadora crea en efectivo/presencial
      // 'pendiente_verificacion' -> flujo nuevo, estudiante subió voucher, falta revisión
      // 'pagado'                -> confirmado (por cualquiera de los dos flujos)
      // 'rechazado'             -> la coordinadora revisó el voucher y no procede
      enum: ["pendiente", "pendiente_verificacion", "pagado", "rechazado"],
      default: "pendiente",
    },
    metodoPago: { type: String, default: "efectivo" },
    fechaPago: { type: Date, default: null },
    confirmadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // --- NUEVO: auto-inscripción con transferencia/depósito ---
    comprobanteUrl: { type: String, default: null }, // imagen del voucher (Cloudinary)
    bancoEmisor: { type: String, default: null },
    numeroReferencia: {
      type: String,
      default: null,
      unique: true,
      sparse: true, // el índice único solo aplica cuando el campo existe
    },
    fechaDeposito: { type: Date, default: null },
    notaRechazo: { type: String, default: null }, // motivo si la coordinadora rechaza
  },
  { timestamps: true },
);

module.exports = mongoose.model("Inscripcion", inscripcionSchema);
