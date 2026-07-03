const express = require("express");
const router = express.Router();
const {
  crearExamen,
  listarExamenesPorSesion,
  desbloquearExamen,
} = require("../controllers/examenController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

router.use(protegerRuta, permitirRoles("coordinadora", "admin"));

router.post("/", crearExamen);
router.get("/sesion/:sesionId", listarExamenesPorSesion);
router.post("/:examenId/desbloquear", desbloquearExamen);

module.exports = router;
