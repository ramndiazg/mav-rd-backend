const express = require("express");
const router = express.Router();
const {
  obtenerIntentoActivo,
  obtenerHistorial,
  obtenerIntentosDeEstudiante,
  reintentarExamen,
  iniciarIntento,
  entregarIntento,
  obtenerDetalleIntento,
} = require("../controllers/intentoExamenController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

router.use(protegerRuta);

// Estudiante — sobre sus propios intentos
router.get(
  "/activo/:sesionId",
  permitirRoles("estudiante"),
  obtenerIntentoActivo,
);
router.get(
  "/historial/:sesionId",
  permitirRoles("estudiante"),
  obtenerHistorial,
);
router.post(
  "/reintentar/:sesionId",
  permitirRoles("estudiante"),
  reintentarExamen,
);
router.post("/:id/iniciar", permitirRoles("estudiante"), iniciarIntento);
router.post("/:id/entregar", permitirRoles("estudiante"), entregarIntento);

// Coordinadora/admin — historial de cualquier estudiante (panel "Estudiantes")
router.get(
  "/estudiante/:userId",
  permitirRoles("coordinadora", "admin"),
  obtenerIntentosDeEstudiante,
);

router.get("/:id/detalle", permitirRoles("estudiante"), obtenerDetalleIntento);

module.exports = router;
