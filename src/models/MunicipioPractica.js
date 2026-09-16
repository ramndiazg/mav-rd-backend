const mongoose = require("mongoose");

// Whitelist de municipios con cobertura de práctica de manejo presencial
// (programa "estandar"). Solo contiene las filas que en algún momento
// tuvieron cobertura — no se siembra con los ~158-160 municipios del país
// en `false`; se agrega una fila nueva cuando de verdad se habilita un
// municipio (ver ANALISIS_COBERTURA_PRACTICA.md, "Diseño de datos",
// punto 3).
const municipioPracticaSchema = new mongoose.Schema(
  {
    provincia: { type: String, required: true },
    municipio: { type: String, required: true },
    // Permite desactivar sin borrar — mismo patrón que Plan.activo /
    // User.activo. Desactivar una fila no recalcula nada para quien ya se
    // inscribió (decisión cerrada, ver el análisis).
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Único por combinación provincia+municipio — evita duplicar la misma
// cobertura dos veces por error desde /admin/cobertura-practica.
municipioPracticaSchema.index({ provincia: 1, municipio: 1 }, { unique: true });

module.exports = mongoose.model("MunicipioPractica", municipioPracticaSchema);
