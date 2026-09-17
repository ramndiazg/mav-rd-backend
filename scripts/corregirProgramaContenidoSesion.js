// backend/scripts/corregirProgramaContenidoSesion.js
//
// Corrige las Sesion originales de "estandar" que quedaron sin el campo
// `programaContenido` guardado en Mongo (se agregó al schema el
// 11/09/2026 con default, pero el default no se retro-escribe en
// documentos que ya existían). Sin esto, `Sesion.findOne({ numero,
// programaContenido: "estandar" })` no las encuentra — causa del error
// "Sesión no encontrada" reportado el 17/09/2026 (plan estándar y grupo
// tipo colegio).
//
// USO:
//   node scripts/corregirProgramaContenidoSesion.js
//     → dry-run (por defecto): solo muestra cuántas sesiones están afectadas.
//
//   node scripts/corregirProgramaContenidoSesion.js --confirmar
//     → lo aplica de verdad.

require("dotenv").config();
const mongoose = require("mongoose");

const Sesion = require("../src/models/Sesion");

const modoReal = process.argv.includes("--confirmar");

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

  // Busca documentos donde el campo genuinamente no existe (no donde
  // valga null o "estandar" ya escrito).
  const afectadas = await Sesion.find({
    programaContenido: { $exists: false },
  }).select("numero titulo");

  console.log(
    `--- Sesiones sin \`programaContenido\` guardado: ${afectadas.length} ---`,
  );
  afectadas.forEach((s) => {
    console.log(`  numero ${s.numero} — "${s.titulo}"`);
  });

  if (!modoReal) {
    console.log(
      "\nModo dry-run — no se escribió nada. Corre con --confirmar para aplicar de verdad.",
    );
    await mongoose.disconnect();
    return;
  }

  console.log("\nAplicando...");
  const resultado = await Sesion.updateMany(
    { programaContenido: { $exists: false } },
    { $set: { programaContenido: "estandar" } },
  );

  console.log(`Listo. Sesiones corregidas: ${resultado.modifiedCount}.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Error durante la corrección:", error);
  process.exit(1);
});
