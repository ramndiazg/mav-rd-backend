const express = require("express");
const router = express.Router();
const {
  listarProvinciasMunicipios,
} = require("../controllers/ubicacionesController");

router.get("/provincias-municipios", listarProvinciasMunicipios); // pública

module.exports = router;
