const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    apellido: { type: String, required: true, trim: true },
    // NUEVO (10/09/2026): dejó de ser "required" a nivel de esquema. Los
    // menores de un Grupo tipo colegio no tienen cédula, y escribir "N/A"
    // a mano chocaba con el índice unique de siempre en la segunda
    // estudiante sin cédula (dos documentos con el mismo texto "N/A" son
    // un duplicado real para Mongo). Se aplica el mismo patrón ya usado
    // en Inscripcion.numeroReferencia: default: undefined + sparse, para
    // que el índice único solo compare cédulas que SÍ existen — cualquier
    // cantidad de estudiantes sin cédula puede coexistir. Sigue siendo
    // obligatoria donde corresponde (autoregistro, crear coordinadora/
    // conductor): esos controladores la exigen ellos mismos antes de
    // llamar a User.create. En el roster de Grupo (grupoController.js)
    // ahora es opcional a propósito.
    cedula: {
      type: String,
      trim: true,
      default: undefined,
      unique: true,
      sparse: true,
    },
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

    // NUEVO (08/09/2026): referencia al Grupo (colegio/empresa) cuando el
    // estudiante fue inscrito en bloque por una institución. null para
    // todos los estudiantes que se autoregistran (flujo actual, sin
    // cambios). Determina si se le exige práctica de manejo para el
    // diploma (ver gate en diplomaController.js) y si su cuestionario
    // previo al curso es TestPsicologico o InformacionComplementariaEscolar.
    grupoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grupo",
      default: null,
    },

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
