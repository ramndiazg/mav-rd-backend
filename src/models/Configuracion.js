const mongoose = require("mongoose");

const configuracionSchema = new mongoose.Schema(
  {
    clave: { type: String, required: true, unique: true, trim: true },
    valor: { type: mongoose.Schema.Types.Mixed, required: true },
    actualizadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Configuracion", configuracionSchema);
