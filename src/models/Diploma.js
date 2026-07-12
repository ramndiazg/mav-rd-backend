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
    fechaEmision: { type: Date, required: true },
    generadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    urlPDF: { type: String, required: true },
    // NUEVO: public_id real en Cloudinary (sin extensión), necesario para
    // generar URLs de descarga firmadas que evitan el bloqueo de entrega
    // pública de PDF/ZIP de Cloudinary. Los diplomas generados antes de
    // este campo no lo tendrán — el controller tiene un respaldo que lo
    // deriva de urlPDF en ese caso.
    publicIdCloudinary: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Diploma", diplomaSchema);
