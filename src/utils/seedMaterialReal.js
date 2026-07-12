// node src/utils/seedMaterialReal.js — correr una vez para poblar
// contenidoSesion con el material real de estudio (de MUVO / Mujeres al
// Volante RD), organizado en las 3 sesiones reales del sistema.
//
// Requiere que la carpeta "html" (con los 13 archivos) esté en la MISMA
// carpeta que este script.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Sesion = require("../models/Sesion");
const ContenidoSesion = require("../models/ContenidoSesion");

function leer(nombreArchivo) {
  return fs.readFileSync(path.join(__dirname, "html", nombreArchivo), "utf-8");
}

// { numeroSesion, titulo, archivo, orden }
const materiales = [
  // --- Sesión 1: Introducción a la Ley de Tránsito ---
  {
    numero: 1,
    titulo: "La Ley 63-17 y el INTRANT",
    archivo: "s1_01_ley_63_17.html",
    orden: 1,
  },
  {
    numero: 1,
    titulo: "Permiso de Aprendizaje: cómo obtenerlo",
    archivo: "s1_02_permiso_aprendizaje.html",
    orden: 2,
  },
  {
    numero: 1,
    titulo: "Documentos y límites de velocidad al conducir",
    archivo: "s1_03_documentos_limites_velocidad.html",
    orden: 3,
  },

  // --- Sesión 2: Señalización y normas viales ---
  {
    numero: 2,
    titulo: "Tipos de señales de tránsito y semáforos",
    archivo: "s2_01_senales_transito.html",
    orden: 1,
  },
  {
    numero: 2,
    titulo: "Normas de circulación y preferencia de paso",
    archivo: "s2_02_normas_preferencia_paso.html",
    orden: 2,
  },
  {
    numero: 2,
    titulo: "Formación Vial para Motocicletas (Minimanual)",
    archivo: "s2_03_formacion_motocicletas.html",
    orden: 3,
  },

  // --- Sesión 3: Buenas prácticas de conducción ---
  {
    numero: 3,
    titulo: "Conducción y aptitudes: manejo preventivo y defensivo",
    archivo: "s3_01_conduccion_aptitudes.html",
    orden: 1,
  },
  {
    numero: 3,
    titulo: "Función y mantenimiento de las luces del vehículo",
    archivo: "s3_02_luces_vehiculo.html",
    orden: 2,
  },
  {
    numero: 3,
    titulo: "Sistemas de Seguridad Activa y Pasiva",
    archivo: "s3_03_seguridad_activa_pasiva.html",
    orden: 3,
  },
  {
    numero: 3,
    titulo: "Cómo controlar el acelerador",
    archivo: "s3_04_acelerador.html",
    orden: 4,
  },
  {
    numero: 3,
    titulo: "Uso del cinturón y consejos de manejo defensivo",
    archivo: "s3_05_cinturon_manejo_defensivo.html",
    orden: 5,
  },
  {
    numero: 3,
    titulo: "Frenos ABS y Sistema ESP",
    archivo: "s3_06_frenos_abs_esp.html",
    orden: 6,
  },
  {
    numero: 3,
    titulo: "El casco: seguridad para motociclistas",
    archivo: "s3_07_el_casco.html",
    orden: 7,
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Conectado a MongoDB Atlas");

  for (const item of materiales) {
    const sesion = await Sesion.findOne({ numero: item.numero });
    if (!sesion) {
      console.log(
        `✗ No existe la Sesión ${item.numero} — saltando "${item.titulo}"`,
      );
      continue;
    }

    const contenidoTexto = leer(item.archivo);

    await ContenidoSesion.findOneAndUpdate(
      { sesionId: sesion._id, titulo: item.titulo },
      {
        sesionId: sesion._id,
        titulo: item.titulo,
        tipo: "texto",
        contenidoTexto,
        orden: item.orden,
        activo: true,
      },
      { upsert: true, new: true },
    );
    console.log(`✓ Sesión ${item.numero} — ${item.titulo}`);
  }

  console.log("Seed de material real completo.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
