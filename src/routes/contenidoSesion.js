const express = require("express");
const router = express.Router();
const {
  listarActivosPorSesion,
  listarTodosPorSesion,
  crearContenido,
  editarContenido,
  eliminarContenido,
  marcarVisto,
  obtenerArchivo,
} = require("../controllers/contenidoSesionController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

// NUEVO: fuera de protegerRuta a propósito — el link <a href> de descarga
// no puede mandar headers personalizados, así que este endpoint verifica
// el token manualmente (header o ?token=), mismo patrón que ya existía
// para /diplomas/me/descargar y /diplomas/:id/descargar.
router.get("/:id/archivo", obtenerArchivo);

router.use(protegerRuta);

router.get(
  "/sesion/:sesionId",
  permitirRoles("estudiante", "coordinadora", "admin"),
  listarActivosPorSesion,
);
router.post("/:id/marcar-visto", permitirRoles("estudiante"), marcarVisto);

router.get(
  "/admin/sesion/:sesionId",
  permitirRoles("coordinadora", "admin"),
  listarTodosPorSesion,
);
router.post("/", permitirRoles("coordinadora", "admin"), crearContenido);
router.patch("/:id", permitirRoles("coordinadora", "admin"), editarContenido);
router.delete("/:id", permitirRoles("admin"), eliminarContenido);

module.exports = router;
