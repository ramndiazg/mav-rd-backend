const Plan = require("../models/Plan");

// GET /api/planes?programa=estandar — público, lo usan el Home y
// /inscripcion. Sin ?programa, asume "estandar" (hoy el único que existe).
async function listarPlanes(req, res, next) {
  try {
    const programa = req.query.programa || "estandar";
    const planes = await Plan.find({ programa, activo: true }).sort({
      orden: 1,
    });
    res.json({ success: true, data: planes });
  } catch (error) {
    next(error);
  }
}

// GET /api/planes/:codigo?programa=estandar — público, detalle de un plan
async function obtenerPlan(req, res, next) {
  try {
    const programa = req.query.programa || "estandar";
    const plan = await Plan.findOne({
      codigo: req.params.codigo,
      programa,
      activo: true,
    });
    if (!plan) {
      return res
        .status(404)
        .json({ success: false, error: "Plan no encontrado." });
    }
    res.json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/planes/:codigo?programa=estandar — solo admin. No permite
// crear planes nuevos por esta vía (eso es cosa del script de migración)
// ni cambiar el código/programa de uno existente — solo editar sus datos
// (precio, características, etc).
async function actualizarPlan(req, res, next) {
  try {
    const { codigo } = req.params;
    const programa = req.query.programa || "estandar";
    const cambios = { ...req.body };
    delete cambios.codigo;
    delete cambios.programa;

    const actualizado = await Plan.findOneAndUpdate(
      { codigo, programa },
      cambios,
      { new: true, runValidators: true },
    );

    if (!actualizado) {
      return res
        .status(404)
        .json({ success: false, error: "Plan no encontrado." });
    }

    res.json({ success: true, data: actualizado });
  } catch (error) {
    next(error);
  }
}

module.exports = { listarPlanes, obtenerPlan, actualizarPlan };
