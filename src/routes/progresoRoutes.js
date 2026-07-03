const express = require("express");
const router = express.Router();
const {
  obtenerMiProgreso,
  obtenerProgresoPorUsuario,
} = require("../controllers/progresoController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

router.get("/me", protegerRuta, permitirRoles("estudiante"), obtenerMiProgreso);
router.get(
  "/:userId",
  protegerRuta,
  permitirRoles("coordinadora", "admin"),
  obtenerProgresoPorUsuario,
);

module.exports = router;
