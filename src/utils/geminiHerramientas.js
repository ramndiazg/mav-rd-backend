const User = require("../models/User");
const Inscripcion = require("../models/Inscripcion");
const Sesion = require("../models/Sesion");
const IntentoExamen = require("../models/IntentoExamen");
const MovimientoContable = require("../models/MovimientoContable");
const SolicitudEmpresarial = require("../models/SolicitudEmpresarial");

// --- Declaraciones de las herramientas, en el formato que espera la
// API de Gemini (function calling). Todas son de SOLO LECTURA a
// propósito — el chatbot nunca puede crear, editar ni borrar nada, así
// que aunque interprete mal una pregunta, el peor caso es una respuesta
// rara, nunca un dato perdido o corrupto.
const DECLARACIONES_HERRAMIENTAS = [
  {
    name: "contarInscripciones",
    description:
      "Cuenta inscripciones en un rango de fechas, opcionalmente filtradas por estado de pago.",
    parameters: {
      type: "OBJECT",
      properties: {
        fechaInicio: {
          type: "STRING",
          description: "Fecha de inicio en formato YYYY-MM-DD (inclusive).",
        },
        fechaFin: {
          type: "STRING",
          description: "Fecha de fin en formato YYYY-MM-DD (inclusive).",
        },
        estadoPago: {
          type: "STRING",
          description:
            "Opcional. Uno de: pendiente, pendiente_verificacion, pagado, rechazado. Si se omite, cuenta todas.",
        },
      },
      required: ["fechaInicio", "fechaFin"],
    },
  },
  {
    name: "contarEstudiantesActivos",
    description:
      "Cuenta estudiantes con cuenta activa, opcionalmente filtrados por provincia.",
    parameters: {
      type: "OBJECT",
      properties: {
        provincia: {
          type: "STRING",
          description: "Opcional. Nombre exacto de la provincia a filtrar.",
        },
      },
    },
  },
  {
    name: "balanceMes",
    description:
      "Calcula el balance contable (entradas, salidas, neto) de un mes específico.",
    parameters: {
      type: "OBJECT",
      properties: {
        mes: { type: "INTEGER", description: "Mes de 1 a 12." },
        anio: { type: "INTEGER", description: "Año, ej. 2026." },
      },
      required: ["mes", "anio"],
    },
  },
  {
    name: "vouchersPendientes",
    description:
      "Lista los comprobantes de pago pendientes de verificar, con cuántos días llevan esperando.",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "buscarEstudiante",
    description:
      "Busca estudiantes por nombre, apellido o cédula (búsqueda parcial). Nunca devuelve contraseñas ni tokens.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description: "Texto a buscar en nombre, apellido o cédula.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "solicitudesEmpresariales",
    description:
      "Lista las solicitudes del formulario de Empresas en un rango de fechas.",
    parameters: {
      type: "OBJECT",
      properties: {
        fechaInicio: { type: "STRING", description: "YYYY-MM-DD" },
        fechaFin: { type: "STRING", description: "YYYY-MM-DD" },
      },
      required: ["fechaInicio", "fechaFin"],
    },
  },
  {
    name: "resultadosExamenes",
    description:
      "Cuenta intentos de examen aprobados y reprobados en un rango de fechas, opcionalmente filtrado por número de sesión (1-4).",
    parameters: {
      type: "OBJECT",
      properties: {
        fechaInicio: { type: "STRING", description: "YYYY-MM-DD" },
        fechaFin: { type: "STRING", description: "YYYY-MM-DD" },
        numeroSesion: {
          type: "INTEGER",
          description: "Opcional, 1 a 4. Si se omite, incluye las 4 sesiones.",
        },
      },
      required: ["fechaInicio", "fechaFin"],
    },
  },
];

// Convierte "YYYY-MM-DD" a un rango [inicio del día, fin del día] en UTC.
function rangoDelDia(fechaInicioStr, fechaFinStr) {
  const inicio = new Date(`${fechaInicioStr}T00:00:00.000Z`);
  const fin = new Date(`${fechaFinStr}T23:59:59.999Z`);
  return { inicio, fin };
}

