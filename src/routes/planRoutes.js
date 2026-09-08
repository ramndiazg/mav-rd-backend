const express = require("express");
const router = express.Router();
const {
  listarPlanes,
  listarPlanesAdmin,
  obtenerPlan,
  actualizarPlan,
} = require("../controllers/planController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

// Nota de orden: "/admin/todos" tiene 2 segmentos y "/:codigo" solo matchea
// 1, así que no hay colisión de rutas sin importar el orden — pero la dejamos
// primero por claridad.
router.get(
  "/admin/todos",
  protegerRuta,
  permitirRoles("admin"),
  listarPlanesAdmin,
);
router.get("/", listarPlanes); // pública
router.get("/:codigo", obtenerPlan); // pública
router.patch("/:codigo", protegerRuta, permitirRoles("admin"), actualizarPlan);

module.exports = router;
