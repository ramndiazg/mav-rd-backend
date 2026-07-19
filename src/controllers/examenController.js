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
 * Lógica compartida de desbloqueo del EXAMEN — la usan tres caminos distintos:
 * 1) La coordinadora, manualmente, desde el panel (excepción/override — esta
 *    SÍ puede saltarse la espera de 24h, ver esOverrideManual abajo).
 * 2) El sistema, automáticamente, cuando la estudiante termina de ver todo
 *    el contenido de estudio de una sesión (ver contenidoSesionController.js).
 * 3) La propia estudiante, con el botón de autoservicio "Reintentar examen" o
 *    "Ir al examen" una vez cumplida la espera (ver intentoExamenController.js).
 *
 * IMPORTANTE — separación de responsabilidades (corregido):
 * Esta función SOLO decide si se puede crear un intento de examen. El acceso
 * a la TEORÍA de la siguiente sesión (progreso.sesionActualDesbloqueada) ya
 * NO se toca aquí — se adelanta inmediatamente al aprobar un examen, dentro
 * de `entregarIntento` (intentoExamenController.js), para que la teoría esté
 * disponible sin esperar las 24h del examen. El orden de las sesiones para
 * efectos del EXAMEN se valida contra `sesionesAprobadas`, no contra
 * `sesionActualDesbloqueada`.
 *
 * No es un handler de Express — no recibe req/res, así que se puede llamar
 * desde cualquier controller. Devuelve { ok: true, intento } o
 * { ok: false, status, error, esperaActiva?, disponibleEn? }.
 */
async function intentarDesbloquear({
  sesionId,
  userId,
  desbloqueadoPor,
  esOverrideManual = false,
}) {
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

  // Orden estricto del EXAMEN: la sesión N solo se puede desbloquear si es la
  // Sesión 1, o si la Sesión N-1 ya está aprobada.
  if (
    sesion.numero > 1 &&
    !progreso.sesionesAprobadas.includes(sesion.numero - 1)
  ) {
    return {
      ok: false,
      status: 400,
      error: `Debes aprobar la Sesión ${sesion.numero - 1} antes de tomar el examen de la Sesión ${sesion.numero}.`,
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

  // Espera mínima de 24h: solo aplica al PRIMER intento de una sesión que no
  // sea la Sesión 1 (nunca a un reintento de una sesión que ya empezó a
  // tomarse — quien ya reprobó una vez no debe esperar otra vez), y solo si
  // no es un override manual de la coordinadora/admin.
  if (intentosPrevios === 0 && sesion.numero > 1 && !esOverrideManual) {
    const aprobacionAnterior = progreso.fechasAprobacionSesion.find(
      (f) => f.sesion === sesion.numero - 1,
    );
    if (aprobacionAnterior) {
      const disponibleEn = new Date(
        aprobacionAnterior.fecha.getTime() + 24 * 60 * 60 * 1000,
      );
      if (Date.now() < disponibleEn.getTime()) {
        return {
          ok: false,
          status: 403,
          error:
            "Debes esperar 24 horas desde que aprobaste la sesión anterior antes de poder tomar este examen.",
          esperaActiva: true,
          disponibleEn,
        };
      }
    }
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

  // NOTA: ya no se actualiza progreso.sesionActualDesbloqueada aquí — ver el
  // comentario grande arriba de la función. Eso ahora vive en
  // entregarIntento (intentoExamenController.js).

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
      esOverrideManual: true, // la coordinadora/admin puede saltarse la espera de 24h
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
