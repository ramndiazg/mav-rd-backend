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
  },
  { timestamps: true },
);

module.exports = mongoose.model("ProgresoEstudiante", progresoSchema);
