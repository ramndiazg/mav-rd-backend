const express = require("express");
const router = express.Router();
const {
  enviarContactoEmpresarial,
} = require("../controllers/empresasController");
const { limitadorContactoEmpresarial } = require("../middleware/rateLimiters");

// Público — sin protegerRuta, es un formulario de contacto abierto en /empresas
router.post(
  "/contacto",
  limitadorContactoEmpresarial,
  enviarContactoEmpresarial,
);

module.exports = router;
