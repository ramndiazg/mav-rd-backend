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

// PATCH /api/examenes/:id — editar preguntas/opciones de una versión existente
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
    res.json({ success: true, data: examen });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/examenes/:id — borrado lógico (admin), nunca físico
async function eliminarExamen(req, res, next) {
  try {
    const { id } = req.params;

    const examen = await Examen.findById(id);
    if (!examen) {
      return res
        .status(404)
        .json({ success: false, error: "Examen no encontrado." });
    }

    examen.activo = false;
    await examen.save();

    res.json({ success: true, data: examen });
  } catch (error) {
    next(error);
  }
}

/**
 * Lógica compartida de desbloqueo — la usan tres caminos distintos:
 * 1) La coordinadora, manualmente, desde el panel (excepción/override).
 * 2) El sistema, automáticamente, cuando la estudiante termina de ver todo
 *    el contenido de estudio de una sesión (ver contenidoSesionController.js).
 * 3) La propia estudiante, con el botón de autoservicio "Reintentar examen"
 *    después de reprobar (ver intentoExamenController.js).
 *
 * No es un handler de Express — no recibe req/res, así que se puede llamar
 * desde cualquier controller. Devuelve { ok: true, intento } o
 * { ok: false, status, error }.
 */
async function intentarDesbloquear({ sesionId, userId, desbloqueadoPor }) {
  const sesion = await Sesion.findById(sesionId);
  if (!sesion) {
    return { ok: false, status: 404, error: "Sesión no encontrada." };
  }

  const progreso = await ProgresoEstudiante.findOne({ userId });
  if (!progreso) {
    return {
      ok: false,
      status: 404,
      error:
        "La estudiante no tiene un pago confirmado (no existe progreso registrado).",
    };
  }

  // Orden estricto: solo se puede desbloquear la sesión siguiente a la ya
  // desbloqueada, o repetir la sesión actual (reintento).
  if (sesion.numero > progreso.sesionActualDesbloqueada + 1) {
    return {
      ok: false,
      status: 400,
      error: `La estudiante debe completar la Sesión ${progreso.sesionActualDesbloqueada} antes de avanzar a la Sesión ${sesion.numero}.`,
    };
  }

  const intentosPrevios = await IntentoExamen.countDocuments({
    userId,
    sesionId: sesion._id,
  });

  if (intentosPrevios >= 3) {
    return {
      ok: false,
      status: 400,
      error:
        "Esta estudiante ya agotó los 3 intentos permitidos para esta sesión.",
    };
  }

  // Si ya existe un intento sin entregar para esta sesión, no crear otro —
  // devolverlo tal cual (evita duplicados si se dispara dos veces seguidas,
  // por ejemplo al marcar el último contenido como visto dos veces rápido).
  const intentoActivo = await IntentoExamen.findOne({
    userId,
    sesionId: sesion._id,
    fechaFin: null,
  });
  if (intentoActivo) {
    return { ok: true, intento: intentoActivo, yaExistia: true };
  }

  const versionesActivas = await Examen.find({ sesionId, activo: true });
  if (versionesActivas.length === 0) {
    return {
      ok: false,
      status: 400,
      error: "No hay versiones de examen activas para esta sesión.",
    };
  }
  const examenElegido =
    versionesActivas[Math.floor(Math.random() * versionesActivas.length)];

  const intento = await IntentoExamen.create({
    userId,
    sesionId: sesion._id,
    examenId: examenElegido._id,
    numeroIntento: intentosPrevios + 1,
    desbloqueadoPor,
  });

  if (sesion.numero > progreso.sesionActualDesbloqueada) {
    progreso.sesionActualDesbloqueada = sesion.numero;
    await progreso.save();
  }

  return { ok: true, intento };
}

// POST /api/examenes/:sesionId/desbloquear — coordinadora, manual (excepción/override)
async function desbloquearExamen(req, res, next) {
  try {
    const { sesionId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, error: "userId es obligatorio." });
    }

    const resultado = await intentarDesbloquear({
      sesionId,
      userId,
      desbloqueadoPor: req.usuario._id,
    });

    if (!resultado.ok) {
      return res
        .status(resultado.status)
        .json({ success: false, error: resultado.error });
    }

    res.status(201).json({ success: true, data: resultado.intento });
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
  intentarDesbloquear, // exportado para contenidoSesionController.js e intentoExamenController.js
};
