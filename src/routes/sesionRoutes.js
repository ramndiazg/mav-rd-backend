const express = require("express");
const router = express.Router();
const {
  listarSesiones,
  obtenerSesionParaEstudiante,
  actualizarSesion,
} = require("../controllers/sesionController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

router.get(
  "/",
  protegerRuta,
  permitirRoles("coordinadora", "admin"),
  listarSesiones,
);
router.get(
  "/:numero",
  protegerRuta,
  permitirRoles("estudiante"),
  obtenerSesionParaEstudiante,
);
router.patch(
  "/:numero",
  protegerRuta,
  permitirRoles("admin"),
  actualizarSesion,
);

module.exports = router;
