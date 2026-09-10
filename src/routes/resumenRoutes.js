const express = require("express");
const router = express.Router();
const {
  ejecutarResumenDiario,
  ejecutarReporteGrupos,
} = require("../controllers/resumenController");
const { limitadorInterno } = require("../middleware/rateLimiters");

// Sin protegerRuta a propósito — quien llama es el GitHub Action, no
// una persona con sesión iniciada. La verificación real está dentro
// del controller (header x-cron-secret contra process.env.CRON_SECRET).
// NUEVO (10/09/2026): limitadorInterno agregado tras la auditoría de
// seguridad — el secreto compartido no tenía ningún freno de intentos.
router.post("/resumen-diario", limitadorInterno, ejecutarResumenDiario);

// NUEVO (09/09/2026) — reporte diario por Grupo (Escolar/Empresarial),
// ver ESPECIFICACION_PROGRAMAS_NUEVOS.md sección 4. Mismo secreto
// compartido, cron distinto (10:00 AM RD).
router.post("/reporte-grupos", limitadorInterno, ejecutarReporteGrupos);

module.exports = router;
