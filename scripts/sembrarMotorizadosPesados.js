/**
 * Siembra de Motorizados y Pesados — Muvo RD Vial (13/09/2026)
 *
 * Crea lo mínimo para que los dos programas nuevos existan en el sistema,
 * siguiendo la decisión de diseño ya cerrada (ver
 * ANALISIS_MOTORISTA_PESADOS.md): `Sesion`/`Examen`/`ContenidoSesion` no
 * se duplican por programa, se distinguen con `programaContenido`.
 *
 *   1. Sesion: 4 sesiones por programa (motorizados, pesados), con
 *      títulos PROVISIONALES ("Sesión 1", "Sesión 2"...) y sin teoría —
 *      mismo patrón que crearSesionesIniciales.js usó para `estandar`.
 *      La coordinadora carga el contenido real y los exámenes (con
 *      VARIAS versiones activas por sesión desde el día uno, no una
 *      sola) desde el panel una vez sembradas.
 *   2. Plan: un plan "teorico" por programa (sin niveles, sin práctica
 *      de manejo) — precio PROVISIONAL en 0, a ajustar desde el panel de
 *      admin (Configuración → Planes) o con --precio-motorizados /
 *      --precio-pesados.
 *
 * IMPORTANTE — paso de despliegue previo (ver ANALISIS_MOTORISTA_PESADOS.md,
 * sección 6, punto 3): el índice viejo `numero_1` de `Sesion` en Atlas
 * tiene que estar dropeado (o haberse corrido `syncIndexes()`) ANTES de
 * correr este script con --confirmar, o Mongo va a rechazar como
 * duplicado cualquier `Sesion { numero: 1 }` de Motorizados que choque
 * con la de `estandar`. Si el modelo ya se desplegó después del
 * 11/09/2026, mongoose ya creó el índice compuesto correcto y esto no
 * aplica — solo es un riesgo si el índice viejo quedó de una base
 * anterior a esa fecha.
 *
 * USO:
 *   node scripts/sembrarMotorizadosPesados.js
 *     → dry-run: muestra qué se crearía, no escribe nada.
 *
 *   node scripts/sembrarMotorizadosPesados.js --confirmar
 *     → lo crea de verdad.
 *
 *   node scripts/sembrarMotorizadosPesados.js --confirmar --precio-motorizados=3500 --precio-pesados=4500
 *     → mismo, con precios reales en vez del provisional RD$0.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Sesion = require("../src/models/Sesion");
const Plan = require("../src/models/Plan");

const modoReal = process.argv.includes("--confirmar");

function leerArg(nombre, porDefecto) {
  const arg = process.argv.find((a) => a.startsWith(`--${nombre}=`));
  if (!arg) return porDefecto;
  const valor = Number(arg.split("=")[1]);
  return Number.isFinite(valor) ? valor : porDefecto;
}

const PRECIO_MOTORIZADOS = leerArg("precio-motorizados", 0);
const PRECIO_PESADOS = leerArg("precio-pesados", 0);

const PROGRAMAS = [
  {
    programaContenido: "motorizados",
    nombrePlan: "Curso Teórico — Categoría 01 (Motocicletas)",
    precio: PRECIO_MOTORIZADOS,
    fraseDestacada: "Categoría 01 — para conductores de motocicleta, la teoría completa de la Ley 63-17.",
  },
  {
    programaContenido: "pesados",
    nombrePlan: "Curso Teórico — Categoría 03/04 (Vehículos Pesados)",
    precio: PRECIO_PESADOS,
    fraseDestacada: "Categoría 03/04 — para conductores de camiones y trailers, la teoría completa de la Ley 63-17.",
  },
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

  for (const programa of PROGRAMAS) {
    console.log(`--- ${programa.programaContenido} ---`);

    const sesionesExistentes = await Sesion.find({
      programaContenido: programa.programaContenido,
    }).sort({ numero: 1 });
    const numerosExistentes = sesionesExistentes.map((s) => s.numero);
    const sesionesPorCrear = [1, 2, 3, 4].filter(
      (n) => !numerosExistentes.includes(n),
    );

    console.log(
      `  Sesiones que ya existen: ${numerosExistentes.length === 0 ? "ninguna" : numerosExistentes.join(", ")}`,
    );
    console.log(
      `  Sesiones por crear: ${sesionesPorCrear.length === 0 ? "ninguna" : sesionesPorCrear.join(", ")}`,
    );

    const planExistente = await Plan.findOne({
      programa: programa.programaContenido,
      codigo: "teorico",
    });
    console.log(
      planExistente
        ? `  Plan "teorico": ya existe — precio actual RD$${planExistente.precio}`
        : `  Plan "teorico": nuevo — se crearía a RD$${programa.precio}`,
    );

    if (modoReal) {
      for (const numero of sesionesPorCrear) {
        await Sesion.create({
          numero,
          programaContenido: programa.programaContenido,
          titulo: `Sesión ${numero}`,
          teoria: "",
          videos: [],
          activo: true,
        });
        console.log(`  Creada: Sesión ${numero} (${programa.programaContenido})`);
      }

      await Plan.findOneAndUpdate(
        { programa: programa.programaContenido, codigo: "teorico" },
        {
          programa: programa.programaContenido,
          codigo: "teorico",
          nombre: programa.nombrePlan,
          precio: programa.precio,
          fraseDestacada: programa.fraseDestacada,
          caracteristicas: [
            "Acceso completo al curso teórico (4 sesiones + exámenes)",
            "Sin práctica de manejo incluida en este programa por ahora",
            "Diploma al completar la teoría",
          ],
          activo: true,
          orden: 1,
        },
        { upsert: true, new: true, runValidators: true },
      );
      console.log(`  Plan "teorico" de ${programa.programaContenido} creado/actualizado.`);
    }

    console.log("");
  }

  if (!modoReal) {
    console.log(
      "Modo dry-run — no se creó nada. Corre con --confirmar para crearlo de verdad.",
    );
  } else {
    console.log(
      "Listo. Entra al panel → Aula Virtual / Banco de exámenes y elige la pestaña " +
        "del programa nuevo para cargar contenido real y varias versiones de examen " +
        "por sesión. Ajusta el precio del plan desde el panel de admin si quedó en RD$0.",
    );
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Error sembrando Motorizados/Pesados:", error);
  process.exit(1);
});
