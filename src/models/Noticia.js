const mongoose = require("mongoose");

const comentarioSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    texto: { type: String, required: true, trim: true },
    fecha: { type: Date, default: Date.now },
  },
  { _id: true },
);

const noticiaSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true, trim: true },
    contenido: { type: String, required: true },
    imagenUrl: { type: String, default: null },
    videoEmbedUrl: { type: String, default: null },
    autorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comentarios: { type: [comentarioSchema], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Noticia", noticiaSchema);
