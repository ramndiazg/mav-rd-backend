const express = require("express");
const router = express.Router();
const {
  listarUsuarios,
  crearCoordinadora,
  crearConductor,
  cambiarEstado,
  desactivarLote,
  cambiarRol,
} = require("../controllers/usuarioController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

router.get(
  "/",
  protegerRuta,
  permitirRoles("coordinadora", "admin"),
  listarUsuarios,
);

router.post(
  "/coordinadora",
  protegerRuta,
  permitirRoles("admin"),
  crearCoordinadora,
);

// NUEVO (05/09/2026)
router.post("/conductor", protegerRuta, permitirRoles("admin"), crearConductor);

router.patch(
  "/:id/estado",
  protegerRuta,
  permitirRoles("admin"),
  cambiarEstado,
);

// NUEVO (10/09/2026): soft delete en lote, ver usuarioController.js.
// Mismo permiso que el toggle individual (solo admin).
router.patch(
  "/desactivar-lote",
  protegerRuta,
  permitirRoles("admin"),
  desactivarLote,
);

router.patch("/:id/rol", protegerRuta, permitirRoles("admin"), cambiarRol);

module.exports = router;
