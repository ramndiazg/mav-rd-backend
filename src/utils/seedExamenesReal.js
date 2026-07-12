// node src/utils/seedExamenesReal.js — correr una vez para poblar el banco
// de exámenes con preguntas reales, verificadas contra el material de
// estudio ya sembrado (ver seedMaterialReal.js). 3 versiones por sesión.
require("dotenv").config();
const mongoose = require("mongoose");
const Sesion = require("../models/Sesion");
const Examen = require("../models/Examen");

function p(texto, opciones, respuestaCorrectaIndex) {
  return { texto, opciones, respuestaCorrectaIndex };
}

const examenes = [
  // ============ SESIÓN 1 — Introducción a la Ley de Tránsito ============
  {
    numero: 1,
    nombreVersion: "Versión A",
    preguntas: [
      p(
        "¿Qué documentos debe portar un conductor al transitar en un vehículo?",
        [
          "Licencia y matrícula",
          "Cédula, licencia y seguro",
          "Cédula, licencia, copia de matrícula y carnet de seguro",
        ],
        2,
      ),
      p(
        "¿Cuál es la velocidad máxima permitida en una zona escolar?",
        ["10 km/h", "20 km/h", "40 km/h"],
        1,
      ),
      p(
        "¿A qué distancia mínima de la acera debes estacionarte?",
        ["50 cm", "30 cm", "10 cm"],
        1,
      ),
      p(
        "¿Cuál es la velocidad máxima en una zona urbana residencial?",
        ["30 km/h", "60 km/h", "80 km/h"],
        0,
      ),
      p(
        "¿Cuál es la velocidad máxima permitida en autopistas y autovías?",
        ["90 km/h", "80 km/h", "120 km/h"],
        2,
      ),
      p(
        "¿Qué institución creó la Ley 63-17 como órgano rector del tránsito?",
        ["El INTRANT", "La DIGESETT", "La AMET"],
        0,
      ),
      p(
        "Bajo el sistema de puntos de la Ley 63-17, ¿qué puede pasarle a un conductor que acumula muchas infracciones?",
        [
          "Puede perder su licencia de conducir",
          "Recibe un descuento en el seguro",
          "No pasa nada",
        ],
        0,
      ),
      p(
        "¿Quién debe usar casco al transportarse en una motocicleta?",
        [
          "Solo el conductor",
          "Solo el pasajero",
          "Tanto el conductor como el pasajero",
        ],
        2,
      ),
      p(
        "¿Con qué puntuación mínima se aprueba el examen teórico del permiso de aprendizaje?",
        ["50 puntos", "60 puntos", "80 puntos"],
        1,
      ),
      p(
        "Si repruebas el examen teórico del INTRANT, ¿cuántos días debes esperar para repetirlo?",
        ["7 días", "15 días", "30 días"],
        1,
      ),
    ],
  },
  {
    numero: 1,
    nombreVersion: "Versión B",
    preguntas: [
      p(
        "¿Qué documento demuestra que el vehículo es tuyo, similar al acta de nacimiento del vehículo?",
        ["La cédula", "La copia de matrícula", "El carnet de seguro"],
        1,
      ),
      p(
        "¿Cuál es la velocidad máxima permitida en avenidas?",
        ["30 km/h", "60 km/h", "120 km/h"],
        1,
      ),
      p(
        "¿A qué distancia mínima de un cruce peatonal debes estacionarte?",
        ["3 metros", "9 metros", "20 metros"],
        1,
      ),
      p(
        "¿A qué distancia mínima de una intersección controlada por semáforo debes estacionarte?",
        ["5 metros", "10 metros", "15 metros"],
        1,
      ),
      p(
        "¿A qué distancia mínima de un cruce ferroviario debes estacionarte?",
        ["10 metros", "15 metros", "20 metros"],
        2,
      ),
      p(
        "¿Qué dirección técnica, dependiente de la Policía Nacional, se creó con la Ley 63-17 para fiscalizar las vías?",
        ["El INTRANT", "La DIGESETT", "La AMET"],
        1,
      ),
      p(
        "¿Qué certifica el 'Certificado de No Antecedentes Penales' exigido para el permiso de aprendizaje?",
        [
          "Que no tienes antecedentes penales",
          "Que aprobaste el examen teórico",
          "Que tienes seguro vigente",
        ],
        0,
      ),
      p(
        "¿Cuál es la vigencia del Certificado de No Antecedentes Penales?",
        ["15 días", "30 días", "60 días"],
        1,
      ),
      p(
        "Si un peatón cruza la calle fuera de un cruce peatonal, ¿qué debe hacer según la ley?",
        [
          "Cruzar de forma perpendicular y ceder el paso a los vehículos",
          "Cruzar en diagonal lo más rápido posible",
          "Esperar a que un vehículo se detenga primero",
        ],
        0,
      ),
      p(
        "Ante un accidente de tránsito, ¿quiénes pueden ser responsables civiles de forma solidaria?",
        [
          "Solo el conductor",
          "Solo el dueño del vehículo",
          "El propietario del vehículo y el conductor",
        ],
        2,
      ),
    ],
  },
  {
    numero: 1,
    nombreVersion: "Versión C",
    preguntas: [
      p(
        "¿Qué categoría de licencia corresponde a vehículos de dos o tres ruedas?",
        ["Categoría 1", "Categoría 2", "Categoría 3"],
        0,
      ),
      p(
        "¿Qué categoría de licencia corresponde a automóviles, jeeps y camionetas?",
        ["Categoría 1", "Categoría 2", "Categoría 3"],
        1,
      ),
      p(
        "¿Qué categoría corresponde a autobuses de más de 40 pasajeros y camiones de más de dos ejes?",
        ["Categoría 3", "Categoría 4", "Categoría 5"],
        1,
      ),
      p(
        "La distancia de seguridad recomendada es de 4 metros por cada:",
        ["10 km/h", "15 km/h", "20 km/h"],
        1,
      ),
      p(
        "Circulando a 60 km/h, ¿cuántos metros de distancia debes mantener del vehículo de adelante?",
        ["8 metros", "16 metros", "32 metros"],
        1,
      ),
      p(
        "¿Quién debe acompañar a una persona con permiso de aprendizaje mientras conduce?",
        [
          "Cualquier familiar",
          "Un conductor con experiencia o instructor con licencia vigente",
          "Nadie, puede conducir sola",
        ],
        1,
      ),
      p(
        "¿Cuál es la edad mínima para tramitar un permiso de aprendizaje como menor de edad?",
        ["14 años", "16 años", "18 años"],
        1,
      ),
      p(
        "Además de su cédula, ¿qué debe presentar un menor de edad para el permiso de aprendizaje?",
        [
          "Autorización notarial del padre, madre o tutor",
          "Carta del colegio",
          "Nada adicional",
        ],
        0,
      ),
      p(
        "¿A qué velocidad se debe transitar al pagar en una estación de peaje?",
        ["10 km/h", "20 km/h", "40 km/h"],
        0,
      ),
      p(
        "¿A qué velocidad se debe circular al retomar la vía después de pagar en un peaje?",
        ["10 km/h", "20 km/h", "40 km/h"],
        2,
      ),
    ],
  },

  // ============ SESIÓN 2 — Señalización y normas viales ============
  {
    numero: 2,
    nombreVersion: "Versión A",
    preguntas: [
      p(
        "¿Con qué colores se identifican las señales preventivas?",
        [
          "Rojo sobre blanco",
          "Negro sobre fondo amarillo",
          "Azul sobre blanco",
        ],
        1,
      ),
      p(
        "Una señal de 'PARE' es de tipo:",
        ["Preventiva", "Reglamentaria", "Informativa"],
        1,
      ),
      p(
        "¿Quién tiene autoridad legal para instalar señales de tránsito en la vía pública?",
        [
          "Cualquier ciudadano",
          "Los comercios privados",
          "El INTRANT y los ayuntamientos",
        ],
        2,
      ),
      p(
        "¿Qué indica una luz de semáforo en amarillo?",
        [
          "Detenerse por completo",
          "Precaución, el semáforo va a cambiar",
          "Vía libre",
        ],
        1,
      ),
      p(
        "Las señales que se usan temporalmente por obras o desvíos se llaman:",
        ["Informativas", "Transitorias", "Reglamentarias"],
        1,
      ),
      p(
        "Las señales que orientan sobre distancias o lugares cercanos, sin imponer una obligación, son:",
        ["Informativas", "Preventivas", "Reglamentarias"],
        0,
      ),
      p(
        "En el orden de prioridad del tránsito, ¿qué tiene el primer lugar?",
        ["El semáforo", "El agente de tráfico", "La señal vertical"],
        1,
      ),
      p(
        "En el orden de prioridad del tránsito, ¿qué va inmediatamente después de las señales circunstanciales?",
        ["Los semáforos", "Las marcas viales", "Las señales horizontales"],
        0,
      ),
      p(
        "En una glorieta, salvo señal contraria, ¿quién tiene preferencia de paso?",
        [
          "Quien se está incorporando",
          "Quienes ya circulan dentro de la vía circular",
          "El vehículo más grande",
        ],
        1,
      ),
      p(
        "¿Qué vehículos siempre tienen preferencia de paso sobre los demás?",
        [
          "Los vehículos de carga",
          "Los vehículos de emergencia",
          "Los vehículos más nuevos",
        ],
        1,
      ),
    ],
  },
  {
    numero: 2,
    nombreVersion: "Versión B",
    preguntas: [
      p(
        "Entre un vehículo en vía pavimentada y otro en vía sin pavimentar, ¿quién tiene preferencia?",
        [
          "El de la vía sin pavimentar",
          "El de la vía pavimentada",
          "Ninguno, deben negociar el paso",
        ],
        1,
      ),
      p(
        "En autopistas y autovías, ¿quién tiene preferencia de paso?",
        [
          "Quien se incorpora desde la derecha",
          "Quienes ya circulan por ellas",
          "El vehículo más rápido",
        ],
        1,
      ),
      p(
        "Los vehículos que circulan sobre raíles (como un tren):",
        [
          "Ceden el paso siempre",
          "Siempre tienen prioridad",
          "Solo tienen prioridad de noche",
        ],
        1,
      ),
      p(
        "Según la Ley 63-17, ¿qué ocurre a quien instala una señal de tránsito sin autorización?",
        [
          "Nada, es libre de hacerlo",
          "Multas y reducción de puntos en la licencia",
          "Solo una advertencia verbal",
        ],
        1,
      ),
      p(
        "Una luz de semáforo en rojo indica:",
        [
          "Reducir la velocidad",
          "Detenerse por completo",
          "Avanzar con precaución",
        ],
        1,
      ),
      p(
        "Una luz de semáforo en verde indica:",
        [
          "Detenerse",
          "Se permite circular, verificando que la vía esté despejada",
          "Precaución, va a cambiar",
        ],
        1,
      ),
      p(
        "Un límite de velocidad indicado en una señal es de tipo:",
        ["Informativa", "Reglamentaria", "Transitoria"],
        1,
      ),
      p(
        "Las señales de 'Ceda el Paso' regulan específicamente:",
        ["La velocidad máxima", "La prioridad de paso", "El estacionamiento"],
        1,
      ),
      p(
        "¿Qué reglamento, derivado de la Ley 63-17, regula la señalización horizontal y vertical del país?",
        [
          "El Reglamento de Señalización en el Tránsito Terrestre",
          "El Código Civil",
          "La Ley 241",
        ],
        0,
      ),
      p(
        "¿Qué institución es responsable de fiscalizar la señalización de las vías públicas dominicanas?",
        ["El INTRANT", "El Ministerio de Educación", "La Liga Municipal"],
        0,
      ),
    ],
  },
  {
    numero: 2,
    nombreVersion: "Versión C",
    preguntas: [
      p(
        "Según el minimanual de motocicletas, ¿qué porcentaje del parque vehicular dominicano representan las motocicletas?",
        ["20%", "50%", "80%"],
        1,
      ),
      p(
        "Para tramitar la licencia de motocicleta, el conductor no debe tener:",
        ["Multas de tránsito sin pagar", "Más de 30 años", "Vehículo propio"],
        0,
      ),
      p(
        "Si repruebas el examen teórico de la licencia de motocicleta, ¿cuántos días debes esperar para repetirlo?",
        ["15 días", "16 días", "30 días"],
        1,
      ),
      p(
        "¿Cuál es la vigencia de la licencia de motocicleta (categoría 1)?",
        ["2 años", "4 años", "6 años"],
        1,
      ),
      p(
        "¿Qué elemento de la motocicleta amortigua las irregularidades del camino?",
        ["El motor", "La suspensión", "El chasis"],
        1,
      ),
      p(
        "¿Qué elemento es la estructura base donde se asientan el motor y la suspensión de la motocicleta?",
        ["El chasis (bastidor)", "El tanque de combustible", "La transmisión"],
        0,
      ),
      p(
        "Según datos del OPSEVI, ¿qué porcentaje de fallecidos en las vías dominicanas involucra una motocicleta?",
        ["30%", "50%", "70%"],
        2,
      ),
      p(
        "Además de la cédula, ¿qué otro documento se exige para tramitar la licencia de motocicleta?",
        [
          "Papel de Buena Conducta o Certificado de No Antecedentes",
          "Título universitario",
          "Carta de recomendación",
        ],
        0,
      ),
      p(
        "¿Por qué se considera a los motociclistas 'usuarios vulnerables' del tránsito?",
        [
          "Porque son su propia carrocería y las lesiones son más graves",
          "Porque conducen más lento",
          "Porque pagan menos impuestos",
        ],
        0,
      ),
      p(
        "¿Dónde se puede descargar el Manual de Categoría 01 para la licencia de motocicleta?",
        [
          "En la Oficina Virtual del INTRANT",
          "En cualquier ferretería",
          "No está disponible",
        ],
        0,
      ),
    ],
  },

  // ============ SESIÓN 3 — Buenas prácticas de conducción ============
  {
    numero: 3,
    nombreVersion: "Versión A",
    preguntas: [
      p(
        "¿Qué se debe revisar en el mantenimiento periódico del vehículo?",
        [
          "Solo los filtros",
          "Solo el aceite",
          "Filtros, aceites, agua de radiador — todas las anteriores",
        ],
        2,
      ),
      p(
        "¿Qué función principal cumple la batería del vehículo?",
        [
          "Mantiene la carga eléctrica",
          "Enciende el radio únicamente",
          "Genera la fricción de frenado",
        ],
        0,
      ),
      p(
        "¿Qué función cumple la bujía?",
        [
          "Genera la chispa de encendido",
          "Envía una señal de alerta al tablero",
          "Enciende el radio",
        ],
        0,
      ),
      p(
        "¿Qué función cumple el alternador?",
        [
          "Genera la carga y electricidad del vehículo",
          "Enciende únicamente las luces",
          "Ayuda a frenar el motor",
        ],
        0,
      ),
      p(
        "¿Cuál es el objetivo principal del sistema de iluminación de un vehículo?",
        ["Ver y ser visto", "Decorar el vehículo", "Ahorrar combustible"],
        0,
      ),
      p(
        "¿Qué debes hacer si otro conductor te encandila con la luz alta de su vehículo?",
        [
          "Acelerar para alejarte",
          "Hacer cambio de luz como aviso de su deslumbramiento",
          "Tocar la bocina repetidamente",
        ],
        1,
      ),
      p(
        "¿Cuándo se debe encender la luz direccional?",
        [
          "Siempre que el vehículo esté encendido",
          "Cuando se va a hacer una maniobra a la derecha o izquierda",
          "Solo de noche",
        ],
        1,
      ),
      p(
        "¿Cuándo se debe encender la luz intermitente de emergencia?",
        [
          "Al estacionarse por una emergencia de avería o fallo",
          "Al estacionarse en un parqueo normal",
          "Al estacionarse en un comercio",
        ],
        0,
      ),
      p(
        "Un testigo encendido en el tablero que indica una falla del vehículo advierte que:",
        [
          "El vehículo tiene un problema y necesita atención",
          "Todo está en buenas condiciones",
          "Se debe apagar el vehículo de inmediato sin excepción",
        ],
        0,
      ),
      p(
        "¿Con qué frecuencia recomiendan algunos talleres sustituir los neumáticos?",
        ["Cada 20,000 km", "Cada 60,000 km", "Cada 100,000 km"],
        1,
      ),
    ],
  },
  {
    numero: 3,
    nombreVersion: "Versión B",
    preguntas: [
      p(
        "¿Cuáles son ejemplos de sistemas de seguridad activa?",
        [
          "Luces, dirección, suspensión, frenado, neumáticos",
          "Bolsas de aire y cinturón",
          "Solo el apoyacabeza",
        ],
        0,
      ),
      p(
        "¿Cuáles son ejemplos de elementos de seguridad pasiva?",
        [
          "Frenos y neumáticos",
          "Apoyacabeza, cinturón, bolsas de aire",
          "Dirección y suspensión",
        ],
        1,
      ),
      p(
        "El cinturón de seguridad puede reducir los traumatismos en los asientos delanteros en un:",
        ["10 a 25%", "45 a 50%", "70 a 80%"],
        2,
      ),
      p(
        "La seguridad activa se define como el conjunto de elementos que:",
        [
          "Reducen los daños después de un accidente",
          "Evitan que ocurra un accidente",
          "Solo protegen las puertas del vehículo",
        ],
        1,
      ),
      p(
        "La seguridad pasiva se define como lo que:",
        [
          "Evita o disminuye los daños que se producen en un accidente",
          "Evita que ocurra el accidente",
          "Son los amortiguadores del vehículo",
        ],
        0,
      ),
      p(
        "Según otra referencia del curso, ¿en qué porcentaje puede salvar la vida el cinturón de seguridad?",
        ["20 a 30%", "30 a 40%", "45 a 50%"],
        2,
      ),
      p(
        "¿Hasta qué edad se recomienda usar silla o asiento de retención infantil en el vehículo?",
        ["10 años", "6 años", "12 años"],
        1,
      ),
      p(
        "Como norma general, ¿en qué situaciones se debe ceder el paso?",
        [
          "Solo en intersecciones",
          "Intersecciones, cruces, peatones y vehículos de emergencia",
          "Nunca, siempre se tiene prioridad",
        ],
        1,
      ),
      p(
        "¿Por qué es importante señalizar las maniobras activando las luces direccionales?",
        [
          "Avisa a los demás usuarios del movimiento que se va a hacer",
          "Da automáticamente el derecho de paso",
          "Obliga a que otros usuarios se detengan",
        ],
        0,
      ),
      p(
        "¿Cuál de las siguientes es una técnica de manejo defensivo?",
        [
          "Guardar distancia y anticiparse a los riesgos",
          "Acelerar para evitar el tráfico",
          "Ignorar a los demás conductores",
        ],
        0,
      ),
    ],
  },
  {
    numero: 3,
    nombreVersion: "Versión C",
    preguntas: [
      p(
        "¿Cuál es la función principal de los frenos ABS?",
        [
          "Evitar que las ruedas se bloqueen al frenar a fondo",
          "Aumentar la velocidad de frenado",
          "Encender las luces automáticamente",
        ],
        0,
      ),
      p(
        "¿Cuántos componentes principales tiene el sistema de frenos ABS?",
        ["5", "7", "9"],
        1,
      ),
      p(
        "¿Qué es el sistema ESP (Control Electrónico de Estabilidad)?",
        [
          "Un sistema que corrige la pérdida de trayectoria del vehículo",
          "Un sistema que enciende las luces automáticamente",
          "Un sistema de aire acondicionado",
        ],
        0,
      ),
      p(
        "Si se enciende la luz del ESP en el tablero, ¿qué debes hacer?",
        [
          "Ignorarla si el vehículo anda bien",
          "Acudir al mecánico de inmediato",
          "Apagar el vehículo y esperar 24 horas",
        ],
        1,
      ),
      p(
        "¿Qué porcentaje de fallecidos en accidentes de motocicleta muere por impactos en la cabeza?",
        ["50%", "65%", "80%"],
        2,
      ),
      p(
        "Un casco homologado reduce la posibilidad de lesiones mortales en aproximadamente:",
        ["10%", "30%", "50%"],
        1,
      ),
      p(
        "Al probarte un casco de la talla correcta, ¿qué espacio debe quedar por encima de las cejas?",
        ["Ningún espacio", "Unos 2 centímetros", "Unos 10 centímetros"],
        1,
      ),
      p(
        "¿Por qué es peligrosa la aceleración brusca?",
        [
          "Puede ocasionar situaciones peligrosas y cambios inesperados en el vehículo",
          "Ahorra más combustible",
          "Mejora la estabilidad del vehículo",
        ],
        0,
      ),
      p(
        "El pedal del acelerador controla principalmente el envío de:",
        ["Aceite al motor", "Combustible a los cilindros", "Agua al radiador"],
        1,
      ),
      p(
        "Antes de descender por una pendiente muy pronunciada, se recomienda:",
        [
          "Seleccionar un cambio alto y evitar frenar",
          "Seleccionar un cambio bajo y usar los frenos con cuidado",
          "Apagar el motor y bajar en neutro",
        ],
        1,
      ),
    ],
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Conectado a MongoDB Atlas");

  for (const examen of examenes) {
    const sesion = await Sesion.findOne({ numero: examen.numero });
    if (!sesion) {
      console.log(
        `✗ No existe la Sesión ${examen.numero} — saltando "${examen.nombreVersion}"`,
      );
      continue;
    }

    await Examen.findOneAndUpdate(
      { sesionId: sesion._id, nombreVersion: examen.nombreVersion },
      {
        sesionId: sesion._id,
        nombreVersion: examen.nombreVersion,
        preguntas: examen.preguntas,
        activo: true,
      },
      { upsert: true, new: true },
    );
    console.log(
      `✓ Sesión ${examen.numero} — ${examen.nombreVersion} (10 preguntas)`,
    );
  }

  console.log("Seed de exámenes reales completo.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
