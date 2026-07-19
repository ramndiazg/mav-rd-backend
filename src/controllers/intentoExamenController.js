const IntentoExamen = require("../models/IntentoExamen");
const Sesion = require("../models/Sesion");
const ProgresoEstudiante = require("../models/ProgresoEstudiante");
const { intentarDesbloquear } = require("./examenController");

// GET /api/intentos-examen/activo/:sesionId
// Devuelve el intento sin entregar más reciente de la estudiante para esa
// sesión, o 404 si no hay ninguno pendiente.
async function obtenerIntentoActivo(req, res, next) {
  try {
    const { sesionId } = req.params;

    const intento = await IntentoExamen.findOne({
      userId: req.usuario._id,
      sesionId,
      fechaFin: null,
    }).sort({ createdAt: -1 });

    if (!intento) {
      return res.status(404).json({
        success: false,
        error:
          "No tienes un examen pendiente para esta sesión. Termina de ver el contenido de estudio, o pide a tu coordinadora que lo habilite.",
      });
    }

    res.json({ success: true, data: intento });
  } catch (error) {
    next(error);
  }
}

// GET /api/intentos-examen/estudiante/:userId — coordinadora/admin, NUEVO
// Todos los intentos de una estudiante, en todas las sesiones — para la
// pestaña "Estudiantes" del panel (ver si pagó, si aprobó, con qué nota).
async function obtenerIntentosDeEstudiante(req, res, next) {
  try {
    const { userId } = req.params;

    const intentos = await IntentoExamen.find({ userId })
      .populate("sesionId", "numero titulo")
      .sort({ createdAt: 1 });

    res.json({ success: true, data: intentos });
  } catch (error) {
    next(error);
  }
}

// GET /api/intentos-examen/historial/:sesionId — NUEVO
// Todos los intentos (entregados o no) de la estudiante para esa sesión, para
// que el frontend decida si mostrar "Reintentar examen" (reprobó y le quedan
// intentos) sin tener que adivinar el estado.
async function obtenerHistorial(req, res, next) {
  try {
    const { sesionId } = req.params;

    const intentos = await IntentoExamen.find({
      userId: req.usuario._id,
      sesionId,
    }).sort({ createdAt: 1 });

    res.json({ success: true, data: intentos });
  } catch (error) {
    next(error);
  }
}

// GET /api/intentos-examen/:id/detalle — NUEVO
// Detalle pregunta por pregunta de un intento YA ENTREGADO: qué marcó la
// estudiante vs. cuál era la correcta, para pintar verde/rojo en el frontend.
// No se expone nada de esto mientras el intento sigue en curso (fechaFin null).
async function obtenerDetalleIntento(req, res, next) {
  try {
    const intento = await IntentoExamen.findById(req.params.id).populate(
      "examenId",
    );

    if (!intento) {
      return res
        .status(404)
        .json({ success: false, error: "Intento no encontrado." });
    }

    if (String(intento.userId) !== String(req.usuario._id)) {
      return res
        .status(403)
        .json({ success: false, error: "Este intento no te pertenece." });
    }

    if (!intento.fechaFin) {
      return res.status(400).json({
        success: false,
        error: "Este examen todavía no ha sido entregado.",
      });
    }

    const detalle = intento.examenId.preguntas.map((p, i) => ({
      texto: p.texto,
      opciones: p.opciones,
      respuestaEstudiante: intento.respuestas[i],
      respuestaCorrectaIndex: p.respuestaCorrectaIndex,
      acerto: intento.respuestas[i] === p.respuestaCorrectaIndex,
    }));

    res.json({
      success: true,
      data: {
        calificacion: intento.calificacion,
        aprobado: intento.aprobado,
        preguntas: detalle,
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/intentos-examen/reintentar/:sesionId — NUEVO
// Autoservicio: la estudiante ya vio el contenido en su primer intento, así
// que no tiene sentido pedirle que lo vea de nuevo para reprobar/reintentar.
async function reintentarExamen(req, res, next) {
  try {
    const { sesionId } = req.params;

    const resultado = await intentarDesbloquear({
      sesionId,
      userId: req.usuario._id,
      desbloqueadoPor: req.usuario._id, // se autodesbloquea
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

// POST /api/intentos-examen/:id/iniciar — estudiante inicia su intento (arranca el timer)
async function iniciarIntento(req, res, next) {
  try {
    const intento = await IntentoExamen.findById(req.params.id).populate(
      "examenId",
    );

    if (!intento) {
      return res
        .status(404)
        .json({ success: false, error: "Intento no encontrado." });
    }

    if (String(intento.userId) !== String(req.usuario._id)) {
      return res
        .status(403)
        .json({ success: false, error: "Este intento no te pertenece." });
    }

    if (intento.fechaInicio) {
      return res
        .status(409)
        .json({ success: false, error: "Este examen ya fue iniciado." });
    }

    intento.fechaInicio = new Date();
    await intento.save();

    const preguntasSinRespuesta = intento.examenId.preguntas.map((p) => ({
      texto: p.texto,
      opciones: p.opciones,
    }));

    res.json({
      success: true,
      data: {
        intentoId: intento._id,
        preguntas: preguntasSinRespuesta,
        tiempoLimiteSegundos: intento.tiempoLimiteSegundos,
        fechaInicio: intento.fechaInicio,
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/intentos-examen/:id/entregar — estudiante entrega respuestas
async function entregarIntento(req, res, next) {
  try {
    const { respuestas } = req.body;

    if (!Array.isArray(respuestas)) {
      return res
        .status(400)
        .json({ success: false, error: "respuestas debe ser un arreglo." });
    }

    const intento = await IntentoExamen.findById(req.params.id).populate(
      "examenId",
    );
    if (!intento) {
      return res
        .status(404)
        .json({ success: false, error: "Intento no encontrado." });
    }

    if (String(intento.userId) !== String(req.usuario._id)) {
      return res
        .status(403)
        .json({ success: false, error: "Este intento no te pertenece." });
    }

    if (!intento.fechaInicio) {
      return res.status(400).json({
        success: false,
        error: "Debes iniciar el examen antes de entregarlo.",
      });
    }

    if (intento.fechaFin) {
      return res
        .status(409)
        .json({ success: false, error: "Este intento ya fue entregado." });
    }

    const preguntas = intento.examenId.preguntas;
    let correctas = 0;
    preguntas.forEach((p, i) => {
      if (respuestas[i] === p.respuestaCorrectaIndex) correctas += 1;
    });
    const calificacion = Math.round((correctas / preguntas.length) * 100);
    const aprobado = calificacion >= 70;

    intento.respuestas = respuestas;
    intento.calificacion = calificacion;
    intento.aprobado = aprobado;
    intento.fechaFin = new Date();
    await intento.save();

    if (aprobado) {
      const progreso = await ProgresoEstudiante.findOne({
        userId: intento.userId,
      });
      if (progreso) {
        const sesionDoc = await Sesion.findById(intento.sesionId);

        if (
          sesionDoc &&
          !progreso.sesionesAprobadas.includes(sesionDoc.numero)
        ) {
          progreso.sesionesAprobadas.push(sesionDoc.numero);
        }
        if (progreso.sesionesAprobadas.length >= 3) {
          progreso.cursoCompletado = true;
        }
        await progreso.save();
      }
    }

    res.json({ success: true, data: { calificacion, aprobado } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  obtenerIntentoActivo,
  obtenerHistorial,
  obtenerIntentosDeEstudiante,
  reintentarExamen,
  iniciarIntento,
  entregarIntento,
  obtenerDetalleIntento,
};
