const Examen = require("../models/Examen");
const Sesion = require("../models/Sesion");
const IntentoExamen = require("../models/IntentoExamen");
const ProgresoEstudiante = require("../models/ProgresoEstudiante");

// POST /api/examenes — coordinadora/admin crea una nueva versión de examen para una sesión
async function crearExamen(req, res, next) {
  try {
    const { sesionId, nombreVersion, preguntas } = req.body;

    if (!sesionId || !nombreVersion || !preguntas) {
      return res.status(400).json({
        success: false,
        error: "sesionId, nombreVersion y preguntas son obligatorios.",
      });
    }

    const sesion = await Sesion.findById(sesionId);
    if (!sesion) {
      return res
        .status(404)
        .json({ success: false, error: "Sesión no encontrada." });
    }

    const examen = await Examen.create({ sesionId, nombreVersion, preguntas });
    res.status(201).json({ success: true, data: examen });
  } catch (error) {
    next(error);
  }
}

// GET /api/examenes/sesion/:sesionId — coordinadora/admin: versiones disponibles de esa sesión
async function listarExamenesPorSesion(req, res, next) {
  try {
    const { sesionId } = req.params;
    const examenes = await Examen.find({ sesionId, activo: true });
    res.json({ success: true, data: examenes });
  } catch (error) {
    next(error);
  }
}

// POST /api/examenes/:examenId/desbloquear — coordinadora asigna una versión a una estudiante
async function desbloquearExamen(req, res, next) {
  try {
    const { examenId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, error: "userId es obligatorio." });
    }

    const examen = await Examen.findById(examenId).populate("sesionId");
    if (!examen) {
      return res
        .status(404)
        .json({ success: false, error: "Examen no encontrado." });
    }

    const sesion = examen.sesionId;

    const progreso = await ProgresoEstudiante.findOne({ userId });
    if (!progreso) {
      return res.status(404).json({
        success: false,
        error:
          "La estudiante no tiene un pago confirmado (no existe progreso registrado).",
      });
    }

    // Orden estricto: solo se puede desbloquear la sesión siguiente a la ya desbloqueada,
    // o repetir la sesión actual (reintento).
    if (sesion.numero > progreso.sesionActualDesbloqueada + 1) {
      return res.status(400).json({
        success: false,
        error: `La estudiante debe completar la Sesión ${progreso.sesionActualDesbloqueada} antes de avanzar a la Sesión ${sesion.numero}.`,
      });
    }

    // Verificar intentos previos (máximo 3)
    const intentosPrevios = await IntentoExamen.countDocuments({
      userId,
      sesionId: sesion._id,
    });

    if (intentosPrevios >= 3) {
      return res.status(400).json({
        success: false,
        error:
          "Esta estudiante ya agotó los 3 intentos permitidos para esta sesión.",
      });
    }

    const intento = await IntentoExamen.create({
      userId,
      sesionId: sesion._id,
      examenId: examen._id,
      numeroIntento: intentosPrevios + 1,
      desbloqueadoPor: req.usuario._id,
    });

    // Si es la primera vez que se desbloquea esta sesión, actualizar el avance
    if (sesion.numero > progreso.sesionActualDesbloqueada) {
      progreso.sesionActualDesbloqueada = sesion.numero;
      await progreso.save();
    }

    res.status(201).json({ success: true, data: intento });
  } catch (error) {
    next(error);
  }
}

module.exports = { crearExamen, listarExamenesPorSesion, desbloquearExamen };
