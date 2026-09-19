const express = require("express");
const router = express.Router();
const {
  crearGrupo,
  listarGrupos,
  obtenerGrupo,
  obtenerEstudianteDeGrupo,
  obtenerIntentoDeEstudiante,
  reenviarCredenciales,
  enviarReporteAhora,
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
// NUEVO (18/09/2026): ficha de una estudiante del grupo, detalle de un
// examen entregado y reenvío de credenciales.
router.get("/:id/estudiantes/:userId", obtenerEstudianteDeGrupo);
router.get(
  "/:id/estudiantes/:userId/intentos/:intentoId",
  obtenerIntentoDeEstudiante,
);
router.post(
  "/:id/estudiantes/:userId/reenviar-credenciales",
  reenviarCredenciales,
);
// NUEVO (19/09/2026): enviar el reporte de avance a la institución ahora.
router.post("/:id/enviar-reporte", enviarReporteAhora);
router.patch("/:id", actualizarGrupo);
router.post("/:id/roster", confirmarRoster);

module.exports = router;
