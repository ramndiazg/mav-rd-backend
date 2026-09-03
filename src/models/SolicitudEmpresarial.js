const mongoose = require("mongoose");

// NUEVO (28/08/2026): antes el formulario de /empresas solo enviaba una
// notificación por correo/Telegram, sin quedar registrado en ningún
// lado — si Resend fallaba o el mensaje se perdía, no había forma de
// saber que ese lead existió. Este modelo agrega persistencia real,
// sin quitar el mecanismo de notificación que ya funciona bien (ambos
// corren juntos, ver controllers/empresasController.js).
const solicitudEmpresarialSchema = new mongoose.Schema(
  {
    nombreEmpresa: { type: String, required: true, trim: true },
    contacto: { type: String, required: true, trim: true },
    cargo: { type: String, default: null },
    telefono: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    cantidadEstudiantes: { type: Number, default: null },
    mensaje: { type: String, default: null },

    // Para que la fundadora (o el chatbot) sepan si ya se le dio
    // seguimiento a este lead, sin depender de memoria o de buscar en
    // el correo.
    contactado: { type: Boolean, default: false },
  },
  { timestamps: true },
);

solicitudEmpresarialSchema.index({ createdAt: -1 });

module.exports = mongoose.model(
  "SolicitudEmpresarial",
  solicitudEmpresarialSchema,
);
