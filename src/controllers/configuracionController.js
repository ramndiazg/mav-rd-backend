const Configuracion = require("../models/Configuracion");

// Valores por defecto si aún no existen en la base de datos.
// NOTA (migración de planes, 06/09/2026): precio_plan_normal y
// precio_plan_vip vivían aquí — ahora los precios y el resto de atributos
// de cada plan (Fundación/Normal/VIP) viven en la colección Plan, expuesta
// vía GET /api/planes. Los registros viejos de Configuracion con esas
// claves quedan huérfanos en la base (no se borran automáticamente) pero
// ya no los lee ningún endpoint.
const DEFAULTS = {};

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
