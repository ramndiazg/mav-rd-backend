const mongoose = require("mongoose");

const contenidoSesionSchema = new mongoose.Schema(
  {
    sesionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sesion",
      required: true,
    },
    titulo: { type: String, required: true },
    tipo: {
      type: String,
      enum: ["video", "pdf", "enlace", "texto"],
      required: true,
    },
    // Para 'video' (URL de embed de YouTube), 'pdf' o 'enlace' (URL directa)
    url: { type: String },
    // Para 'texto' (HTML/Markdown corto, ej. un resumen o instrucciones)
    contenidoTexto: { type: String },
    // NUEVO: imagen de portada opcional, para cualquier tipo de contenido —
    // hace la lista de materiales más vistosa (ej. una miniatura del tema).
    imagenUrl: { type: String },
    orden: { type: Number, default: 0 },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ContenidoSesion", contenidoSesionSchema);
