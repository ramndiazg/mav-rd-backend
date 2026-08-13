const express = require("express");
const router = express.Router();
const {
  enviarContactoEmpresarial,
} = require("../controllers/empresasController");

// Público — sin protegerRuta, es un formulario de contacto abierto en /empresas
router.post("/contacto", enviarContactoEmpresarial);

module.exports = router;
