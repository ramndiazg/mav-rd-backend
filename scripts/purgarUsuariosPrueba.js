/**
 * Purga de datos de prueba — Muvo RD Vial
 *
 * AMPLIADO (11/09/2026) para dejar la base lista para producción,
 * empezando de cero salvo la cuenta admin de prueba. Antes de esta
 * versión el script solo borraba usuarios y su cascada directa
 * (inscripciones, exámenes, progreso, diplomas, test psicológico,
 * instructores) pero dejaba huérfanos:
 *   - `CuestionarioEscolar` — nunca se agregó a la cascada cuando se
 *     creó esa colección (bug encontrado y corregido acá).
 *   - `Grupo` — quedaban instituciones "vacías" sin ningún estudiante.
 *   - `MovimientoContable` / `BalanceMensual` — toda la contabilidad.
 *
 * De paso: existía un `purgarDatosPrueba.js` con contenido IDÉNTICO a
 * este archivo (quedó sin borrar de una versión anterior) — se eliminó,
 * este es el único script de purga del proyecto.
 *
 * Qué borra (todo excepto la cuenta EMAIL_A_CONSERVAR):
 *   - User (todos los roles: estudiante, coordinadora, admin, conductor)
 *   - En cascada por userId: Inscripcion, IntentoExamen,
 *     ProgresoEstudiante, Diploma, TestPsicologico, CuestionarioEscolar,
 *     Instructor.
 *   - Grupo — completo, sin filtrar (no tiene sentido dejar una
 *     institución sin ningún estudiante).
 *   - MovimientoContable y BalanceMensual — completos, sin filtrar (no
 *     están enlazados a userId en el esquema actual, así que no se
 *     puede filtrar por estudiante; se borran todos).
 *
 * Qué NO borra (a propósito, es contenido del curso, no datos de
 * prueba de una persona): Sesion, Examen, ContenidoSesion, Plan,
 * SolicitudEmpresarial (leads del formulario de /empresas — si también
 * quieres limpiarlos, agrégalo a mano, no se asumió aquí).
 *
 * USO:
 *   node scripts/purgarUsuariosPrueba.js
 *     → dry-run (por defecto): cuenta y muestra qué se borraría, sin
 *       borrar nada. Corre esto primero, siempre.
 *
 *   node scripts/purgarUsuariosPrueba.js --confirmar
 *     → modo real. Aun así pide escribir BORRAR a mano antes de tocar
 *       la base de datos.
 *
 * Antes de correr en modo real: (1) haz el backup manual (Docker +
 * mongodump + 7-Zip + Dropbox — ver HISTORIAL_MODIFICACIONES.md), y
 * (2) si vas a desplegar el fix del índice de Sesion en el mismo
 * momento, dropea el índice viejo `numero_1` en Atlas antes o después,
 * es independiente de esta purga (ver ARQUITECTURA_BACKEND.md).
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
const CuestionarioEscolar = require("../src/models/CuestionarioEscolar");
const Instructor = require("../src/models/Instructor");
const Grupo = require("../src/models/Grupo");
const MovimientoContable = require("../src/models/MovimientoContable");
const BalanceMensual = require("../src/models/BalanceMensual");

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
    cuestionariosEscolares: await CuestionarioEscolar.countDocuments({
      userId: { $in: idsABorrar },
    }),
    instructores: await Instructor.countDocuments({
      userId: { $in: idsABorrar },
    }),
  };

  console.log("\nDatos asociados a esos usuarios que se van a borrar en cascada:");
  for (const [coleccion, cantidad] of Object.entries(conteos)) {
    console.log(`  ${coleccion}: ${cantidad}`);
  }

  const conteosGlobales = {
    grupos: await Grupo.countDocuments({}),
    movimientosContables: await MovimientoContable.countDocuments({}),
    balancesMensuales: await BalanceMensual.countDocuments({}),
  };

  console.log(
    "\nColecciones que se borran COMPLETAS, sin filtrar por usuario (no tiene sentido dejarlas huérfanas / no están enlazadas a userId):",
  );
  for (const [coleccion, cantidad] of Object.entries(conteosGlobales)) {
    console.log(`  ${coleccion}: ${cantidad}`);
  }

  console.log(
    "\nColecciones que este script NO toca (a propósito, es contenido del curso): " +
      "sesiones, examenes, contenidoSesion, planes, solicitudesEmpresariales.",
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
  await CuestionarioEscolar.deleteMany({ userId: { $in: idsABorrar } });
  await Instructor.deleteMany({ userId: { $in: idsABorrar } });
  await Grupo.deleteMany({});
  await MovimientoContable.deleteMany({});
  await BalanceMensual.deleteMany({});
  await User.deleteMany({ email: { $ne: EMAIL_A_CONSERVAR } });

  console.log("Listo. Solo queda la cuenta de maria@test.com.");
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Error durante la purga:", error);
  process.exit(1);
});
