const express = require("express");
const router = express.Router();
const {
  listarPlanes,
  obtenerPlan,
  actualizarPlan,
} = require("../controllers/planController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

router.get("/", listarPlanes); // pública
router.get("/:codigo", obtenerPlan); // pública
router.patch("/:codigo", protegerRuta, permitirRoles("admin"), actualizarPlan);

module.exports = router;
