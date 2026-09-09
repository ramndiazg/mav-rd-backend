const mongoose = require("mongoose");

const grupoSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      enum: ["colegio", "empresa"],
      required: true,
    },
    nombreInstitucion: { type: String, required: true, trim: true },
    contactoNombre: { type: String, required: true, trim: true },
    contactoEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    contactoTelefono: { type: String, required: true, trim: true },

    // Total negociado con la institución, no por estudiante. Se rellena
    // a mano en el Formulario 1. El prorrateo contable real (ver
    // MovimientosContables) se calcula al confirmar el roster, dividiendo
    // esto entre cantidadEstudiantesReal (no este estimado).
    precioAcordado: { type: Number, required: true },

    // Solo referencia del Formulario 1 — la cantidad real que manda el
    // prorrateo es la longitud del roster confirmado en el Formulario 2.
    cantidadEstudiantesEstimada: { type: Number, required: true },

    // Se fija cuando se confirma el roster (Formulario 2), NO cuando se
    // crea el grupo — de aquí cuentan las 24h para el primer reporte
    // diario. Mientras pendienteRoster sea true, este campo queda null.
    fechaInicio: { type: Date, default: null },

    // true hasta que se cargue el roster real (Formulario 2). Mientras
    // esté en true: no hay estudiantes creados, no hay movimientos
    // contables, y el cron de reporte diario ignora este grupo.
    pendienteRoster: { type: Boolean, default: true },

    // false cuando todos los estudiantes completan el curso (apagado
    // automático por el cron de reporte diario) o a mano como respaldo
    // si la institución quiere cortar el reporte antes de tiempo.
    activo: { type: Boolean, default: true },

    notas: { type: String, default: null },

    creadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Grupo", grupoSchema);
