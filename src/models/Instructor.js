const mongoose = require("mongoose");

// Un día/horario en el que el chofer da práctica. Sin validación de
// formato de hora a propósito — se guarda como texto libre ("8:00 AM",
// "2:00 - 5:00 PM") para no complicar el formulario del panel de admin.
const diaDisponibleSchema = new mongoose.Schema(
  {
    dia: {
      type: String,
      enum: [
        "lunes",
        "martes",
        "miercoles",
        "jueves",
        "viernes",
        "sabado",
        "domingo",
      ],
      required: true,
    },
    horario: { type: String, required: true }, // ej: "2:00 PM - 5:00 PM"
  },
  { _id: false },
);

// Perfil extendido de un User con rol "conductor". Nombre/teléfono/correo
// ya viven en User — aquí solo va lo que es exclusivo del chofer.
const instructorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    diasDisponibles: { type: [diaDisponibleSchema], default: [] },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Instructor", instructorSchema);
