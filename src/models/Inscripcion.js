const mongoose = require("mongoose");

const inscripcionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Qué currículo cursa esta inscripción — hoy siempre "estandar" (es el
    // único programa que existe), pero se deja listo para cuando existan
    // escolar/empresarial/motorista. Deliberadamente separado de tipoPlan:
    // tipoPlan es el nivel de práctica/precio DENTRO de un programa, no el
    // programa en sí.
    programa: { type: String, required: true, default: "estandar" },

    tipoPlan: {
      // NUEVO (09/09/2026): "grupo" es exclusivo de estudiantes inscritas
      // en bloque por un Grupo (Escolar/Empresarial, ver Grupo.js) — no
      // tienen un nivel individual de plan como fundacion/normal/vip, el
      // precio es uno solo negociado con la institución
      // (Grupo.precioAcordado) y prorrateado entre el roster real al
      // confirmarlo (ver grupoController.js). No pasa por la colección
      // Plan en absoluto.
      type: String,
      enum: ["fundacion", "normal", "vip", "grupo"],
      required: true,
    },
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
