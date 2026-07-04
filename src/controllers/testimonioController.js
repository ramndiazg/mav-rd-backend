const Testimonio = require("../models/Testimonio");

// GET /api/testimonios — público, solo los activos, ordenados
async function listarTestimoniosPublico(req, res, next) {
  try {
    const testimonios = await Testimonio.find({ activo: true }).sort({
      orden: 1,
      createdAt: -1,
    });
    res.json({ success: true, data: testimonios });
  } catch (error) {
    next(error);
  }
}

// GET /api/testimonios/admin — coordinadora/admin, todos (incluye inactivos) para gestión
async function listarTestimoniosAdmin(req, res, next) {
  try {
    const testimonios = await Testimonio.find({}).sort({
      orden: 1,
      createdAt: -1,
    });
    res.json({ success: true, data: testimonios });
  } catch (error) {
    next(error);
  }
}

// POST /api/testimonios — coordinadora/admin
async function crearTestimonio(req, res, next) {
  try {
    const { nombre, texto, fotoUrl, orden } = req.body;

    if (!nombre || !texto) {
      return res
        .status(400)
        .json({ success: false, error: "Nombre y texto son obligatorios." });
    }

    const testimonio = await Testimonio.create({
      nombre,
      texto,
      fotoUrl: fotoUrl || null,
      orden: orden || 0,
      creadoPor: req.usuario._id,
    });

    res.status(201).json({ success: true, data: testimonio });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/testimonios/:id — coordinadora/admin
async function actualizarTestimonio(req, res, next) {
  try {
    const { nombre, texto, fotoUrl, orden, activo } = req.body;

    const testimonio = await Testimonio.findByIdAndUpdate(
      req.params.id,
      {
        ...(nombre && { nombre }),
        ...(texto && { texto }),
        ...(fotoUrl !== undefined && { fotoUrl }),
        ...(orden !== undefined && { orden }),
        ...(activo !== undefined && { activo }),
      },
      { new: true },
    );

    if (!testimonio) {
      return res
        .status(404)
        .json({ success: false, error: "Testimonio no encontrado." });
    }
    res.json({ success: true, data: testimonio });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/testimonios/:id — coordinadora/admin
async function eliminarTestimonio(req, res, next) {
  try {
    const testimonio = await Testimonio.findByIdAndDelete(req.params.id);
    if (!testimonio) {
      return res
        .status(404)
        .json({ success: false, error: "Testimonio no encontrado." });
    }
    res.json({ success: true, data: { eliminado: true } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarTestimoniosPublico,
  listarTestimoniosAdmin,
  crearTestimonio,
  actualizarTestimonio,
  eliminarTestimonio,
};
