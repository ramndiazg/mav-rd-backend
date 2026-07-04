const mongoose = require("mongoose");

const testimonioSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    texto: { type: String, required: true, trim: true },
    fotoUrl: { type: String, default: null },
    orden: { type: Number, default: 0 },
    activo: { type: Boolean, default: true },
    creadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Testimonio", testimonioSchema);
