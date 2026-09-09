const express = require("express");
const router = express.Router();
const {
  crearGrupo,
  listarGrupos,
  obtenerGrupo,
  confirmarRoster,
  actualizarGrupo,
} = require("../controllers/grupoController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

// Todo este módulo es exclusivo de coordinadora/admin — las instituciones
// nunca entran a la app (ver ESPECIFICACION_PROGRAMAS_NUEVOS.md sección 1).
router.use(protegerRuta, permitirRoles("coordinadora", "admin"));

router.post("/", crearGrupo);
router.get("/", listarGrupos);
router.get("/:id", obtenerGrupo);
router.patch("/:id", actualizarGrupo);
router.post("/:id/roster", confirmarRoster);

module.exports = router;
