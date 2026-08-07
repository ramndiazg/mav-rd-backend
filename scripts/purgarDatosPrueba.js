/**
 * Purga de datos de prueba — Muvo RD Vial
 *
 * Borra TODO excepto la cuenta admin de la fundadora (maria@test.com):
 * usuarios, sesiones, examenes, contenido de estudio, intentos de examen,
 * progreso de estudiante, inscripciones y diplomas.
 *
 * NO toca: configuracion, destinatariosNotificacion, noticias, testimonios,
 * faqs, contenidoPagina, movimientosContables, balancesMensuales.
 *
 * USO:
 *   node scripts/purgarDatosPrueba.js
 *     → modo de prueba (dry-run): solo CUENTA y MUESTRA qué se borraría,
 *       no borra nada. Corre esto primero, siempre.
 *
 *   node scripts/purgarDatosPrueba.js --confirmar
 *     → modo real. Aun así te va a pedir escribir BORRAR a mano antes de
 *       tocar la base de datos.
 *
 * Antes de correr en modo real: confirma que ya hiciste el backup manual
 * (Docker + mongodump + 7-Zip + Dropbox) — ver HISTORIAL_MODIFICACIONES.md.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const readline = require("readline");

const User = require("../src/models/User");
const Sesion = require("../src/models/Sesion");
const Examen = require("../src/models/Examen");
const ContenidoSesion = require("../src/models/ContenidoSesion");
const IntentoExamen = require("../src/models/IntentoExamen");
const ProgresoEstudiante = require("../src/models/ProgresoEstudiante");
const Inscripcion = require("../src/models/Inscripcion");
const Diploma = require("../src/models/Diploma");

const EMAIL_A_CONSERVAR = "maria@test.com";
const modoReal = process.argv.includes("--confirmar");

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
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error(
      "No encontré la variable de entorno MONGODB_URI (ni MONGO_URI). " +
        "Revisa el nombre exacto en tu .env y ajústalo en este script si es distinto.",
    );
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(
    `Conectado a Mongo. Modo: ${modoReal ? "REAL (va a borrar)" : "DRY-RUN (solo cuenta)"}\n`,
  );

  const conteos = {
    "users (excepto admin)": await User.countDocuments({
      email: { $ne: EMAIL_A_CONSERVAR },
    }),
    sesiones: await Sesion.countDocuments({}),
    examenes: await Examen.countDocuments({}),
    contenidoSesion: await ContenidoSesion.countDocuments({}),
    intentosExamen: await IntentoExamen.countDocuments({}),
    progresoEstudiante: await ProgresoEstudiante.countDocuments({}),
    inscripciones: await Inscripcion.countDocuments({}),
    diplomas: await Diploma.countDocuments({}),
  };

  console.log("Esto es lo que se va a borrar:");
  for (const [coleccion, cantidad] of Object.entries(conteos)) {
    console.log(`  ${coleccion}: ${cantidad}`);
  }

  const admin = await User.findOne({ email: EMAIL_A_CONSERVAR });
  console.log(
    `\nCuenta que SOBREVIVE: ${admin ? `${admin.email} (rol: ${admin.rol})` : "⚠️  NO SE ENCONTRÓ ninguna cuenta con ese correo — revisa el email antes de continuar."}`,
  );

  if (!modoReal) {
    console.log(
      "\nModo dry-run — no se borró nada. Corre con --confirmar para borrar de verdad.",
    );
    await mongoose.disconnect();
    return;
  }

  if (!admin) {
    console.error(
      "\nAbortado: no existe la cuenta admin a conservar. No se borró nada.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(
    "\n⚠️  Esto es IRREVERSIBLE. Confirma que ya hiciste el backup manual.",
  );
  const respuesta = await preguntar(
    "Escribe BORRAR (en mayúsculas) para continuar, o cualquier otra cosa para cancelar: ",
  );

  if (respuesta !== "BORRAR") {
    console.log("Cancelado. No se borró nada.");
    await mongoose.disconnect();
    return;
  }

  console.log("\nBorrando...");
  await User.deleteMany({ email: { $ne: EMAIL_A_CONSERVAR } });
  await Sesion.deleteMany({});
  await Examen.deleteMany({});
  await ContenidoSesion.deleteMany({});
  await IntentoExamen.deleteMany({});
  await ProgresoEstudiante.deleteMany({});
  await Inscripcion.deleteMany({});
  await Diploma.deleteMany({});

  console.log("Listo. Base de datos purgada — solo queda la cuenta admin.");
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Error durante la purga:", error);
  process.exit(1);
});