// --- Implementación real de cada herramienta ---
const IMPLEMENTACIONES = {
  async contarInscripciones({ fechaInicio, fechaFin, estadoPago }) {
    const { inicio, fin } = rangoDelDia(fechaInicio, fechaFin);
    const filtro = { createdAt: { $gte: inicio, $lte: fin } };
    if (estadoPago) filtro.estadoPago = estadoPago;
    const total = await Inscripcion.countDocuments(filtro);
    return {
      total,
      filtro: { fechaInicio, fechaFin, estadoPago: estadoPago || "todas" },
    };
  },

  async contarEstudiantesActivos({ provincia }) {
    const filtro = { rol: "estudiante", activo: true };
    if (provincia) filtro.provincia = provincia;
    const total = await User.countDocuments(filtro);
    return { total, provincia: provincia || "todas" };
  },

  async balanceMes({ mes, anio }) {
    const inicio = new Date(Date.UTC(anio, mes - 1, 1, 0, 0, 0));
    const fin = new Date(Date.UTC(anio, mes, 0, 23, 59, 59, 999)); // último día del mes
    const movimientos = await MovimientoContable.find({
      fecha: { $gte: inicio, $lte: fin },
    }).lean();

    const entradas = movimientos
      .filter((m) => m.tipo === "entrada")
      .reduce((suma, m) => suma + m.monto, 0);
    const salidas = movimientos
      .filter((m) => m.tipo === "salida")
      .reduce((suma, m) => suma + m.monto, 0);

    return {
      mes,
      anio,
      entradas,
      salidas,
      neto: entradas - salidas,
      cantidadMovimientos: movimientos.length,
    };
  },

  async vouchersPendientes() {
    const pendientes = await Inscripcion.find({
      estadoPago: "pendiente_verificacion",
    })
      .populate("userId", "nombre apellido")
      .sort({ createdAt: 1 })
      .lean();

    const ahora = Date.now();
    return {
      total: pendientes.length,
      vouchers: pendientes.map((v) => ({
        estudiante: v.userId
          ? `${v.userId.nombre} ${v.userId.apellido}`
          : "(usuario eliminado)",
        tipoPlan: v.tipoPlan,
        monto: v.monto,
        diasEsperando: Math.floor(
          (ahora - new Date(v.createdAt).getTime()) / (1000 * 60 * 60 * 24),
        ),
      })),
    };
  },

  async buscarEstudiante({ query }) {
    const regex = new RegExp(query, "i");
    const estudiantes = await User.find({
      rol: "estudiante",
      $or: [{ nombre: regex }, { apellido: regex }, { cedula: regex }],
    })
      .select("nombre apellido cedula email telefono provincia activo")
      .limit(10)
      .lean();

    return { total: estudiantes.length, estudiantes };
  },

  async solicitudesEmpresariales({ fechaInicio, fechaFin }) {
    const { inicio, fin } = rangoDelDia(fechaInicio, fechaFin);
    const solicitudes = await SolicitudEmpresarial.find({
      createdAt: { $gte: inicio, $lte: fin },
    })
      .select("nombreEmpresa contacto cantidadEstudiantes contactado createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return { total: solicitudes.length, solicitudes };
  },

  async resultadosExamenes({ fechaInicio, fechaFin, numeroSesion }) {
    const { inicio, fin } = rangoDelDia(fechaInicio, fechaFin);
    const filtro = {
      fechaFin: { $ne: null, $gte: inicio, $lte: fin },
    };

    if (numeroSesion) {
      const sesion = await Sesion.findOne({ numero: numeroSesion }).lean();
      if (!sesion) {
        return { error: `No existe una sesión con número ${numeroSesion}.` };
      }
      filtro.sesionId = sesion._id;
    }

    const intentos = await IntentoExamen.find(filtro).lean();
    const aprobados = intentos.filter((i) => i.aprobado === true).length;
    const reprobados = intentos.filter((i) => i.aprobado === false).length;

    return {
      totalIntentos: intentos.length,
      aprobados,
      reprobados,
      sesion: numeroSesion || "todas",
    };
  },
};

async function ejecutarHerramienta(nombre, argumentos) {
  const fn = IMPLEMENTACIONES[nombre];
  if (!fn) {
    return { error: `Herramienta desconocida: ${nombre}` };
  }
  try {
    return await fn(argumentos || {});
  } catch (error) {
    return { error: `Error ejecutando ${nombre}: ${error.message}` };
  }
}

module.exports = { DECLARACIONES_HERRAMIENTAS, ejecutarHerramienta };
