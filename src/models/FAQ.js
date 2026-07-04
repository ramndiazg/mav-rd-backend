const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema(
  {
    pregunta: { type: String, required: true, trim: true },
    respuesta: { type: String, required: true, trim: true },
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

module.exports = mongoose.model("FAQ", faqSchema);
