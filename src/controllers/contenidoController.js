const ContenidoPagina = require("../models/ContenidoPagina");

// GET /api/contenido — público, todos los bloques
async function listarContenido(req, res, next) {
  try {
    const bloques = await ContenidoPagina.find().sort({ clave: 1 });
    res.json({ success: true, data: bloques });
  } catch (error) {
    next(error);
  }
}

// GET /api/contenido/:clave — público, un bloque específico
async function obtenerContenido(req, res, next) {
  try {
    const bloque = await ContenidoPagina.findOne({ clave: req.params.clave });
    if (!bloque) {
      return res
        .status(404)
        .json({ success: false, error: "Ese bloque de contenido no existe." });
    }
    res.json({ success: true, data: bloque });
  } catch (error) {
    next(error);
  }
}

// POST /api/contenido — admin, crear un bloque nuevo (para cuando se necesite
// una clave que todavía no existe, sin tocar código)
async function crearContenido(req, res, next) {
  try {
    const { clave, valor, tipo } = req.body;

    if (!clave || valor === undefined) {
      return res
        .status(400)
        .json({ success: false, error: "clave y valor son obligatorios." });
    }

    const existente = await ContenidoPagina.findOne({ clave });
    if (existente) {
      return res.status(409).json({
        success: false,
        error: "Ya existe un bloque con esa clave. Usa PATCH para editarlo.",
      });
    }

    const bloque = await ContenidoPagina.create({
      clave,
      valor,
      tipo: tipo || "texto",
      actualizadoPor: req.usuario._id,
    });

    res.status(201).json({ success: true, data: bloque });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/contenido/:clave — admin, actualizar el valor de un bloque existente
async function editarContenido(req, res, next) {
  try {
    const { valor } = req.body;
    if (valor === undefined) {
      return res
        .status(400)
        .json({ success: false, error: "valor es obligatorio." });
    }

    const bloque = await ContenidoPagina.findOneAndUpdate(
      { clave: req.params.clave },
      { valor, actualizadoPor: req.usuario._id },
      { new: true },
    );

    if (!bloque) {
      return res
        .status(404)
        .json({ success: false, error: "Ese bloque de contenido no existe." });
    }

    res.json({ success: true, data: bloque });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarContenido,
  obtenerContenido,
  crearContenido,
  editarContenido,
};
