const express = require("express");
const router = express.Router();
const {
  ejecutarResumenDiario,
  ejecutarReporteGrupos,
} = require("../controllers/resumenController");

// Sin protegerRuta a propósito — quien llama es el GitHub Action, no
// una persona con sesión iniciada. La verificación real está dentro
// del controller (header x-cron-secret contra process.env.CRON_SECRET).
router.post("/resumen-diario", ejecutarResumenDiario);

// NUEVO (09/09/2026) — reporte diario por Grupo (Escolar/Empresarial),
// ver ESPECIFICACION_PROGRAMAS_NUEVOS.md sección 4. Mismo secreto
// compartido, cron distinto (10:00 AM RD).
router.post("/reporte-grupos", ejecutarReporteGrupos);

module.exports = router;
