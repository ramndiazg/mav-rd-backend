const mongoose = require("mongoose");

const progresoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    sesionActualDesbloqueada: { type: Number, default: 0 },
    sesionesAprobadas: { type: [Number], default: [] },
    cursoCompletado: { type: Boolean, default: false },
    contenidosVistos: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "ContenidoSesion" }],
      default: [],
    },
    fechasAprobacionSesion: {
      type: [{ sesion: Number, fecha: Date }],
      default: [],
    },

    // NUEVO (05/09/2026): seguimiento de práctica. cursoCompletado marca
    // que terminó la teoría (4 sesiones + 4 exámenes); practicaAprobada es
    // un paso adicional y separado que confirma un chofer real, y es
    // requisito para poder generar el diploma (ver diplomaController.js).
    practicaAprobada: { type: Boolean, default: false },
    fechaAprobacionPractica: { type: Date, default: null },
    practicaAprobadaPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ProgresoEstudiante", progresoSchema);
