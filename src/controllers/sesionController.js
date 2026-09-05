const Sesion = require("../models/Sesion");
const ProgresoEstudiante = require("../models/ProgresoEstudiante");
const TestPsicologico = require("../models/TestPsicologico");

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
//
// ACTUALIZADO (04/09/2026): antes de cualquier sesión (incluida la 1), se
// exige haber completado el test psicológico. Este es el único punto de
// entrada real al contenido de una sesión, así que bloquear aquí cubre
// tanto la pantalla del dashboard como cualquier intento de llamar a la
// API directo sin pasar por el frontend.
async function obtenerSesionParaEstudiante(req, res, next) {
  try {
    const numero = Number(req.params.numero);

    const testCompletado = await TestPsicologico.exists({
      userId: req.usuario._id,
    });
    if (!testCompletado) {
      return res.status(403).json({
        success: false,
        error:
          "Debes completar el cuestionario de perfil antes de acceder al contenido.",
        codigo: "TEST_PSICOLOGICO_PENDIENTE",
      });
    }

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
