const express = require("express");
const router = express.Router();
const {
  crearInscripcion,
  confirmarPago,
  listarInscripciones,
} = require("../controllers/inscripcionController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

// Todas las rutas de inscripciones requieren estar logueada como coordinadora o admin
router.use(protegerRuta, permitirRoles("coordinadora", "admin"));

router.post("/", crearInscripcion);
router.get("/", listarInscripciones);
router.patch("/:id/confirmar-pago", confirmarPago);

module.exports = router;
