const mongoose = require("mongoose");

// Copia deliberada del esquema de DestinatarioNotificacion.js, en una
// colección separada — para que la lista de avisos de práctica nunca se
// mezcle con la lista administrativa (vouchers, balance, empresas).
const destinatarioPracticaSchema = new mongoose.Schema(
  {
    tipo: { type: String, enum: ["email", "telegram"], required: true },
    valor: { type: String, required: true, trim: true },
    etiqueta: { type: String, required: true, trim: true },
    activo: { type: Boolean, default: true },
    creadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "DestinatarioPractica",
  destinatarioPracticaSchema,
);
