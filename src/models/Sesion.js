const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false },
);

const sesionSchema = new mongoose.Schema(
  {
    numero: { type: Number, required: true, unique: true, min: 1, max: 3 },
    titulo: { type: String, required: true },
    teoria: { type: String, default: "" }, // HTML/Markdown
    videos: { type: [videoSchema], default: [] },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Sesion", sesionSchema);
