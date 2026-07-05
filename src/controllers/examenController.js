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

// PATCH /api/examenes/:id — NUEVO: editar preguntas/opciones de una versión existente
// Uso principal: la fundadora actualiza el banco cuando cambia la Ley 63-17.
async function editarExamen(req, res, next) {
  try {
    const { id } = req.params;
    const { nombreVersion, preguntas } = req.body;

    const examen = await Examen.findById(id);
    if (!examen) {
      return res
        .status(404)
        .json({ success: false, error: "Examen no encontrado." });
    }

    if (nombreVersion !== undefined) examen.nombreVersion = nombreVersion;
    if (preguntas !== undefined) {
      if (!Array.isArray(preguntas) || preguntas.length !== 10) {
        return res.status(400).json({
          success: false,
          error: "preguntas debe ser un arreglo de exactamente 10 elementos.",
        });
      }
      examen.preguntas = preguntas;
    }

    await examen.save();

    // Nota: los IntentoExamen ya calificados que usaron esta versión no se ven
    // afectados retroactivamente — su `respuestas`/`calificacion` quedan como
    // se calcularon en su momento. Editar aquí solo afecta intentos futuros.
    res.json({ success: true, data: examen });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/examenes/:id — NUEVO: borrado lógico (admin), nunca físico
async function eliminarExamen(req, res, next) {
  try {
    const { id } = req.params;

    const examen = await Examen.findById(id);
    if (!examen) {
      return res
        .status(404)
        .json({ success: false, error: "Examen no encontrado." });
    }

    // Borrado lógico: los IntentoExamen históricos siguen referenciando este
    // examenId, así que borrarlo físicamente rompería ese historial.
    examen.activo = false;
    await examen.save();

    res.json({ success: true, data: examen });
  } catch (error) {
    next(error);
  }
}

// POST /api/examenes/:sesionId/desbloquear — coordinadora desbloquea la SESIÓN
// (ya no elige versión de examen manualmente — el backend la asigna al azar)
async function desbloquearExamen(req, res, next) {
  try {
    const { sesionId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, error: "userId es obligatorio." });
    }

    const sesion = await Sesion.findById(sesionId);
    if (!sesion) {
      return res
        .status(404)
        .json({ success: false, error: "Sesión no encontrada." });
    }

    const progreso = await ProgresoEstudiante.findOne({ userId });
    if (!progreso) {
      return res.status(404).json({
        success: false,
        error:
          "La estudiante no tiene un pago confirmado (no existe progreso registrado).",
      });
    }

    // Orden estricto: solo se puede desbloquear la sesión siguiente a la ya
    // desbloqueada, o repetir la sesión actual (reintento).
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

    // NUEVO: asignación al azar entre las versiones activas de esta sesión.
    // Antes la coordinadora elegía manualmente el examenId — eso dejaba sin
    // resolver "quién decide la versión" y era fácil de repetir sin querer.
    const versionesActivas = await Examen.find({ sesionId, activo: true });
    if (versionesActivas.length === 0) {
      return res.status(400).json({
        success: false,
        error:
          "No hay versiones de examen activas para esta sesión. Crea al menos una con POST /api/examenes.",
      });
    }
    const examenElegido =
      versionesActivas[Math.floor(Math.random() * versionesActivas.length)];

    const intento = await IntentoExamen.create({
      userId,
      sesionId: sesion._id,
      examenId: examenElegido._id,
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

module.exports = {
  crearExamen,
  listarExamenesPorSesion,
  editarExamen,
  eliminarExamen,
  desbloquearExamen,
};
