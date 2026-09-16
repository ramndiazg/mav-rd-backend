const MUNICIPIOS_RD = require("../data/municipiosRD");

// GET /api/ubicaciones/provincias-municipios — público, sin autenticación
// (dato estático, no sensible), sin rate limit especial. Fuente única para
// los <select> encadenados de provincia→municipio en /registro,
// /inscripcion y /admin/cobertura-practica (ver
// ANALISIS_COBERTURA_PRACTICA.md, punto 1).
async function listarProvinciasMunicipios(req, res) {
  res.json({ success: true, data: MUNICIPIOS_RD });
}

module.exports = { listarProvinciasMunicipios };
