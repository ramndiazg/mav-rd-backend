/**
 * Crear las sesiones iniciales — Muvo RD Vial
 *
 * No existe (todavía) un endpoint POST /sesiones — el panel solo permite
 * EDITAR una sesión que ya existe (PATCH /sesiones/:numero), no crearla.
 * Las 3 sesiones originales se crearon directo en Atlas, no desde la app.
 * Este script hace lo mismo, pero registrado y repetible.
 *
 * Crea las sesiones 1-4 con títulos PROVISIONALES ("Sesión 1", "Sesión 2"...)
 * — cuando definas los temas reales, no hace falta volver a correr esto:
 * ya existe PATCH /sesiones/:numero para renombrarlas desde el panel de
 * coordinadora (Aula Virtual → esa pantalla no tiene UI para renombrar
 * todavía, pero se puede hacer con una petición PATCH directa, o le
 * agregamos un campo de edición al panel si prefieres).
 *
 * USO:
 *   node scripts/crearSesionesIniciales.js
 *     → dry-run: muestra qué sesiones ya existen y cuáles va a crear.
 *
 *   node scripts/crearSesionesIniciales.js --confirmar
 *     → las crea de verdad.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Sesion = require("../src/models/Sesion");

const modoReal = process.argv.includes("--confirmar");

const SESIONES_INICIALES = [
  { numero: 1, titulo: "Sesión 1" },
  { numero: 2, titulo: "Sesión 2" },
  { numero: 3, titulo: "Sesión 3" },
  { numero: 4, titulo: "Sesión 4" },
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

  const existentes = await Sesion.find({}).sort({ numero: 1 });
  console.log(
    `Sesiones que ya existen: ${existentes.length === 0 ? "ninguna" : existentes.map((s) => s.numero).join(", ")}`,
  );

  const porCrear = SESIONES_INICIALES.filter(
    (s) => !existentes.some((e) => e.numero === s.numero),
  );

  if (porCrear.length === 0) {
    console.log("\nNo hay nada por crear — las 4 sesiones ya existen.");
    await mongoose.disconnect();
    return;
  }

  console.log(
    `\nSe van a crear: ${porCrear.map((s) => `Sesión ${s.numero} ("${s.titulo}")`).join(", ")}`,
  );

  if (!modoReal) {
    console.log(
      "\nModo dry-run — no se creó nada. Corre con --confirmar para crearlas.",
    );
    await mongoose.disconnect();
    return;
  }

  for (const datos of porCrear) {
    await Sesion.create({
      numero: datos.numero,
      titulo: datos.titulo,
      teoria: "",
      videos: [],
      activo: true,
    });
    console.log(`Creada: Sesión ${datos.numero} ("${datos.titulo}")`);
  }

  console.log(
    "\nListo. Ya puedes entrar al panel → Aula Virtual → Contenido de estudio y al Banco de exámenes; las pestañas de sesión van a aparecer.",
  );
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Error creando sesiones:", error);
  process.exit(1);
});
