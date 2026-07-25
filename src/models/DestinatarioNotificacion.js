const mongoose = require("mongoose");

const destinatarioSchema = new mongoose.Schema(
  {
    tipo: { type: String, enum: ["email", "telegram"], required: true },
    // 'email' -> dirección de correo. 'telegram' -> chat_id numérico (no el @usuario)
    valor: { type: String, required: true, trim: true },
    etiqueta: { type: String, required: true, trim: true }, // ej: "María (fundadora)"
    activo: { type: Boolean, default: true },
    creadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("DestinatarioNotificacion", destinatarioSchema);
