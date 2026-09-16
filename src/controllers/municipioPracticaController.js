const MunicipioPractica = require("../models/MunicipioPractica");

// GET /api/municipios-practica — admin, lista completa (activos e
// inactivos) para que /admin/cobertura-practica pueda mostrar y
// reactivar cualquiera. Mismo patrón que listarPlanesAdmin en
// planController.js.
async function listarTodos(req, res, next) {
  try {
    const filas = await MunicipioPractica.find().sort({
      provincia: 1,
      municipio: 1,
    });
    res.json({ success: true, data: filas });
  } catch (error) {
    next(error);
  }
}

// POST /api/municipios-practica — admin, agrega { provincia, municipio }.
// Nace activo: true — habilitar cobertura es la acción explícita de
// agregar la fila, no hay un paso intermedio de "agregada pero inactiva".
async function agregar(req, res, next) {
  try {
    const { provincia, municipio } = req.body;

    if (!provincia || !municipio) {
      return res.status(400).json({
        success: false,
        error: "provincia y municipio son obligatorios.",
      });
    }

    const fila = await MunicipioPractica.create({ provincia, municipio });
    res.status(201).json({ success: true, data: fila });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "Ese municipio ya está en la lista de cobertura.",
      });
    }
    next(error);
  }
}

// PATCH /api/municipios-practica/:id — admin, activar/desactivar. No
// permite cambiar provincia/municipio por esta vía, solo el estado — si
// se agregó por error, se borra desde Atlas directamente (caso raro, no
// justifica un DELETE en la API).
async function actualizarEstado(req, res, next) {
  try {
    const { activo } = req.body;

    if (typeof activo !== "boolean") {
      return res
        .status(400)
        .json({ success: false, error: "activo debe ser true o false." });
    }

    const fila = await MunicipioPractica.findByIdAndUpdate(
      req.params.id,
      { activo },
      { new: true, runValidators: true },
    );

    if (!fila) {
      return res.status(404).json({ success: false, error: "No encontrado." });
    }

    res.json({ success: true, data: fila });
  } catch (error) {
    next(error);
  }
}

// GET /api/municipios-practica/cobertura?provincia=X&municipio=Y —
// público, liviano: solo confirma si ESE punto puntual está cubierto, sin
// exponer la lista completa a cualquiera (la usa /inscripcion para decidir
// qué planes mostrar, y el propio backend para validar la inscripción).
async function consultarCobertura(req, res, next) {
  try {
    const { provincia, municipio } = req.query;

    if (!provincia || !municipio) {
      return res.status(400).json({
        success: false,
        error: "provincia y municipio son obligatorios.",
      });
    }

    const existe = await MunicipioPractica.exists({
      provincia,
      municipio,
      activo: true,
    });

    res.json({ success: true, data: { cubierto: Boolean(existe) } });
  } catch (error) {
    next(error);
  }
}

module.exports = { listarTodos, agregar, actualizarEstado, consultarCobertura };
