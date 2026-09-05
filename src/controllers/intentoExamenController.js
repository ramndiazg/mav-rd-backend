const IntentoExamen = require("../models/IntentoExamen");
const Sesion = require("../models/Sesion");
const ProgresoEstudiante = require("../models/ProgresoEstudiante");
const Inscripcion = require("../models/Inscripcion");
const { intentarDesbloquear } = require("./examenController");
const {
  notificarEstudianteListaParaPractica,
} = require("../utils/notificaciones");

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

async function reintentarExamen(req, res, next) {
  try {
    const { sesionId } = req.params;

    const resultado = await intentarDesbloquear({
      sesionId,
      userId: req.usuario._id,
      desbloqueadoPor: req.usuario._id,
    });

    if (!resultado.ok) {
      return res.status(resultado.status).json({
        success: false,
        error: resultado.error,
        esperaActiva: resultado.esperaActiva || false,
        disponibleEn: resultado.disponibleEn || null,
      });
    }

    res.status(201).json({ success: true, data: resultado.intento });
  } catch (error) {
    next(error);
  }
}

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

    let proximaSesionDisponibleEn = null;
    if (aprobado) {
      const progreso = await ProgresoEstudiante.findOne({
        userId: intento.userId,
      });
      if (progreso) {
        const sesionDoc = await Sesion.findById(intento.sesionId);

        // NUEVO: se guarda ANTES de tocar cursoCompletado, para poder
        // detectar la transición false -> true y no volver a notificar en
        // guardados posteriores (por ejemplo si algo más recalcula progreso).
        const completadoAntes = progreso.cursoCompletado;

        if (
          sesionDoc &&
          !progreso.sesionesAprobadas.includes(sesionDoc.numero)
        ) {
          progreso.sesionesAprobadas.push(sesionDoc.numero);
        }

        if (sesionDoc) {
          const fechaAprobacion = new Date();
          const yaRegistrada = progreso.fechasAprobacionSesion.find(
            (f) => f.sesion === sesionDoc.numero,
          );
          if (!yaRegistrada) {
            progreso.fechasAprobacionSesion.push({
              sesion: sesionDoc.numero,
              fecha: fechaAprobacion,
            });
          }

          const siguienteSesion = Math.min(sesionDoc.numero + 1, 4);
          if (siguienteSesion > progreso.sesionActualDesbloqueada) {
            progreso.sesionActualDesbloqueada = siguienteSesion;
          }

          if (sesionDoc.numero < 4) {
            proximaSesionDisponibleEn = new Date(
              fechaAprobacion.getTime() + 24 * 60 * 60 * 1000,
            );
          }
        }

        if (progreso.sesionesAprobadas.length >= 4) {
          progreso.cursoCompletado = true;
        }
        await progreso.save();

        // NUEVO (05/09/2026): recién ahora terminó toda la teoría —
        // notificar a los choferes activos y a DestinatarioPractica. Sin
        // await a propósito, igual que enviarCorreoDiplomaListo — no debe
        // demorar la respuesta a la estudiante.
        if (!completadoAntes && progreso.cursoCompletado) {
          const inscripcion = await Inscripcion.findOne({
            userId: intento.userId,
            estadoPago: "pagado",
          });

          notificarEstudianteListaParaPractica({
            nombre: req.usuario.nombre,
            apellido: req.usuario.apellido,
            cedula: req.usuario.cedula,
            telefono: req.usuario.telefono,
            email: req.usuario.email,
            tipoPlan: inscripcion?.tipoPlan || "desconocido",
          });
        }
      }
    }

    res.json({
      success: true,
      data: { calificacion, aprobado, proximaSesionDisponibleEn },
    });
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
