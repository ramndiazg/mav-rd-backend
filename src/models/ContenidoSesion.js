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
    // NUEVO: solo para 'pdf' subido como archivo (no un enlace externo
    // pegado a mano) — permite generar una URL de descarga FIRMADA al
    // momento, igual que con los diplomas. Si el pdf se cargó pegando un
    // link externo en vez de subir el archivo, este campo queda vacío y
    // se sirve `url` directo.
    publicIdCloudinary: { type: String },
    // Para 'texto' (HTML/Markdown corto, ej. un resumen o instrucciones)
    contenidoTexto: { type: String },
    // imagen de portada opcional, para cualquier tipo de contenido
    imagenUrl: { type: String },
    orden: { type: Number, default: 0 },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ContenidoSesion", contenidoSesionSchema);
