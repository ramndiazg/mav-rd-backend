const Configuracion = require("../models/Configuracion");

// Valores por defecto si aún no existen en la base de datos
const DEFAULTS = {
  precio_plan_normal: 0,
  precio_plan_vip: 0,
};

// GET /api/configuracion — público (el frontend necesita mostrar precios)
async function obtenerConfiguracion(req, res, next) {
  try {
    const registros = await Configuracion.find({});
    const config = { ...DEFAULTS };
    registros.forEach((r) => {
      config[r.clave] = r.valor;
    });
    res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/configuracion/:clave — solo admin
async function actualizarConfiguracion(req, res, next) {
  try {
    const { clave } = req.params;
    const { valor } = req.body;

    if (valor === undefined) {
      return res
        .status(400)
        .json({ success: false, error: 'Falta el campo "valor".' });
    }

    const actualizado = await Configuracion.findOneAndUpdate(
      { clave },
      { valor, actualizadoPor: req.usuario._id },
      { new: true, upsert: true },
    );

    res.json({ success: true, data: actualizado });
  } catch (error) {
    next(error);
  }
}

module.exports = { obtenerConfiguracion, actualizarConfiguracion };
