const DestinatarioPractica = require("../models/DestinatarioPractica");

// GET /api/destinatarios-practica
async function listarDestinatariosPractica(req, res, next) {
  try {
    const destinatarios = await DestinatarioPractica.find().sort({
      createdAt: -1,
    });
    res.json({ success: true, data: destinatarios });
  } catch (error) {
    next(error);
  }
}

// POST /api/destinatarios-practica — { tipo, valor, etiqueta }
async function crearDestinatarioPractica(req, res, next) {
  try {
    const { tipo, valor, etiqueta } = req.body;

    if (!tipo || !valor || !etiqueta) {
      return res.status(400).json({
        success: false,
        error: "tipo, valor y etiqueta son obligatorios.",
      });
    }

    if (!["email", "telegram"].includes(tipo)) {
      return res
        .status(400)
        .json({ success: false, error: 'tipo debe ser "email" o "telegram".' });
    }

    const destinatario = await DestinatarioPractica.create({
      tipo,
      valor,
      etiqueta,
      creadoPor: req.usuario._id,
    });

    res.status(201).json({ success: true, data: destinatario });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/destinatarios-practica/:id
async function actualizarDestinatarioPractica(req, res, next) {
  try {
    const { id } = req.params;
    const { valor, etiqueta, activo } = req.body;

    const destinatario = await DestinatarioPractica.findById(id);
    if (!destinatario) {
      return res
        .status(404)
        .json({ success: false, error: "Destinatario no encontrado." });
    }

    if (valor !== undefined) destinatario.valor = valor;
    if (etiqueta !== undefined) destinatario.etiqueta = etiqueta;
    if (activo !== undefined) destinatario.activo = activo;

    await destinatario.save();
    res.json({ success: true, data: destinatario });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/destinatarios-practica/:id
async function eliminarDestinatarioPractica(req, res, next) {
  try {
    const { id } = req.params;
    const destinatario = await DestinatarioPractica.findByIdAndDelete(id);
    if (!destinatario) {
      return res
        .status(404)
        .json({ success: false, error: "Destinatario no encontrado." });
    }
    res.json({ success: true, data: destinatario });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarDestinatariosPractica,
  crearDestinatarioPractica,
  actualizarDestinatarioPractica,
  eliminarDestinatarioPractica,
};
