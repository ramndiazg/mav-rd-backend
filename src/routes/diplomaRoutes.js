const express = require("express");
const router = express.Router();
const {
  listarElegibles,
  generarDiploma,
  verificarDiploma,
  obtenerMiDiploma,
} = require("../controllers/diplomaController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

// Pública — cualquiera puede verificar un diploma con su código, sin login
router.get("/verificar/:codigo", verificarDiploma);

// NUEVO — la estudiante ve su propio diploma
router.get("/me", protegerRuta, permitirRoles("estudiante"), obtenerMiDiploma);

router.get(
  "/elegibles",
  protegerRuta,
  permitirRoles("coordinadora", "admin"),
  listarElegibles,
);
router.post(
  "/:userId/generar",
  protegerRuta,
  permitirRoles("coordinadora", "admin"),
  generarDiploma,
);

module.exports = router;
