/**
 * Purga de usuarios de prueba (todos los roles) — Muvo RD Vial
 *
 * A diferencia de purgarDatosPrueba.js (versión 06/08/2026), este script:
 *   - Borra TODOS los usuarios excepto maria@test.com, SIN IMPORTAR ROL
 *     (estudiante, coordinadora, admin, conductor) — criterio confirmado
 *     el 06/09/2026: no hay pagos reales confirmados todavía.
 *   - Incluye en la cascada TestPsicologico e Instructor, que no existían
 *     cuando se escribió el script original.
 *   - NO toca Sesion, Examen ni ContenidoSesion — esas colecciones ya
 *     tienen contenido real (con bugs pendientes de corregir aparte, ver
 *     DATABASE.md y ARQUITECTURA_BACKEND.md) y no deben borrarse aquí.
 *   - NO toca movimientosContables — igual que el script original. Si
 *     llegara a haber algún pago de prueba confirmado ahí, hay que
 *     identificarlo y borrarlo aparte a mano, porque no está enlazado
 *     directamente a userId en el esquema actual.
 *
 * USO:
 *   node scripts/purgarUsuariosPrueba.js
 *     → dry-run (por defecto): cuenta y muestra qué se borraría, incluido
 *       el desglose por rol, sin borrar nada. Corre esto primero, siempre.
 *
 *   node scripts/purgarUsuariosPrueba.js --confirmar
 *     → modo real. Aun así pide escribir BORRAR a mano antes de tocar la
 *       base de datos.
 *
 * Antes de correr en modo real: confirma que ya hiciste el backup manual
 * (Docker + mongodump + 7-Zip + Dropbox) — ver HISTORIAL_MODIFICACIONES.md.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const readline = require("readline");

const User = require("../src/models/User");
const IntentoExamen = require("../src/models/IntentoExamen");
const ProgresoEstudiante = require("../src/models/ProgresoEstudiante");
const Inscripcion = require("../src/models/Inscripcion");
const Diploma = require("../src/models/Diploma");
const TestPsicologico = require("../src/models/TestPsicologico");
const Instructor = require("../src/models/Instructor");

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

  const admin = await User.findOne({ email: EMAIL_A_CONSERVAR });
  console.log(
    `Cuenta que SOBREVIVE: ${admin ? `${admin.email} (rol: ${admin.rol})` : "⚠️  NO SE ENCONTRÓ ninguna cuenta con ese correo — revisa el email antes de continuar."}`,
  );

  const usuariosABorrar = await User.find({
    email: { $ne: EMAIL_A_CONSERVAR },
  }).select("_id email rol");

  console.log(`\nTotal de usuarios a borrar: ${usuariosABorrar.length}`);

  const porRol = {};
  for (const u of usuariosABorrar) {
    porRol[u.rol] = (porRol[u.rol] || 0) + 1;
  }
  console.log("\nDesglose por rol (revisa que no haya nada inesperado aquí):");
  for (const [rol, cantidad] of Object.entries(porRol)) {
    console.log(`  ${rol}: ${cantidad}`);
  }

  const idsABorrar = usuariosABorrar.map((u) => u._id);

  const conteos = {
    inscripciones: await Inscripcion.countDocuments({
      userId: { $in: idsABorrar },
    }),
    intentosExamen: await IntentoExamen.countDocuments({
      userId: { $in: idsABorrar },
    }),
    progresoEstudiante: await ProgresoEstudiante.countDocuments({
      userId: { $in: idsABorrar },
    }),
    diplomas: await Diploma.countDocuments({ userId: { $in: idsABorrar } }),
    testsPsicologicos: await TestPsicologico.countDocuments({
      userId: { $in: idsABorrar },
    }),
    instructores: await Instructor.countDocuments({
      userId: { $in: idsABorrar },
    }),
  };

  console.log("\nDatos asociados que se van a borrar en cascada:");
  for (const [coleccion, cantidad] of Object.entries(conteos)) {
    console.log(`  ${coleccion}: ${cantidad}`);
  }

  console.log(
    "\nColecciones que este script NO toca (a propósito): sesiones, examenes, " +
      "contenidoSesion, movimientosContables.",
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
  await Inscripcion.deleteMany({ userId: { $in: idsABorrar } });
  await IntentoExamen.deleteMany({ userId: { $in: idsABorrar } });
  await ProgresoEstudiante.deleteMany({ userId: { $in: idsABorrar } });
  await Diploma.deleteMany({ userId: { $in: idsABorrar } });
  await TestPsicologico.deleteMany({ userId: { $in: idsABorrar } });
  await Instructor.deleteMany({ userId: { $in: idsABorrar } });
  await User.deleteMany({ email: { $ne: EMAIL_A_CONSERVAR } });

  console.log("Listo. Solo queda la cuenta de maria@test.com.");
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Error durante la purga:", error);
  process.exit(1);
});
