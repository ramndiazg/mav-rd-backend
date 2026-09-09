const InformacionComplementariaEscolar = require("../models/InformacionComplementariaEscolar");
const User = require("../models/User");

// POST /api/informacion-complementaria-escolar/mi-respuesta — estudiante, una sola vez
async function enviarMiRespuesta(req, res, next) {
  try {
    const yaExiste = await InformacionComplementariaEscolar.findOne({
      userId: req.usuario._id,
    });
    if (yaExiste) {
      return res.status(409).json({
        success: false,
        error: "Ya completaste este cuestionario anteriormente.",
      });
    }

    const { respuestas, reflexiones } = req.body;

    const informacion = await InformacionComplementariaEscolar.create({
      userId: req.usuario._id,
      respuestas,
      reflexiones,
    });

    res.status(201).json({ success: true, data: informacion });
  } catch (error) {
    next(error);
  }
}

// GET /api/informacion-complementaria-escolar/mi-respuesta — estudiante:
// ¿ya lo completé? Devuelve solo un booleano de estado, no las
// respuestas — mismo patrón que TestPsicologico: esto es solo para que
// el frontend sepa si debe mostrar el formulario o no.
async function obtenerMiEstado(req, res, next) {
  try {
    const informacion = await InformacionComplementariaEscolar.findOne({
      userId: req.usuario._id,
    }).select("_id createdAt");
    res.json({
      success: true,
      completado: !!informacion,
      fecha: informacion?.createdAt || null,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/informacion-complementaria-escolar — coordinadora/admin: lista
// de quiénes lo han completado, con datos básicos de la estudiante.
async function listarRespuestas(req, res, next) {
  try {
    const respuestas = await InformacionComplementariaEscolar.find({})
      .populate("userId", "nombre apellido cedula email")
      .sort({ createdAt: -1 })
      .select("userId createdAt");

    res.json({ success: true, data: respuestas });
  } catch (error) {
    next(error);
  }
}

// GET /api/informacion-complementaria-escolar/:userId — coordinadora/admin:
// respuestas completas de una estudiante específica.
async function obtenerRespuestaPorUsuario(req, res, next) {
  try {
    const informacion = await InformacionComplementariaEscolar.findOne({
      userId: req.params.userId,
    });
    if (!informacion) {
      return res.status(404).json({
        success: false,
        error: "Esta estudiante todavía no ha completado el cuestionario.",
      });
    }

    const estudiante = await User.findById(req.params.userId).select(
      "nombre apellido cedula email",
    );

    res.json({ success: true, data: { informacion, estudiante } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  enviarMiRespuesta,
  obtenerMiEstado,
  listarRespuestas,
  obtenerRespuestaPorUsuario,
};
