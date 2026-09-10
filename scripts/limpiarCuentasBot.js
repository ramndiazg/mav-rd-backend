/**
 * Limpieza de cuentas creadas por el ataque de registro masivo (10/09/2026)
 *
 * Contexto: un bot estuvo creando cuentas de estudiante con datos
 * aleatorios contra POST /api/auth/registro (nombre/apellido tipo
 * "GFWXIqlBmnkezJHPUuUPcQqM", correos reales de dominios variados,
 * cédula tipo "IJPEuFgDjCuNReYorTHskL"). Ver ARQUITECTURA_BACKEND.md,
 * sección "Seguridad — ataque de registro masivo", para el diagnóstico
 * completo y las protecciones que ya se agregaron (rate limiting +
 * CAPTCHA + honeypot) para que esto no vuelva a pasar.
 *
 * Criterio de detección (deliberadamente conservador — prefiere dejar
 * algún bot sin borrar antes que borrar a alguien real por error):
 *   1. rol: "estudiante"
 *   2. grupoId: null — nunca borra a nadie de un Grupo (esas cuentas las
 *      crea Muvo a mano desde un roster real, no pueden venir del bot).
 *   3. cedula compuesta SOLO de letras, sin un solo dígito — ninguna
 *      cédula dominicana ni pasaporte real es puramente alfabético; en
 *      todas las cuentas del bot que se revisaron a mano, la cédula no
 *      tenía NINGÚN dígito. Es la señal más confiable y mecánica que se
 *      encontró (más segura que el patrón del nombre, que en teoría
 *      alguien real podría tener).
 *   4. Sin ninguna Inscripcion (nunca pagó) — capa de seguridad extra,
 *      nunca borra a nadie con algo pagado en el sistema sin importar
 *      qué tan rara se vea su cédula.
 *
 * USO:
 *   node scripts/limpiarCuentasBot.js
 *     → dry-run (por defecto): muestra cuántas se borrarían + una
 *       muestra de las primeras 10, sin tocar la base de datos. Corre
 *       esto primero, siempre, y revisa la muestra a ojo.
 *
 *   node scripts/limpiarCuentasBot.js --confirmar
 *     → modo real. Pide escribir BORRAR a mano antes de tocar la base de
 *       datos.
 *
 * Antes de correr en modo real: confirma que ya hiciste el backup manual.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const readline = require("readline");

const User = require("../src/models/User");
const Inscripcion = require("../src/models/Inscripcion");
const IntentoExamen = require("../src/models/IntentoExamen");
const ProgresoEstudiante = require("../src/models/ProgresoEstudiante");
const Diploma = require("../src/models/Diploma");
const TestPsicologico = require("../src/models/TestPsicologico");
const InformacionComplementariaEscolar = require("../src/models/InformacionComplementariaEscolar");

const modoReal = process.argv.includes("--confirmar");

// Solo letras (mayúsculas o minúsculas), de principio a fin — ni un
// dígito, ni un guion, ni un espacio.
const CEDULA_SOLO_LETRAS = /^[A-Za-z]+$/;

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

  const candidatas = await User.find({
    rol: "estudiante",
    grupoId: null,
    cedula: { $regex: CEDULA_SOLO_LETRAS },
  }).select("_id nombre apellido cedula email createdAt");

  console.log(
    `Cuentas con cédula solo de letras (rol estudiante, sin grupo): ${candidatas.length}`,
  );

  if (candidatas.length === 0) {
    console.log("Nada que revisar. No se borró nada.");
    await mongoose.disconnect();
    return;
  }

  const idsCandidatas = candidatas.map((u) => u._id);

  const idsConInscripcion = new Set(
    (
      await Inscripcion.find({ userId: { $in: idsCandidatas } }).select(
        "userId",
      )
    ).map((i) => String(i.userId)),
  );

  const aBorrar = candidatas.filter(
    (u) => !idsConInscripcion.has(String(u._id)),
  );
  const conservadasPorInscripcion = candidatas.length - aBorrar.length;

  console.log(
    `  De esas, con alguna Inscripcion (NO se tocan): ${conservadasPorInscripcion}`,
  );
  console.log(`  A borrar: ${aBorrar.length}\n`);

  console.log(
    "Muestra de las primeras 10 a borrar (revisa que se vean como bots):",
  );
  for (const u of aBorrar.slice(0, 10)) {
    console.log(
      `  - ${u.nombre} ${u.apellido} | cédula: ${u.cedula} | ${u.email} | creado: ${u.createdAt?.toISOString().slice(0, 10)}`,
    );
  }

  if (aBorrar.length === 0) {
    console.log("\nNada que borrar tras aplicar todos los filtros.");
    await mongoose.disconnect();
    return;
  }

  const idsABorrar = aBorrar.map((u) => u._id);

  const conteos = {
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
    informacionComplementariaEscolar:
      await InformacionComplementariaEscolar.countDocuments({
        userId: { $in: idsABorrar },
      }),
  };
  console.log(
    "\nDatos asociados que se van a borrar en cascada (debería ser todo 0 — estas cuentas nunca pasaron del registro):",
  );
  for (const [coleccion, cantidad] of Object.entries(conteos)) {
    console.log(`  ${coleccion}: ${cantidad}`);
  }

  if (!modoReal) {
    console.log(
      "\nModo dry-run — no se borró nada. Revisa la muestra de arriba y corre con --confirmar si se ve bien.",
    );
    await mongoose.disconnect();
    return;
  }

  console.log(
    "\n⚠️  Esto es IRREVERSIBLE. Confirma que ya hiciste el backup manual.",
  );
  const respuesta = await preguntar(
    `Escribe BORRAR (en mayúsculas) para eliminar estas ${aBorrar.length} cuentas, o cualquier otra cosa para cancelar: `,
  );

  if (respuesta !== "BORRAR") {
    console.log("Cancelado. No se borró nada.");
    await mongoose.disconnect();
    return;
  }

  console.log("\nBorrando...");
  await IntentoExamen.deleteMany({ userId: { $in: idsABorrar } });
  await ProgresoEstudiante.deleteMany({ userId: { $in: idsABorrar } });
  await Diploma.deleteMany({ userId: { $in: idsABorrar } });
  await TestPsicologico.deleteMany({ userId: { $in: idsABorrar } });
  await InformacionComplementariaEscolar.deleteMany({
    userId: { $in: idsABorrar },
  });
  await User.deleteMany({ _id: { $in: idsABorrar } });

  console.log(`Listo. Se borraron ${aBorrar.length} cuentas.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Error durante la limpieza:", error);
  process.exit(1);
});
