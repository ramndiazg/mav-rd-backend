const mongoose = require("mongoose");

const contenidoPaginaSchema = new mongoose.Schema(
  {
    clave: { type: String, required: true, unique: true },
    valor: { type: String, required: true }, // texto, HTML, URL o JSON serializado
    tipo: {
      type: String,
      enum: ["texto", "html", "url", "json"],
      default: "texto",
    },
    actualizadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ContenidoPagina", contenidoPaginaSchema);
