const express = require("express");
const router = express.Router();
const {
  crearInscripcion,
  confirmarPago,
  rechazarPago,
  listarInscripciones,
  obtenerMiInscripcion,
  crearOReenviarInscripcionPropia,
} = require("../controllers/inscripcionController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

// Todas las rutas requieren estar logueada
router.use(protegerRuta);

// La estudiante ve su propia inscripción — debe ir ANTES de restringir
// el resto a coordinadora/admin, porque este endpoint es solo para estudiante.
router.get("/me", permitirRoles("estudiante"), obtenerMiInscripcion);

// NUEVO: la estudiante se auto-inscribe subiendo su propio comprobante
// (depósito/transferencia). También sirve para reenviar tras un rechazo.
router.post(
  "/mia",
  permitirRoles("estudiante"),
  crearOReenviarInscripcionPropia,
);

// El resto sigue siendo exclusivo de coordinadora/admin
router.post("/", permitirRoles("coordinadora", "admin"), crearInscripcion);
router.get("/", permitirRoles("coordinadora", "admin"), listarInscripciones);
router.patch(
  "/:id/confirmar-pago",
  permitirRoles("coordinadora", "admin"),
  confirmarPago,
);
// NUEVO: rechazar un voucher pendiente de verificación (con motivo)
router.patch(
  "/:id/rechazar-pago",
  permitirRoles("coordinadora", "admin"),
  rechazarPago,
);

module.exports = router;
