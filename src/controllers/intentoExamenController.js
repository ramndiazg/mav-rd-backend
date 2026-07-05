const IntentoExamen = require("../models/IntentoExamen");
const Sesion = require("../models/Sesion");
const ProgresoEstudiante = require("../models/ProgresoEstudiante");

// GET /api/intentos-examen/activo/:sesionId — NUEVO
// La estudiante no tenía forma de saber el id de su propio IntentoExamen
// (lo crea la coordinadora al desbloquear). Este endpoint devuelve el intento
// sin entregar más reciente de esa sesión, o 404 si no hay ninguno pendiente.
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
          "No tienes un examen pendiente para esta sesión. Pide a tu coordinadora que lo desbloquee.",
      });
    }

    res.json({ success: true, data: intento });
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

    // Se devuelven las preguntas SIN la respuesta correcta
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
    const { respuestas } = req.body; // array de índices elegidos

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

    // Si aprobó, actualizar el progreso consolidado de la estudiante
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

module.exports = { obtenerIntentoActivo, iniciarIntento, entregarIntento };
