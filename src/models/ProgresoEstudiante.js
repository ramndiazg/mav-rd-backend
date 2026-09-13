const mongoose = require("mongoose");

const progresoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // NUEVO (13/09/2026): espejo de Inscripcion.programa, seteado una sola
    // vez al confirmar el pago (ver inscripcionController.js#confirmarPago).
    // Existe para que obtenerSesionParaEstudiante (sesionController.js)
    // pueda filtrar `Sesion.findOne({ numero, programaContenido })` sin un
    // populate ni una consulta extra a Inscripcion en el path más caliente
    // del sistema — decisión ya documentada en ANALISIS_MOTORISTA_PESADOS.md,
    // sección 3. También decide, junto con Grupo, si a la estudiante le
    // aplica la práctica de manejo (ver utils/elegibilidadPractica.js).
    programa: { type: String, default: "estandar" },

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
