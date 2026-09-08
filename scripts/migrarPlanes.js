/**
 * Migración de planes — Muvo RD Vial (06/09/2026)
 *
 * Dos cosas en un solo script:
 *   1. Crea (o actualiza si ya existen) los 3 documentos de `Plan`:
 *      fundacion, normal, vip — reemplazan los precios sueltos que vivían
 *      en Configuracion (precio_plan_normal / precio_plan_vip).
 *   2. Reetiqueta las Inscripcion existentes con tipoPlan "normal" (al
 *      precio viejo de RD$1,500) a "fundacion" — es el mismo plan de
 *      entrada, solo cambia el nombre. Las que ya son "vip" no se tocan:
 *      el precio nuevo (RD$7,500) aplica hacia adelante, no retroactivo.
 *
 * USO:
 *   node scripts/migrarPlanes.js
 *     → dry-run (por defecto): muestra qué se crearía/actualizaría/
 *       reetiquetaría, no escribe nada en la base de datos.
 *
 *   node scripts/migrarPlanes.js --confirmar
 *     → lo aplica de verdad.
 */

require("dotenv").config();
const mongoose = require("mongoose");

const Plan = require("../src/models/Plan");
const Inscripcion = require("../src/models/Inscripcion");

const modoReal = process.argv.includes("--confirmar");

const PLANES = [
  {
    programa: "estandar",
    codigo: "fundacion",
    nombre: "Plan de la Fundación Mujeres al Volante",
    precio: 1500,
    fraseDestacada:
      "La puerta de entrada a la educación vial, con el respaldo de nuestra fundación.",
    modalidadPractica: "grupal",
    cantidadSesionesPractica: null,
    duracionSesionMinutos: 15,
    costoPorSesion: 300,
    caracteristicas: [
      "Acceso completo al curso teórico (4 sesiones + exámenes)",
      "Práctica de manejo en grupo, sesiones de 15 minutos por estudiante",
      "Aporte de combustible de RD$300 por sesión práctica (se paga en el lugar de la práctica)",
      "Diploma al completar la teoría y la práctica",
      "La opción más accesible, sin perder el acompañamiento real de un instructor",
    ],
    activo: true,
    orden: 1,
  },
  {
    programa: "estandar",
    codigo: "normal",
    nombre: "Plan Normal",
    precio: 4500,
    fraseDestacada: "Tu ritmo, tu instructor, tu manera de aprender a manejar.",
    modalidadPractica: "individual",
    cantidadSesionesPractica: 8,
    duracionSesionMinutos: 60,
    costoPorSesion: 500,
    caracteristicas: [
      "Acceso completo al curso teórico (4 sesiones + exámenes)",
      "Práctica de manejo individual: 8 sesiones de 60 minutos con un instructor asignado",
      "Aporte de combustible de RD$500 por sesión práctica (se paga en el lugar de la práctica)",
      "Diploma al completar la teoría y la práctica",
    ],
    activo: true,
    orden: 2,
  },
  {
    programa: "estandar",
    codigo: "vip",
    nombre: "Plan VIP",
    precio: 7500,
    fraseDestacada:
      "La preparación completa: de la teoría a tu licencia, acompañada en cada paso.",
    modalidadPractica: "individual",
    cantidadSesionesPractica: 10,
    duracionSesionMinutos: 60,
    costoPorSesion: 500,
    caracteristicas: [
      "Todo lo incluido en el plan Normal",
      "Práctica de manejo individual: 10 sesiones de 60 minutos con un instructor asignado",
      "Acompañamiento al INTRANT",
      "Preparación específica para el examen teórico del INTRANT",
      "Instrucciones para el examen del permiso de aprendizaje",
      "Instrucciones para el examen práctico de obtención de la licencia",
      "Aporte de combustible de RD$500 por sesión práctica (se paga en el lugar de la práctica)",
    ],
    activo: true,
    orden: 3,
  },
];

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error("No encontré MONGODB_URI ni MONGO_URI en el .env.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(
    `Conectado a Mongo. Modo: ${modoReal ? "REAL (va a escribir)" : "DRY-RUN (solo muestra)"}\n`,
  );

  console.log("--- Planes a crear/actualizar ---");
  for (const plan of PLANES) {
    const existente = await Plan.findOne({
      programa: plan.programa,
      codigo: plan.codigo,
    });
    if (existente) {
      console.log(
        `  ${plan.programa}/${plan.codigo}: ya existe — precio actual RD$${existente.precio} -> RD$${plan.precio}`,
      );
    } else {
      console.log(
        `  ${plan.programa}/${plan.codigo}: nuevo — se crearía a RD$${plan.precio}`,
      );
    }
  }

  const inscripcionesAMigrar = await Inscripcion.countDocuments({
    tipoPlan: "normal",
  });
  console.log(
    `\n--- Inscripciones con tipoPlan "normal" que se reetiquetarían a "fundacion": ${inscripcionesAMigrar} ---`,
  );

  if (!modoReal) {
    console.log(
      "\nModo dry-run — no se escribió nada. Corre con --confirmar para aplicar de verdad.",
    );
    await mongoose.disconnect();
    return;
  }

  console.log("\nAplicando...");
  for (const plan of PLANES) {
    await Plan.findOneAndUpdate(
      { programa: plan.programa, codigo: plan.codigo },
      plan,
      { upsert: true, new: true, runValidators: true },
    );
  }
  const resultado = await Inscripcion.updateMany(
    { tipoPlan: "normal" },
    { tipoPlan: "fundacion", programa: "estandar" },
  );

  console.log(
    `Listo. Planes creados/actualizados. Inscripciones reetiquetadas: ${resultado.modifiedCount}.`,
  );
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Error durante la migración:", error);
  process.exit(1);
});
