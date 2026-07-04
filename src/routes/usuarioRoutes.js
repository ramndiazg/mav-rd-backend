const express = require("express");
const router = express.Router();
const {
  listarUsuarios,
  crearCoordinadora,
  cambiarEstado,
  cambiarRol,
} = require("../controllers/usuarioController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

// Búsqueda: coordinadora la necesita para encontrar estudiantes (inscripciones, diplomas)
router.get(
  "/",
  protegerRuta,
  permitirRoles("coordinadora", "admin"),
  listarUsuarios,
);

// Gestión de cuentas: exclusiva de admin
router.post(
  "/coordinadora",
  protegerRuta,
  permitirRoles("admin"),
  crearCoordinadora,
);
router.patch(
  "/:id/estado",
  protegerRuta,
  permitirRoles("admin"),
  cambiarEstado,
);
router.patch("/:id/rol", protegerRuta, permitirRoles("admin"), cambiarRol);

module.exports = router;
