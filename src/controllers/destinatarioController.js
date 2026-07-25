const DestinatarioNotificacion = require("../models/DestinatarioNotificacion");

// GET /api/destinatarios — admin ve todos, incluidos inactivos
async function listarDestinatarios(req, res, next) {
  try {
    const destinatarios = await DestinatarioNotificacion.find().sort({
      createdAt: -1,
    });
    res.json({ success: true, data: destinatarios });
  } catch (error) {
    next(error);
  }
}

// POST /api/destinatarios — { tipo, valor, etiqueta }
async function crearDestinatario(req, res, next) {
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

    const destinatario = await DestinatarioNotificacion.create({
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

// PATCH /api/destinatarios/:id — { valor?, etiqueta?, activo? }
async function actualizarDestinatario(req, res, next) {
  try {
    const { id } = req.params;
    const { valor, etiqueta, activo } = req.body;

    const destinatario = await DestinatarioNotificacion.findById(id);
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

// DELETE /api/destinatarios/:id — borrado real (no hay nada que referencie
// esta colección, así que no hace falta borrado lógico aquí)
async function eliminarDestinatario(req, res, next) {
  try {
    const { id } = req.params;
    const destinatario = await DestinatarioNotificacion.findByIdAndDelete(id);
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
  listarDestinatarios,
  crearDestinatario,
  actualizarDestinatario,
  eliminarDestinatario,
};
