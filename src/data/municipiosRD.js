// Datos de referencia — provincias y municipios de República Dominicana.
// Fuente única para poblar los <select> encadenados de provincia→municipio
// en /registro, /inscripcion y /admin/cobertura-practica (ver
// ANALISIS_COBERTURA_PRACTICA.md, sección "Diseño de datos", punto 1).
//
// Los nombres de provincia coinciden EXACTAMENTE (mismo texto, sin tildes)
// con el array PROVINCIAS que ya vive en app/registro/page.tsx — es lo que
// queda guardado en User.provincia, así que cualquier diferencia rompería
// el cruce provincia→municipios en el frontend y la validación de
// cobertura en el backend.
//
// IMPORTANTE — pendiente de verificación (13/09/2026): esta lista (32
// provincias, ~158-160 municipios) se compiló a partir de fuentes públicas
// generales (Wikipedia, ONE/JCE, statoids.com), NO se descargó un archivo
// oficial único y verificado línea por línea contra la Junta Central
// Electoral / ONE como recomienda el análisis original. Antes de ir a
// producción con esto, vale la pena un pase de verificación rápido
// (sobre todo en las provincias con municipios menos conocidos —
// San Cristóbal, Monte Plata, San Pedro de Macorís) para descartar algún
// nombre desactualizado o un municipio de creación reciente que falte.
// Un error aquí es silencioso: nadie lo nota hasta que una estudiante de
// ese lugar no encuentra su municipio en el <select>.
//
// Nota: "Navarrete" (bajo Santiago) se incluye aunque formalmente es un
// distrito municipal del municipio de Santiago, no un municipio propio —
// se agregó porque el seed de cobertura (scripts/sembrarCoberturaPractica.js)
// lo usa como fila independiente, y para que sea seleccionable en el
// <select> tiene que existir en esta lista de referencia.
const MUNICIPIOS_RD = [
  {
    provincia: "Azua",
    municipios: [
      "Azua",
      "Estebania",
      "Guayabal",
      "Las Charcas",
      "Las Yayas de Viajama",
      "Padre Las Casas",
      "Peralta",
      "Pueblo Viejo",
      "Sabana Yegua",
      "Tabara Arriba",
    ],
  },
  {
    provincia: "Bahoruco",
    municipios: ["Neiba", "Galvan", "Los Rios", "Tamayo", "Villa Jaragua"],
  },
  {
    provincia: "Barahona",
    municipios: [
      "Barahona",
      "Cabral",
      "El Penon",
      "Enriquillo",
      "Fundacion",
      "Jaquimeyes",
      "La Cienaga",
      "Las Salinas",
      "Paraiso",
      "Polo",
      "Vicente Noble",
    ],
  },
  {
    provincia: "Dajabon",
    municipios: [
      "Dajabon",
      "El Pino",
      "Loma de Cabrera",
      "Partido",
      "Restauracion",
    ],
  },
  {
    provincia: "Distrito Nacional",
    // El Distrito Nacional no se subdivide administrativamente — se
    // modela con un único "municipio" del mismo nombre (ver
    // ANALISIS_COBERTURA_PRACTICA.md, punto 1).
    municipios: ["Distrito Nacional"],
  },
  {
    provincia: "Duarte",
    municipios: [
      "San Francisco de Macoris",
      "Arenoso",
      "Castillo",
      "Eugenio Maria de Hostos",
      "Las Guaranas",
      "Pimentel",
      "Villa Riva",
    ],
  },
  {
    provincia: "Elias Pina",
    municipios: [
      "Comendador",
      "Banica",
      "El Llano",
      "Hondo Valle",
      "Juan Santiago",
      "Pedro Santana",
    ],
  },
  {
    provincia: "El Seibo",
    municipios: ["El Seibo", "Miches"],
  },
  {
    provincia: "Espaillat",
    municipios: ["Moca", "Cayetano Germosen", "Gaspar Hernandez", "San Victor"],
  },
  {
    provincia: "Hato Mayor",
    municipios: ["Hato Mayor", "El Valle", "Sabana de la Mar"],
  },
  {
    provincia: "Hermanas Mirabal",
    municipios: ["Salcedo", "Tenares", "Villa Tapia"],
  },
  {
    provincia: "Independencia",
    municipios: [
      "Jimani",
      "Cristobal",
      "Duverge",
      "La Descubierta",
      "Mella",
      "Postrer Rio",
    ],
  },
  {
    provincia: "La Altagracia",
    municipios: ["Higuey", "San Rafael del Yuma"],
  },
  {
    provincia: "La Romana",
    municipios: ["La Romana", "Guaymate", "Villa Hermosa"],
  },
  {
    provincia: "La Vega",
    municipios: ["La Vega", "Constanza", "Jarabacoa", "Jima Abajo"],
  },
  {
    provincia: "Maria Trinidad Sanchez",
    municipios: ["Nagua", "Cabrera", "El Factor", "Rio San Juan"],
  },
  {
    provincia: "Monsenor Nouel",
    municipios: ["Bonao", "Maimon", "Piedra Blanca"],
  },
  {
    provincia: "Monte Cristi",
    municipios: [
      "Monte Cristi",
      "Castanuelas",
      "Guayubin",
      "Las Matas de Santa Cruz",
      "Pepillo Salcedo",
      "Villa Vasquez",
    ],
  },
  {
    provincia: "Monte Plata",
    municipios: [
      "Monte Plata",
      "Bayaguana",
      "Peralvillo",
      "Sabana Grande de Boya",
      "Yamasa",
    ],
  },
  {
    provincia: "Pedernales",
    municipios: ["Pedernales", "Oviedo"],
  },
  {
    provincia: "Peravia",
    municipios: ["Bani", "Matanzas", "Nizao"],
  },
  {
    provincia: "Puerto Plata",
    municipios: [
      "Puerto Plata",
      "Altamira",
      "Guananico",
      "Imbert",
      "Los Hidalgos",
      "Luperon",
      "Sosua",
      "Villa Isabela",
      "Villa Montellano",
    ],
  },
  {
    provincia: "Samana",
    municipios: ["Samana", "Las Terrenas", "Sanchez"],
  },
  {
    provincia: "San Cristobal",
    municipios: [
      "San Cristobal",
      "Bajos de Haina",
      "Cambita Garabitos",
      "Los Cacaos",
      "Sabana Grande de Palenque",
      "San Gregorio de Nigua",
      "Villa Altagracia",
      "Yaguate",
    ],
  },
  {
    provincia: "San Jose de Ocoa",
    municipios: ["San Jose de Ocoa", "Rancho Arriba", "Sabana Larga"],
  },
  {
    provincia: "San Juan",
    municipios: [
      "San Juan de la Maguana",
      "Bohechio",
      "El Cercado",
      "Juan de Herrera",
      "Las Matas de Farfan",
      "Vallejuelo",
    ],
  },
  {
    provincia: "San Pedro de Macoris",
    municipios: [
      "San Pedro de Macoris",
      "Consuelo",
      "Guayacanes",
      "Quisqueya",
      "Ramon Santana",
      "San Jose de los Llanos",
    ],
  },
  {
    provincia: "Sanchez Ramirez",
    municipios: ["Cotui", "Cevicos", "Fantino", "La Mata"],
  },
  {
    provincia: "Santiago",
    municipios: [
      "Santiago",
      "Baitoa",
      "Bisono",
      "Janico",
      "Licey al Medio",
      "Navarrete",
      "Punal",
      "Sabana Iglesia",
      "San Jose de las Matas",
      "Tamboril",
      "Villa Gonzalez",
    ],
  },
  {
    provincia: "Santiago Rodriguez",
    municipios: ["Sabaneta", "Los Almacigos", "Moncion"],
  },
  {
    provincia: "Santo Domingo",
    municipios: [
      "Santo Domingo Este",
      "Santo Domingo Norte",
      "Santo Domingo Oeste",
      "Boca Chica",
      "La Caleta",
      "La Victoria",
      "Los Alcarrizos",
      "Pedro Brand",
      "San Antonio de Guerra",
    ],
  },
  {
    provincia: "Valverde",
    municipios: ["Mao", "Esperanza", "Laguna Salada"],
  },
];

module.exports = MUNICIPIOS_RD;
