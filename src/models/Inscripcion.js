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
      // NUEVO (13/09/2026): "teorico" — plan único de Motorizados/Pesados,
      // sin niveles. Ver models/Plan.js y ANALISIS_MOTORISTA_PESADOS.md.
      type: String,
      enum: ["fundacion", "normal", "vip", "grupo", "teorico"],
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
      // BUG CORREGIDO (09/09/2026): tenía "default: null", que rompe el
      // propósito de "sparse" — un índice sparse solo excluye documentos
      // donde el campo está AUSENTE, no donde vale null explícito. Con el
      // default puesto, toda Inscripcion creada sin voucher (flujo
      // "efectivo" del admin, y ahora también cada estudiante de un
      // Grupo) terminaba con numeroReferencia: null guardado de verdad,
      // así que la segunda de esas chocaba contra la primera como
      // "duplicado". Sin default, mongoose deja el campo genuinamente
      // undefined cuando no se manda, y el índice sparse las excluye a
      // todas correctamente — la unicidad solo aplica cuando SÍ hay un
      // número de referencia real.
      default: undefined,
      unique: true,
      sparse: true, // el índice único solo aplica cuando el campo existe
    },
    fechaDeposito: { type: Date, default: null },
    notaRechazo: { type: String, default: null }, // motivo si la coordinadora rechaza
  },
  { timestamps: true },
);

module.exports = mongoose.model("Inscripcion", inscripcionSchema);
