const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    apellido: { type: String, required: true, trim: true },
    cedula: { type: String, required: true, unique: true, trim: true },
    telefono: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    provincia: { type: String, required: true },
    fechaNacimiento: { type: Date, required: true },
    rol: {
      // NUEVO: "conductor" (05/09/2026) — chofer que aprueba la práctica
      // antes de que la estudiante pueda recibir su diploma.
      type: String,
      enum: ["estudiante", "coordinadora", "admin", "conductor"],
      default: "estudiante",
    },
    activo: { type: Boolean, default: true },

    // --- Verificación de email ---
    emailVerificado: { type: Boolean, default: false },
    tokenVerificacionEmail: { type: String, default: null },
    tokenVerificacionExpira: { type: Date, default: null },

    // --- Recuperación de contraseña ---
    tokenRecuperacion: { type: String, default: null },
    tokenRecuperacionExpira: { type: Date, default: null },
  },
  { timestamps: true },
);

// Nunca devolver campos sensibles en las respuestas JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.tokenVerificacionEmail;
  delete obj.tokenRecuperacion;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
