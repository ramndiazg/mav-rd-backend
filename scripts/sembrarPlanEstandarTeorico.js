/**
 * Siembra del plan "estandar"/"teorico" — Muvo RD Vial (13/09/2026)
 *
 * Crea (o actualiza si ya existe) el cuarto plan dentro de
 * `programa: "estandar"`: mismo código "teorico" que ya usan
 * Motorizados/Pesados, pero como combinación distinta
 * (programa="estandar" + codigo="teorico") — no choca con esos (ver
 * ANALISIS_COBERTURA_PRACTICA.md, decisión 1).
 *
 * Precio PROVISIONAL en RD$0 — se define después desde /admin/planes
 * (con programa=estandar), tal como quedó decidido en el análisis: no
 * hacía falta decidirlo en el documento.
 *
 * USO:
 *   node scripts/sembrarPlanEstandarTeorico.js
 *     → dry-run: muestra qué se crearía/actualizaría, no escribe nada.
 *
 *   node scripts/sembrarPlanEstandarTeorico.js --confirmar
 *     → lo crea de verdad.
 *
 *   node scripts/sembrarPlanEstandarTeorico.js --confirmar --precio=2500
 *     → mismo, con un precio real en vez del provisional RD$0.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Plan = require("../src/models/Plan");

const modoReal = process.argv.includes("--confirmar");

function leerArg(nombre, porDefecto) {
  const arg = process.argv.find((a) => a.startsWith(`--${nombre}=`));
  if (!arg) return porDefecto;
  const valor = Number(arg.split("=")[1]);
  return Number.isFinite(valor) ? valor : porDefecto;
}

const PRECIO = leerArg("precio", 0);

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error("No encontré MONGODB_URI ni MONGO_URI en el .env.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(
    `Conectado a Mongo. Modo: ${modoReal ? "REAL (va a crear)" : "DRY-RUN (solo muestra)"}\n`,
  );

  const existente = await Plan.findOne({
    programa: "estandar",
    codigo: "teorico",
  });
  console.log(
    existente
      ? `Plan "estandar"/"teorico": ya existe — precio actual RD$${existente.precio}`
      : `Plan "estandar"/"teorico": nuevo — se crearía a RD$${PRECIO}`,
  );

  if (modoReal) {
    await Plan.findOneAndUpdate(
      { programa: "estandar", codigo: "teorico" },
      {
        programa: "estandar",
        codigo: "teorico",
        nombre: "Plan Solo Teórico",
        precio: PRECIO,
        fraseDestacada:
          "El mismo curso teórico completo, sin práctica de manejo presencial.",
        caracteristicas: [
          "Acceso completo al curso teórico (4 sesiones + exámenes)",
          "Sin práctica de manejo incluida — disponible cuando tu municipio tenga cobertura",
          "Diploma al completar la teoría",
        ],
        activo: true,
        // orden 4: después de fundacion (1), normal (2) y vip (3) — se
        // muestra al final de la comparación de planes en /inscripcion.
        orden: 4,
      },
      { upsert: true, new: true, runValidators: true },
    );
    console.log('Plan "estandar"/"teorico" creado/actualizado.');
  } else {
    console.log(
      "\nModo dry-run — no se creó nada. Corre con --confirmar para crearlo de verdad.",
    );
  }

  if (modoReal) {
    console.log(
      "\nAjusta el precio real desde /admin/planes (selecciona Categoría 02 — Livianos) si quedó en RD$0.",
    );
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Error sembrando el plan estandar/teorico:", error);
  process.exit(1);
});
