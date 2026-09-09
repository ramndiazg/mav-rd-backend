const mongoose = require("mongoose");

// Cuestionario informativo para el programa Escolar — reemplaza por
// completo al TestPsicologico para estas estudiantes (ver
// ESPECIFICACION_PROGRAMAS_NUEVOS.md, sección 2). Deliberadamente NO es
// una versión corta del test psicológico: no tiene ningún eje de
// autocontrol/estrés/emociones/percepción de riesgo, y su framing es
// "cuestionario de perfil", nunca "test psicológico". Cubre 4 ejes con
// escala 1-5 (12 preguntas) más 2 preguntas abiertas — ver el orden
// exacto de las 12 en BANCO_PREGUNTAS_ESCOLAR del frontend:
//   1-4  Conocimiento previo de educación vial
//   5-7  Experiencia práctica como peatón/pasajero/ciclista
//   8-10 Logística de aprendizaje
//   11-12 Contexto de manejo en el hogar
//
// PENDIENTE (ver ESPECIFICACION_PROGRAMAS_NUEVOS.md sección 5, punto 3):
// este set de 14 preguntas todavía no ha pasado revisión legal (Ley
// 172-13) — no usar con estudiantes reales hasta confirmar esa revisión.
const informacionComplementariaEscolarSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // una sola vez por estudiante, igual que TestPsicologico
    },

    // 12 respuestas de escala, mismo formato que TestPsicologico: 1=Nunca,
    // 2=Casi nunca, 3=A veces, 4=Casi siempre, 5=Siempre.
    respuestas: {
      type: [Number],
      required: true,
      validate: {
        validator: (arr) =>
          arr.length === 12 &&
          arr.every((v) => Number.isInteger(v) && v >= 1 && v <= 5),
        message:
          "Se esperaban exactamente 12 respuestas, cada una entre 1 y 5.",
      },
    },

    // 2 respuestas abiertas: "qué le gustaría aprender del curso" y "cómo
    // prefiere que le avisen de un examen disponible". A diferencia de las
    // reflexiones de TestPsicologico, aquí sí son parte central del
    // cuestionario (no un anexo sensible opcional), pero se dejan
    // opcionales por consistencia con el mismo patrón de UX.
    reflexiones: {
      type: [String],
      default: ["", ""],
      validate: {
        validator: (arr) => arr.length === 2,
        message: "Se esperaban exactamente 2 respuestas abiertas.",
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "InformacionComplementariaEscolar",
  informacionComplementariaEscolarSchema,
);
