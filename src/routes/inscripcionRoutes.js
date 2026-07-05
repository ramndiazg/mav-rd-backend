const express = require("express");
const router = express.Router();
const {
  crearInscripcion,
  confirmarPago,
  listarInscripciones,
  obtenerMiInscripcion,
} = require("../controllers/inscripcionController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

// Todas las rutas requieren estar logueada
router.use(protegerRuta);

// NUEVO: la estudiante ve su propia inscripción — debe ir ANTES de restringir
// el resto a coordinadora/admin, porque este endpoint es solo para estudiante.
router.get("/me", permitirRoles("estudiante"), obtenerMiInscripcion);

// El resto sigue siendo exclusivo de coordinadora/admin
router.post("/", permitirRoles("coordinadora", "admin"), crearInscripcion);
router.get("/", permitirRoles("coordinadora", "admin"), listarInscripciones);
router.patch(
  "/:id/confirmar-pago",
  permitirRoles("coordinadora", "admin"),
  confirmarPago,
);

module.exports = router;
