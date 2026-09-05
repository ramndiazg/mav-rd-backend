const express = require("express");
const router = express.Router();
const {
  enviarMiRespuesta,
  obtenerMiEstado,
  listarRespuestas,
  obtenerRespuestaPorUsuario,
} = require("../controllers/testPsicologicoController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

router.use(protegerRuta);

// Estudiante — su propio cuestionario
router.post("/mi-respuesta", permitirRoles("estudiante"), enviarMiRespuesta);
router.get("/mi-respuesta", permitirRoles("estudiante"), obtenerMiEstado);

// Coordinadora/admin — revisión (mismo nivel de acceso que Estudiantes,
// no exclusivo de admin, ya que la coordinadora es quien da seguimiento
// día a día)
router.get("/", permitirRoles("coordinadora", "admin"), listarRespuestas);
router.get(
  "/:userId",
  permitirRoles("coordinadora", "admin"),
  obtenerRespuestaPorUsuario,
);

module.exports = router;
