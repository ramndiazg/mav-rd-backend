const Reporte = require("../models/Reporte");
const Configuracion = require("../models/Configuracion");
const { notificarNuevoReporte } = require("../utils/notificaciones");

const TIPOS_VALIDOS = Reporte.TIPOS; // ['tecnico', 'contenido', 'pago', 'otro']
const ESTADOS_VALIDOS = Reporte.ESTADOS; // ['abierto', 'en_revision', 'resuelto']

const CLAVE_CONFIG_NOTIFICACIONES = "reportes_notificaciones_activas";
const CONFIG_NOTIFICACIONES_DEFAULT = {
  tecnico: true,
  contenido: true,
  pago: true,
  otro: true,
};

// POST /api/reportes — estudiante crea un reporte nuevo
async function crearReporte(req, res, next) {
  try {
    const { tipo, tipoOtro, mensaje } = req.body;

    if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({
        success: false,
        error: `tipo debe ser uno de: ${TIPOS_VALIDOS.join(", ")}.`,
      });
    }

    if (tipo === "otro" && !tipoOtro?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Describe brevemente el motivo cuando el tipo es "otro".',
      });
    }

    if (!mensaje?.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "El mensaje es obligatorio." });
    }

    const reporte = await Reporte.create({
      estudianteId: req.usuario._id,
      tipo,
      tipoOtro: tipo === "otro" ? tipoOtro.trim() : null,
      mensaje: mensaje.trim(),
    });

    // No se espera (await) a propósito — si Resend/Telegram tardan o
    // fallan, no debe bloquear ni tumbar la respuesta al estudiante. El
    // reporte ya quedó guardado, que es lo que realmente importa.
    notificarNuevoReporte({
      nombreEstudiante: `${req.usuario.nombre} ${req.usuario.apellido}`,
      tipo,
      tipoOtro: reporte.tipoOtro,
      mensaje: reporte.mensaje,
    });

    res.status(201).json({ success: true, data: reporte });
  } catch (error) {
    next(error);
  }
}

// GET /api/reportes/mios — estudiante: lista de sus propios reportes
async function listarMisReportes(req, res, next) {
  try {
    const reportes = await Reporte.find({
      estudianteId: req.usuario._id,
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: reportes });
  } catch (error) {
    next(error);
  }
}

// GET /api/reportes/mios/:id — estudiante: detalle de un reporte propio
async function obtenerMiReporte(req, res, next) {
  try {
    const reporte = await Reporte.findOne({
      _id: req.params.id,
      estudianteId: req.usuario._id,
    });

    if (!reporte) {
      return res
        .status(404)
        .json({ success: false, error: "Reporte no encontrado." });
    }

    res.json({ success: true, data: reporte });
  } catch (error) {
    next(error);
  }
}

// GET /api/reportes — coordinadora/admin: todos los reportes, filtrables
// por estado (?estado=abierto|en_revision|resuelto)
async function listarReportes(req, res, next) {
  try {
    const filtro = {};
    if (req.query.estado) {
      if (!ESTADOS_VALIDOS.includes(req.query.estado)) {
        return res
          .status(400)
          .json({ success: false, error: "estado de filtro inválido." });
      }
      filtro.estado = req.query.estado;
    }

    const reportes = await Reporte.find(filtro)
      .populate("estudianteId", "nombre apellido cedula email")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: reportes });
  } catch (error) {
    next(error);
  }
}

// GET /api/reportes/:id — coordinadora/admin: detalle completo
async function obtenerReporte(req, res, next) {
  try {
    const reporte = await Reporte.findById(req.params.id).populate(
      "estudianteId",
      "nombre apellido cedula email telefono",
    );

    if (!reporte) {
      return res
        .status(404)
        .json({ success: false, error: "Reporte no encontrado." });
    }

    res.json({ success: true, data: reporte });
  } catch (error) {
    next(error);
  }
}

