// Script para crear (o actualizar) las 3 sesiones base del curso.
// Uso: node src/utils/seedSesiones.js
// El contenido de "teoria" es un placeholder — se reemplaza con el contenido
// real basado en la Ley 63-17 de Tránsito Terrestre de RD y buenas prácticas
// de conducción, en una sesión de trabajo dedicada a contenido.

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Sesion = require("../models/Sesion");

const SESIONES_BASE = [
  {
    numero: 1,
    titulo: "Sesión 1: Introducción a la Ley de Tránsito",
    teoria:
      "<p>Contenido pendiente: introducción a la Ley 63-17 de Tránsito Terrestre de RD.</p>",
    videos: [],
  },
  {
    numero: 2,
    titulo: "Sesión 2: Señalización y normas viales",
    teoria:
      "<p>Contenido pendiente: señalización vial y normas de circulación.</p>",
    videos: [],
  },
  {
    numero: 3,
    titulo: "Sesión 3: Buenas prácticas de conducción",
    teoria: "<p>Contenido pendiente: mejores prácticas y manejo defensivo.</p>",
    videos: [],
  },
];

async function seed() {
  await connectDB();

  for (const data of SESIONES_BASE) {
    const resultado = await Sesion.findOneAndUpdate(
      { numero: data.numero },
      data,
      { upsert: true, new: true },
    );
    console.log(`✅ Sesión ${resultado.numero} lista: "${resultado.titulo}"`);
  }

  console.log("🎉 Seed de sesiones completado.");
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Error en seed:", err);
  process.exit(1);
});
