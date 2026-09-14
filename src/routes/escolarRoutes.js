const express = require("express");
const router = express.Router();
const { enviarContactoEscolar } = require("../controllers/escolarController");
const { limitadorContactoEscolar } = require("../middleware/rateLimiters");

// Público — sin protegerRuta, es un formulario de contacto abierto en /escolar
router.post("/contacto", limitadorContactoEscolar, enviarContactoEscolar);

module.exports = router;
