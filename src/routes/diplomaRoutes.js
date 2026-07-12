const express = require("express");
const router = express.Router();
const {
  listarElegibles,
  generarDiploma,
  verificarDiploma,
  obtenerMiDiploma,
  descargarMiDiploma,
  descargarDiplomaPorId,
} = require("../controllers/diplomaController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

// Pública — cualquiera puede verificar un diploma con su código, sin login
router.get("/verificar/:codigo", verificarDiploma);

// La estudiante ve y descarga su propio diploma
router.get("/me", protegerRuta, permitirRoles("estudiante"), obtenerMiDiploma);

// NUEVO — descarga firmada. Estas dos rutas NO usan protegerRuta porque
// aceptan el token también por ?token= (un <a href> no puede mandar
// headers) — la verificación se hace manualmente dentro del controller.
router.get("/me/descargar", descargarMiDiploma);
router.get("/:id/descargar", descargarDiplomaPorId);

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
