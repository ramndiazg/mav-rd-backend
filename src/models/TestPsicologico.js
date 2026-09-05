const mongoose = require("mongoose");

// Digitaliza SOLO las secciones A-H del "Test de Perfil Psicológico y
// Conductual" en papel — las 54 preguntas de escala (Nunca=1 ...
// Siempre=5) y las 5 preguntas de reflexión abierta. Las secciones I/J/K
// del documento original (indicadores del evaluador, perfil orientativo,
// recomendación) requieren criterio profesional humano y, a propósito,
// NO se digitalizaron — decisión explícita del 04/09/2026 (ver
// HISTORIAL_MODIFICACIONES.md). Este modelo tampoco calcula ningún
// promedio o puntaje por sección: el instrumento mezcla preguntas en
// sentido positivo y negativo a propósito, así que un promedio simple
// daría un número que parece objetivo pero no lo es. La coordinadora ve
// las respuestas crudas, igual que si leyera el papel.
const testPsicologicoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // una sola vez por estudiante, igual que el diploma
    },

    // 54 respuestas, en el mismo orden que BANCO_PREGUNTAS del frontend
    // (secciones A-G). Cada valor: 1=Nunca, 2=Casi nunca, 3=A veces,
    // 4=Casi siempre, 5=Siempre.
    respuestas: {
      type: [Number],
      required: true,
      validate: {
        validator: (arr) =>
          arr.length === 54 &&
          arr.every((v) => Number.isInteger(v) && v >= 1 && v <= 5),
        message:
          "Se esperaban exactamente 54 respuestas, cada una entre 1 y 5.",
      },
    },

    // 5 respuestas abiertas (sección H). Opcionales — el instrumento no
    // exige responderlas todas, y son las más sensibles (mencionan
    // incidentes/accidentes previos).
    reflexiones: {
      type: [String],
      default: ["", "", "", "", ""],
      validate: {
        validator: (arr) => arr.length === 5,
        message: "Se esperaban exactamente 5 respuestas de reflexión.",
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("TestPsicologico", testPsicologicoSchema);
