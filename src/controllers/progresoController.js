const ProgresoEstudiante = require("../models/ProgresoEstudiante");

// GET /api/progreso/me — la propia estudiante ve su avance
async function obtenerMiProgreso(req, res, next) {
  try {
    const progreso = await ProgresoEstudiante.findOne({
      userId: req.usuario._id,
    });
    if (!progreso) {
      return res.status(404).json({
        success: false,
        error:
          "Aún no tienes un pago confirmado, por eso no hay progreso registrado.",
      });
    }
    res.json({ success: true, data: progreso });
  } catch (error) {
    next(error);
  }
}

// GET /api/progreso/:userId — coordinadora/admin ve el avance de una estudiante específica
async function obtenerProgresoPorUsuario(req, res, next) {
  try {
    const progreso = await ProgresoEstudiante.findOne({
      userId: req.params.userId,
    });
    if (!progreso) {
      return res.status(404).json({
        success: false,
        error: "No hay progreso registrado para esta estudiante.",
      });
    }
    res.json({ success: true, data: progreso });
  } catch (error) {
    next(error);
  }
}

module.exports = { obtenerMiProgreso, obtenerProgresoPorUsuario };
