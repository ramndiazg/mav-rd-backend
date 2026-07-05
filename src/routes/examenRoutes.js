const express = require("express");
const router = express.Router();
const {
  crearExamen,
  listarExamenesPorSesion,
  editarExamen,
  eliminarExamen,
  desbloquearExamen,
} = require("../controllers/examenController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

router.use(protegerRuta, permitirRoles("coordinadora", "admin"));

router.post("/", crearExamen);
router.get("/sesion/:sesionId", listarExamenesPorSesion);
router.patch("/:id", editarExamen);
router.delete("/:id", permitirRoles("admin"), eliminarExamen);

// CAMBIO: antes era "/:examenId/desbloquear" — ahora recibe sesionId, el
// backend elige la versión al azar (ver examenController.desbloquearExamen)
router.post("/:sesionId/desbloquear", desbloquearExamen);

module.exports = router;
