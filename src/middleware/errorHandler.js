function errorHandler(err, req, res, next) {
  console.error(err.stack);

  // Error de clave duplicada de Mongo (cédula o email ya existen)
  if (err.code === 11000) {
    const campo = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      error: `Ya existe una cuenta registrada con ese ${campo}.`,
    });
  }

  // Error de validación de Mongoose
  if (err.name === "ValidationError") {
    const mensajes = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, error: mensajes.join(", ") });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || "Error interno del servidor",
  });
}

module.exports = errorHandler;
