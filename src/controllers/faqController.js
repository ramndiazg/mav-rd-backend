const FAQ = require("../models/FAQ");

// GET /api/faqs — público, solo activas, ordenadas
async function listarFaqsPublico(req, res, next) {
  try {
    const faqs = await FAQ.find({ activo: true }).sort({
      orden: 1,
      createdAt: -1,
    });
    res.json({ success: true, data: faqs });
  } catch (error) {
    next(error);
  }
}

// GET /api/faqs/admin — coordinadora/admin, todas para gestión
async function listarFaqsAdmin(req, res, next) {
  try {
    const faqs = await FAQ.find({}).sort({ orden: 1, createdAt: -1 });
    res.json({ success: true, data: faqs });
  } catch (error) {
    next(error);
  }
}

// POST /api/faqs — coordinadora/admin
async function crearFaq(req, res, next) {
  try {
    const { pregunta, respuesta, orden } = req.body;

    if (!pregunta || !respuesta) {
      return res.status(400).json({
        success: false,
        error: "Pregunta y respuesta son obligatorias.",
      });
    }

    const faq = await FAQ.create({
      pregunta,
      respuesta,
      orden: orden || 0,
      creadoPor: req.usuario._id,
    });

    res.status(201).json({ success: true, data: faq });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/faqs/:id — coordinadora/admin
async function actualizarFaq(req, res, next) {
  try {
    const { pregunta, respuesta, orden, activo } = req.body;

    const faq = await FAQ.findByIdAndUpdate(
      req.params.id,
      {
        ...(pregunta && { pregunta }),
        ...(respuesta && { respuesta }),
        ...(orden !== undefined && { orden }),
        ...(activo !== undefined && { activo }),
      },
      { new: true },
    );

    if (!faq) {
      return res
        .status(404)
        .json({ success: false, error: "Pregunta frecuente no encontrada." });
    }
    res.json({ success: true, data: faq });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/faqs/:id — coordinadora/admin
async function eliminarFaq(req, res, next) {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    if (!faq) {
      return res
        .status(404)
        .json({ success: false, error: "Pregunta frecuente no encontrada." });
    }
    res.json({ success: true, data: { eliminado: true } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarFaqsPublico,
  listarFaqsAdmin,
  crearFaq,
  actualizarFaq,
  eliminarFaq,
};
