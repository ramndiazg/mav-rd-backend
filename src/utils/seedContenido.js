// node src/utils/seedContenido.js — correr una vez para poblar contenidoPagina
// con el texto real ya publicado en https://mujeresalvolanterd.weebly.com
require("dotenv").config();
const mongoose = require("mongoose");
const ContenidoPagina = require("../models/ContenidoPagina");

const bloques = [
  {
    clave: "acerca_de_historia",
    tipo: "html",
    valor:
      "Mujeres Al Volante República Dominicana nace el 25 de noviembre del 2017. Es una fundación sin fines de lucro dedicada a brindar clases de conducción a mujeres. A la fecha se han capacitado más de 45,000 mujeres, con la certeza de que adquieren los conocimientos y habilidades necesarias para circular por las vías públicas. Amas de casa y mujeres de la tercera edad también han encontrado en la fundación un espacio para aprender a conducir de forma gratuita.",
  },
  {
    clave: "acerca_de_fundadora",
    tipo: "html",
    valor:
      "María Díaz — Contable y Administradora, Master en Tráfico, Transporte y Seguridad Vial. Fundadora de Mujeres al Volante RD desde octubre de 2017. Pionera en el sistema de aprendizaje grupal entre mujeres para las prácticas de conducción, generando intercambio de conocimientos como parte del proceso de enseñanza. Gracias al apoyo de los presidentes de las empresas de transporte afiliadas a la CNTU en todo el territorio nacional, la fundación ha podido llegar a muchos rincones del país, beneficiando a jóvenes y mujeres con recursos económicos limitados.",
  },
  {
    clave: "acerca_de_frase",
    tipo: "texto",
    valor:
      "Conducir es una experiencia que trae cambios en tu vida: desarrolla tus habilidades y te enseña a tener control y confianza en ti misma.",
  },
  {
    clave: "kit_intrant_simulador_url",
    tipo: "url",
    valor: "https://ov.intrant.gob.do/#/login",
  },
  {
    clave: "kit_intrant_cita_url",
    tipo: "url",
    valor: "http://wsgeointrant.intrant.gob.do:82/Turnos/Turnos/Domini3",
  },
  {
    clave: "kit_minimanual_pdf_url",
    tipo: "url",
    valor:
      "https://mujeresalvolanterd.weebly.com/uploads/1/3/3/0/133017066/minimanual_de_educaci%C3%B3n_vial_para_principiantes%5E.pdf",
  },
  {
    // Lista completa de los 21 módulos en video, en el orden real del sitio.
    // El frontend puede JSON.parse(valor) y recorrer el arreglo.
    clave: "kit_video_modulos",
    tipo: "json",
    valor: JSON.stringify([
      {
        numero: 1,
        titulo: "Cómo obtener permiso o carnet de aprendizaje",
        youtubeId: "BHbcDoxo5gE",
      },
      {
        numero: 2,
        titulo: "Función, mantenimiento y luces del vehículo",
        youtubeId: "Jv403ccaECg",
      },
      {
        numero: 3,
        titulo: "Sistemas de seguridad: activa y pasiva",
        youtubeId: "uInih6eEb6Y",
      },
      {
        numero: 4,
        titulo: "¿Cómo controlar el acelerador?",
        youtubeId: "IdHEgFJ0Dfc",
      },
      {
        numero: 5,
        titulo: "Documentos y límites de velocidad al conducir",
        youtubeId: "HOHtd5nOpMc",
      },
      {
        numero: 6,
        titulo: "Uso de cinturón y consejos para manejar a la defensiva",
        youtubeId: "hewpYclkhbw",
      },
      {
        numero: 7,
        titulo: "Los frenos ABS y el sistema EPS",
        youtubeId: "1OPZLo9D808",
      },
      {
        numero: 8,
        titulo: "Seguridad activa al conducir",
        youtubeId: "-NyKElpAEtA",
      },
      {
        numero: 9,
        titulo: "Seguridad pasiva al conducir",
        youtubeId: "r_jgy5SOLUQ",
      },
      {
        numero: 10,
        titulo: "Función de las gomas o neumáticos",
        youtubeId: "KDHoVbK5l8o",
      },
      {
        numero: 11,
        titulo: "Cómo obtener el carnet de aprendizaje para conducir",
        youtubeId: "ON1qH31T3jQ",
      },
      {
        numero: 12,
        titulo: "Luces del vehículo y sus funciones",
        youtubeId: "79x232wH3aE",
      },
      {
        numero: 13,
        titulo: "El sistema eléctrico de un vehículo",
        youtubeId: "uVbQNieyoDQ",
      },
      { numero: 14, titulo: "Cinturón de seguridad", youtubeId: "7ePwqb_DWtM" },
      { numero: 15, titulo: "Manejo a la defensiva", youtubeId: "iJ57_jBWGnE" },
      { numero: 16, titulo: "Curvas al conducir", youtubeId: "hunWOzRs50M" },
      {
        numero: 17,
        titulo: "Situaciones climáticas al conducir",
        youtubeId: "SkqcpXALmMM",
      },
      {
        numero: 18,
        titulo: "Tips y maniobras para conducir",
        youtubeId: "_KK0Uw9sNxc",
      },
      {
        numero: 19,
        titulo: "Límites de velocidad al conducir",
        youtubeId: "oushiyxS2MI",
      },
      {
        numero: 20,
        titulo: "Vías y señales de tránsito según ubicación",
        youtubeId: "cb_eKHexbwE",
      },
      {
        numero: 21,
        titulo: "Imágenes en el tablero del auto (testigos)",
        youtubeId: "j62HXRxJ9tM",
      },
    ]),
  },
  {
    // Cada sede tiene su propio teléfono de contacto — datos reales del sitio actual
    clave: "contacto_lugares_practicas",
    tipo: "json",
    valor: JSON.stringify([
      {
        zona: "El Cibao (Villa González, Navarrete, Altamira, La Isabela, Villa Eliza, Agua Palma, Punta Rusia)",
        telefono: "+1 (829) 362-4810",
      },
      { zona: "Bonao", telefono: "+1 (809) 867-5848" },
      { zona: "La Romana", telefono: "+1 (809) 429-1855" },
      { zona: "Higüey", telefono: "+1 (829) 574-2713" },
      { zona: "Santo Domingo Oeste", telefono: "+1 (809) 839-1378" },
      { zona: "Santo Domingo Norte", telefono: "+1 (829) 613-0858" },
      { zona: "Santo Domingo Este", telefono: "+1 (829) 726-2382" },
      { zona: "Yamasá", telefono: "+1 (829) 340-6860" },
    ]),
  },
  {
    clave: "redes_instagram",
    tipo: "url",
    valor: "https://www.instagram.com/mujeresalvolanterd/",
  },
  {
    clave: "redes_facebook",
    tipo: "url",
    valor: "https://www.facebook.com/mujeresalvolanteRD/",
  },
  {
    clave: "redes_youtube",
    tipo: "url",
    valor: "https://www.youtube.com/channel/UCU-e7GD-4BMrciFAOzbDQnQ",
  },
  {
    clave: "contacto_email",
    tipo: "texto",
    valor: "testdevelopment9999@gmail.com",
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Conectado a MongoDB Atlas");

  for (const bloque of bloques) {
    await ContenidoPagina.findOneAndUpdate({ clave: bloque.clave }, bloque, {
      upsert: true,
      new: true,
    });
    console.log(`✓ ${bloque.clave}`);
  }

  console.log("Seed de contenidoPagina completo.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
