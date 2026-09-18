const express = require("express");
const router = express.Router();
const {
  crearReporte,
  listarMisReportes,
  obtenerMiReporte,
  listarReportes,
  obtenerReporte,
  agregarRespuesta,
  actualizarEstado,
  obtenerConfiguracionNotificaciones,
  actualizarConfiguracionNotificaciones,
} = require("../controllers/reporteController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

router.use(protegerRuta);

// Estudiante — crear y ver sus propios reportes
router.post("/", permitirRoles("estudiante"), crearReporte);
router.get("/mios", permitirRoles("estudiante"), listarMisReportes);
router.get("/mios/:id", permitirRoles("estudiante"), obtenerMiReporte);

// Coordinadora/admin — mismo nivel de acceso que test-psicológico y
// cuestionario-escolar: la coordinadora da seguimiento día a día, no es
// exclusivo de admin. Rutas literales antes de "/:id" para que Express
// no las capture como parámetro.
router.get(
  "/configuracion-notificaciones",
  permitirRoles("admin"),
  obtenerConfiguracionNotificaciones,
);
router.patch(
  "/configuracion-notificaciones",
  permitirRoles("admin"),
  actualizarConfiguracionNotificaciones,
);
router.get("/", permitirRoles("coordinadora", "admin"), listarReportes);
router.get("/:id", permitirRoles("coordinadora", "admin"), obtenerReporte);
router.patch(
  "/:id/estado",
  permitirRoles("coordinadora", "admin"),
  actualizarEstado,
);

// Respuestas — abierta a estudiante y a staff; el controller valida el
// permiso exacto (propio vs. cualquiera) según de quién es el reporte.
router.post("/:id/respuestas", agregarRespuesta);

module.exports = router;
