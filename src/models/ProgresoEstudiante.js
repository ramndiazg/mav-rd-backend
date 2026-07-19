const mongoose = require("mongoose");

const progresoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    sesionActualDesbloqueada: { type: Number, default: 0 }, // 0 = ninguna todavía
    sesionesAprobadas: { type: [Number], default: [] },
    cursoCompletado: { type: Boolean, default: false },
    // ids de ContenidoSesion que la estudiante ya marcó como vistos.
    // Cuando todos los contenidos activos de una sesión están aquí, el
    // backend desbloquea el examen de esa sesión automáticamente.
    contenidosVistos: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "ContenidoSesion" }],
      default: [],
    },
    // NUEVO: fecha exacta en que se aprobó cada sesión (por número de
    // sesión). Necesario para calcular la espera mínima de 24h antes de
    // habilitar el examen de la siguiente sesión.
    fechasAprobacionSesion: {
      type: [{ sesion: Number, fecha: Date }],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ProgresoEstudiante", progresoSchema);
