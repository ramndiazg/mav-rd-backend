const Diploma = require("../models/Diploma");

// Genera un código tipo MAV-2026-000123 (año + secuencia con ceros a la izquierda)
async function generarCodigoVerificacion() {
  const anio = new Date().getFullYear();
  const cantidadExistente = await Diploma.countDocuments({
    codigoVerificacion: { $regex: `^MAV-${anio}-` },
  });
  const siguiente = String(cantidadExistente + 1).padStart(6, "0");
  return `MAV-${anio}-${siguiente}`;
}

module.exports = { generarCodigoVerificacion };
