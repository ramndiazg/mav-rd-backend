const Sesion = require("../models/Sesion");
const ProgresoEstudiante = require("../models/ProgresoEstudiante");

// GET /api/sesiones — coordinadora/admin: lista completa con contenido, para gestión
async function listarSesiones(req, res, next) {
  try {
    const sesiones = await Sesion.find({}).sort({ numero: 1 });
    res.json({ success: true, data: sesiones });
  } catch (error) {
    next(error);
  }
}

// GET /api/sesiones/:numero — estudiante: solo si tiene acceso desbloqueado
async function obtenerSesionParaEstudiante(req, res, next) {
  try {
    const numero = Number(req.params.numero);

    const progreso = await ProgresoEstudiante.findOne({
      userId: req.usuario._id,
    });
    if (!progreso || numero > progreso.sesionActualDesbloqueada) {
      return res.status(403).json({
        success: false,
        error: "Esta sesión aún no ha sido desbloqueada por tu coordinadora.",
      });
    }

    const sesion = await Sesion.findOne({ numero });
    if (!sesion) {
      return res
        .status(404)
        .json({ success: false, error: "Sesión no encontrada." });
    }

    res.json({ success: true, data: sesion });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/sesiones/:numero — admin: editar teoría/videos
async function actualizarSesion(req, res, next) {
  try {
    const numero = Number(req.params.numero);
    const { titulo, teoria, videos, activo } = req.body;

    const sesion = await Sesion.findOneAndUpdate(
      { numero },
      {
        ...(titulo && { titulo }),
        ...(teoria && { teoria }),
        ...(videos && { videos }),
        ...(activo !== undefined && { activo }),
      },
      { new: true },
    );

    if (!sesion) {
      return res
        .status(404)
        .json({ success: false, error: "Sesión no encontrada." });
    }

    res.json({ success: true, data: sesion });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarSesiones,
  obtenerSesionParaEstudiante,
  actualizarSesion,
};
