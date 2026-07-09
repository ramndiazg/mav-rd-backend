const express = require("express");
const router = express.Router();
const {
  listarActivosPorSesion,
  listarTodosPorSesion,
  crearContenido,
  editarContenido,
  eliminarContenido,
  marcarVisto,
} = require("../controllers/contenidoSesionController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

router.use(protegerRuta);

// Estudiante: ver materiales de una sesión, y marcar cada uno como visto
router.get(
  "/sesion/:sesionId",
  permitirRoles("estudiante", "coordinadora", "admin"),
  listarActivosPorSesion,
);
router.post("/:id/marcar-visto", permitirRoles("estudiante"), marcarVisto);

// Coordinadora/admin: gestión completa del banco de contenido
router.get(
  "/admin/sesion/:sesionId",
  permitirRoles("coordinadora", "admin"),
  listarTodosPorSesion,
);
router.post("/", permitirRoles("coordinadora", "admin"), crearContenido);
router.patch("/:id", permitirRoles("coordinadora", "admin"), editarContenido);
router.delete("/:id", permitirRoles("admin"), eliminarContenido);

module.exports = router;
