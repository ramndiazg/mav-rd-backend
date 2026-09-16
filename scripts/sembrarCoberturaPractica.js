/**
 * Siembra de cobertura de práctica de manejo — Muvo RD Vial (13/09/2026)
 *
 * Crea las filas iniciales de MunicipioPractica con los 8 municipios ya
 * confirmados (ver ANALISIS_COBERTURA_PRACTICA.md, "Diseño de datos",
 * punto 3). Después de esto, crecer la cobertura es cosa del panel
 * /admin/cobertura-practica — este script es solo para el arranque.
 *
 * USO:
 *   node scripts/sembrarCoberturaPractica.js
 *     → dry-run: muestra qué se crearía, no escribe nada.
 *
 *   node scripts/sembrarCoberturaPractica.js --confirmar
 *     → lo crea de verdad (upsert — correr dos veces no duplica nada).
 */

require("dotenv").config();
const mongoose = require("mongoose");
const MunicipioPractica = require("../src/models/MunicipioPractica");

const modoReal = process.argv.includes("--confirmar");

const COBERTURA_INICIAL = [
  { provincia: "Distrito Nacional", municipio: "Distrito Nacional" },
  { provincia: "Santo Domingo", municipio: "Santo Domingo Este" },
  { provincia: "Santo Domingo", municipio: "Santo Domingo Oeste" },
  { provincia: "Santo Domingo", municipio: "Santo Domingo Norte" },
  { provincia: "Santiago", municipio: "Santiago" },
  { provincia: "San Cristobal", municipio: "San Cristobal" },
  { provincia: "Santiago", municipio: "Navarrete" },
  { provincia: "Monsenor Nouel", municipio: "Bonao" },
];

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

  for (const fila of COBERTURA_INICIAL) {
    const existente = await MunicipioPractica.findOne({
      provincia: fila.provincia,
      municipio: fila.municipio,
    });

    console.log(
      existente
        ? `  Ya existe: ${fila.provincia} / ${fila.municipio} (activo: ${existente.activo})`
        : `  Por crear: ${fila.provincia} / ${fila.municipio}`,
    );

    if (modoReal && !existente) {
      await MunicipioPractica.create({
        provincia: fila.provincia,
        municipio: fila.municipio,
        activo: true,
      });
      console.log(`    → creado.`);
    }
  }

  if (!modoReal) {
    console.log(
      "\nModo dry-run — no se creó nada. Corre con --confirmar para crearlo de verdad.",
    );
  } else {
    console.log(
      "\nListo. Entra a /admin/cobertura-practica para agregar más municipios cuando corresponda.",
    );
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Error sembrando cobertura de práctica:", error);
  process.exit(1);
});
