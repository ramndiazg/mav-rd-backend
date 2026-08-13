/**
 * Eliminar un usuario de prueba específico — Muvo RD Vial
 *
 * A diferencia de purgarDatosPrueba.js (que borra TODOS los usuarios
 * excepto el admin), este script borra un solo usuario por email, junto
 * con su Inscripcion, IntentoExamen, ProgresoEstudiante y Diploma
 * asociados (en cascada, igual que el script grande).
 *
 * USO:
 *   node scripts/eliminarUsuarioPrueba.js correo@ejemplo.com
 *     → dry-run: muestra qué se borraría, no borra nada.
 *
 *   node scripts/eliminarUsuarioPrueba.js correo@ejemplo.com --confirmar
 *     → lo borra de verdad, pidiendo escribir BORRAR a mano.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const readline = require("readline");

const User = require("../src/models/User");
const IntentoExamen = require("../src/models/IntentoExamen");
const ProgresoEstudiante = require("../src/models/ProgresoEstudiante");
const Inscripcion = require("../src/models/Inscripcion");
const Diploma = require("../src/models/Diploma");

const modoReal = process.argv.includes("--confirmar");
const email = process.argv[2];

function preguntar(texto) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(texto, (respuesta) => {
      rl.close();
      resolve(respuesta.trim());
    });
  });
}

async function main() {
  if (!email || email.startsWith("--")) {
    console.error(
      "Uso: node scripts/eliminarUsuarioPrueba.js correo@ejemplo.com [--confirmar]",
    );
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error("No encontré MONGODB_URI ni MONGO_URI en el .env.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(
    `Conectado a Mongo. Modo: ${modoReal ? "REAL (va a borrar)" : "DRY-RUN (solo cuenta)"}\n`,
  );

  const usuario = await User.findOne({ email });
  if (!usuario) {
    console.log(
      `No encontré ningún usuario con el correo "${email}". No hay nada que borrar.`,
    );
    await mongoose.disconnect();
    return;
  }

  console.log(
    `Usuario encontrado: ${usuario.nombre} ${usuario.apellido} (${usuario.email}, rol: ${usuario.rol})`,
  );

  const conteos = {
    inscripciones: await Inscripcion.countDocuments({ userId: usuario._id }),
    intentosExamen: await IntentoExamen.countDocuments({ userId: usuario._id }),
    progresoEstudiante: await ProgresoEstudiante.countDocuments({
      userId: usuario._id,
    }),
    diplomas: await Diploma.countDocuments({ userId: usuario._id }),
  };

  console.log("\nEsto es lo que se va a borrar, además del usuario:");
  for (const [coleccion, cantidad] of Object.entries(conteos)) {
    console.log(`  ${coleccion}: ${cantidad}`);
  }

  if (!modoReal) {
    console.log(
      "\nModo dry-run — no se borró nada. Corre con --confirmar para borrar de verdad.",
    );
    await mongoose.disconnect();
    return;
  }

  const respuesta = await preguntar(
    `\nEscribe BORRAR para eliminar a ${usuario.email} y sus datos asociados: `,
  );
  if (respuesta !== "BORRAR") {
    console.log("Cancelado. No se borró nada.");
    await mongoose.disconnect();
    return;
  }

  await Inscripcion.deleteMany({ userId: usuario._id });
  await IntentoExamen.deleteMany({ userId: usuario._id });
  await ProgresoEstudiante.deleteMany({ userId: usuario._id });
  await Diploma.deleteMany({ userId: usuario._id });
  await User.deleteOne({ _id: usuario._id });

  console.log(`\nListo. Se borró a ${usuario.email} y sus datos asociados.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Error eliminando usuario:", error);
  process.exit(1);
});
