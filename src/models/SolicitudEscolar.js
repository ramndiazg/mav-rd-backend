const mongoose = require("mongoose");

// NUEVO (14/09/2026): mismo patrón que SolicitudEmpresarial (28/08/2026)
// pero para el formulario de contacto de /escolar. Un colegio que
// completa este formulario se convierte, si la fundadora lo aprueba, en
// un Grupo con tipo "colegio" (ver models/Grupo.js) — este modelo solo
// guarda el lead inicial, igual que el flujo de Empresas.
const solicitudEscolarSchema = new mongoose.Schema(
  {
    nombreColegio: { type: String, required: true, trim: true },
    contacto: { type: String, required: true, trim: true },
    cargo: { type: String, default: null },
    telefono: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    cantidadEstudiantes: { type: Number, default: null },
    mensaje: { type: String, default: null },

    // Para que la fundadora (o el chatbot) sepan si ya se le dio
    // seguimiento a este lead, sin depender de memoria o de buscar en
    // el correo. Mismo campo que SolicitudEmpresarial.
    contactado: { type: Boolean, default: false },
  },
  { timestamps: true },
);

solicitudEscolarSchema.index({ createdAt: -1 });

module.exports = mongoose.model("SolicitudEscolar", solicitudEscolarSchema);
