const Instructor = require("../models/Instructor");

// GET /api/instructores — admin: todos, incluidos inactivos
async function listarInstructores(req, res, next) {
  try {
    const instructores = await Instructor.find()
      .populate("userId", "nombre apellido telefono email activo")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: instructores });
  } catch (error) {
    next(error);
  }
}

// GET /api/instructores/activos — estudiante/conductor/coordinadora/admin:
// solo los datos que la estudiante necesita para contactar a un chofer.
async function listarInstructoresActivos(req, res, next) {
  try {
    const instructores = await Instructor.find({ activo: true })
      .select("diasDisponibles userId")
      .populate("userId", "nombre apellido telefono email");
    res.json({ success: true, data: instructores });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/instructores/:id — admin: editar horarios o activar/desactivar
async function actualizarInstructor(req, res, next) {
  try {
    const { diasDisponibles, activo } = req.body;

    const instructor = await Instructor.findById(req.params.id);
    if (!instructor) {
      return res
        .status(404)
        .json({ success: false, error: "Instructor no encontrado." });
    }

    if (diasDisponibles !== undefined) {
      instructor.diasDisponibles = diasDisponibles;
    }
    if (activo !== undefined) instructor.activo = activo;

    await instructor.save();
    res.json({ success: true, data: instructor });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarInstructores,
  listarInstructoresActivos,
  actualizarInstructor,
};
