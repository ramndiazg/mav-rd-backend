const mongoose = require("mongoose");

const diplomaSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    codigoVerificacion: { type: String, required: true, unique: true },
    fechaEmision: { type: Date, default: Date.now },
    generadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    urlPDF: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Diploma", diplomaSchema);
