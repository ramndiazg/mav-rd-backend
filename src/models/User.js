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
      type: String,
      enum: ["estudiante", "coordinadora", "admin"],
      default: "estudiante",
    },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Nunca devolver el hash de la contraseña en las respuestas JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