// POST /api/reportes/:id/respuestas — estudiante (solo lo suyo) o
// coordinadora/admin (cualquier reporte). El permiso exacto se valida
// aquí adentro porque depende de a quién pertenece el reporte, no solo
// del rol.
async function agregarRespuesta(req, res, next) {
  try {
    const { mensaje } = req.body;
    if (!mensaje?.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "El mensaje es obligatorio." });
    }

    const reporte = await Reporte.findById(req.params.id);
    if (!reporte) {
      return res
        .status(404)
        .json({ success: false, error: "Reporte no encontrado." });
    }

    const esStaff = ["coordinadora", "admin"].includes(req.usuario.rol);
    const esPropio = reporte.estudianteId.equals(req.usuario._id);

    if (!esStaff && !esPropio) {
      return res.status(403).json({
        success: false,
        error: "No tienes permiso para responder este reporte.",
      });
    }

    if (reporte.estado === "resuelto") {
      return res.status(409).json({
        success: false,
        error:
          "Este reporte ya fue marcado como resuelto. Crea uno nuevo si necesitas más ayuda.",
      });
    }

    reporte.respuestas.push({
      autor: req.usuario._id,
      rolAutor: req.usuario.rol,
      mensaje: mensaje.trim(),
    });

    // Si quien responde es coordinadora/admin y el reporte seguía
    // "abierto", pasa automáticamente a "en_revision" — ya alguien lo
    // está atendiendo. Una respuesta del propio estudiante no cambia el
    // estado (esa decisión sigue siendo del staff).
    if (esStaff && reporte.estado === "abierto") {
      reporte.estado = "en_revision";
    }

    await reporte.save();
    res.json({ success: true, data: reporte });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/reportes/:id/estado — coordinadora/admin. Body: { estado }.
// Una vez "resuelto" no se puede volver a cambiar — hay que crear un
// reporte nuevo (decisión explícita, sin reapertura).
async function actualizarEstado(req, res, next) {
  try {
    const { estado } = req.body;
    if (!ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({
        success: false,
        error: `estado debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}.`,
      });
    }

    const reporte = await Reporte.findById(req.params.id);
    if (!reporte) {
      return res
        .status(404)
        .json({ success: false, error: "Reporte no encontrado." });
    }

    if (reporte.estado === "resuelto") {
      return res.status(409).json({
        success: false,
        error: "Este reporte ya está resuelto y no se puede reabrir.",
      });
    }

    reporte.estado = estado;
    await reporte.save();
    res.json({ success: true, data: reporte });
  } catch (error) {
    next(error);
  }
}

// GET /api/reportes/configuracion-notificaciones — admin
async function obtenerConfiguracionNotificaciones(req, res, next) {
  try {
    const config = await Configuracion.findOne({
      clave: CLAVE_CONFIG_NOTIFICACIONES,
    });

    res.json({
      success: true,
      data: config?.valor || CONFIG_NOTIFICACIONES_DEFAULT,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/reportes/configuracion-notificaciones — admin
// Body: { tecnico?, contenido?, pago?, otro? } (booleanos, parciales)
async function actualizarConfiguracionNotificaciones(req, res, next) {
  try {
    const configActual = await Configuracion.findOne({
      clave: CLAVE_CONFIG_NOTIFICACIONES,
    });
    const valorActual = configActual?.valor || CONFIG_NOTIFICACIONES_DEFAULT;

    const nuevoValor = { ...valorActual };
    for (const tipo of TIPOS_VALIDOS) {
      if (req.body[tipo] !== undefined) {
        nuevoValor[tipo] = !!req.body[tipo];
      }
    }

    const config = await Configuracion.findOneAndUpdate(
      { clave: CLAVE_CONFIG_NOTIFICACIONES },
      { valor: nuevoValor, actualizadoPor: req.usuario._id },
      { new: true, upsert: true },
    );

    res.json({ success: true, data: config.valor });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  crearReporte,
  listarMisReportes,
  obtenerMiReporte,
  listarReportes,
  obtenerReporte,
  agregarRespuesta,
  actualizarEstado,
  obtenerConfiguracionNotificaciones,
  actualizarConfiguracionNotificaciones,
};
