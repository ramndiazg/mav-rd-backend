const mongoose = require("mongoose");

// Reemplaza precio_plan_normal/precio_plan_vip, que vivían sueltos en
// Configuracion. Con 3 planes y varios atributos por plan (duración de
// sesión, cantidad de sesiones, costo de combustible, características),
// una colección propia es más clara que seguir agregando llaves sueltas.
const planSchema = new mongoose.Schema(
  {
    // Qué currículo enseña este plan. Hoy solo existe "estandar" (el único
    // programa real), pero se deja abierto (no enum cerrado) porque ya se
    // sabe que van a llegar más adelante: escolar, empresarial, motorista
    // — cada uno con sus propios planes. NO se restringe con enum a
    // propósito, para no tener que tocar este schema cada vez que se
    // agregue un programa nuevo.
    programa: { type: String, required: true, default: "estandar" },

    codigo: {
      // NUEVO (13/09/2026): "teorico" — un solo plan por programa para
      // Motorizados/Pesados, sin niveles (no hay práctica de manejo de por
      // medio). Ver ANALISIS_MOTORISTA_PESADOS.md, sección 7, pregunta 2
      // (resuelta 13/09/2026).
      type: String,
      enum: ["fundacion", "normal", "vip", "teorico"],
      required: true,
    },
    nombre: { type: String, required: true },
    precio: { type: Number, required: true },

    // Copy corto para las tarjetas del Home (una línea, "algo llamativo").
    fraseDestacada: { type: String, required: true },

    // "grupal" = práctica en grupo, sin número fijo de sesiones por
    // estudiante (plan Fundación). "individual" = sesiones 1 a 1 con un
    // instructor (Normal y VIP). NUEVO (13/09/2026): opcional a nivel de
    // esquema — un plan "teorico" (Motorizados/Pesados) no tiene práctica
    // de manejo, así que no tiene con qué llenar este campo ni los otros 3
    // de abajo de forma honesta (ver ANALISIS_MOTORISTA_PESADOS.md,
    // sección 3). Queda como responsabilidad de quien siembra los datos
    // dejarlos sin llenar para planes "teorico", no del esquema.
    modalidadPractica: {
      type: String,
      enum: ["grupal", "individual"],
      required: false,
    },
    // null cuando modalidadPractica es "grupal" (no aplica un número fijo),
    // o cuando el plan no tiene práctica de manejo en absoluto (teorico).
    cantidadSesionesPractica: { type: Number, default: null },
    duracionSesionMinutos: { type: Number, required: false },

    // Combustible — puramente informativo. Se paga en el lugar de la
    // práctica, directo al instructor; no se cobra ni se registra dentro
    // de la app. NUEVO (13/09/2026): opcional, ver nota de
    // modalidadPractica arriba.
    costoPorSesion: { type: Number, required: false },

    // Lista larga para el detalle en /inscripcion (el Home solo usa
    // fraseDestacada, no esta lista).
    caracteristicas: { type: [String], default: [] },

    activo: { type: Boolean, default: true },
    orden: { type: Number, required: true }, // orden de aparición en las tarjetas
  },
  { timestamps: true },
);

// Único por programa, no global — así "vip" de Motorista, el día que
// exista, no choca con "vip" de estandar.
planSchema.index({ programa: 1, codigo: 1 }, { unique: true });

module.exports = mongoose.model("Plan", planSchema);
