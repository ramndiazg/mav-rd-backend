const express = require("express");
const router = express.Router();
const { ejecutarResumenDiario } = require("../controllers/resumenController");

// Sin protegerRuta a propósito — quien llama es el GitHub Action, no
// una persona con sesión iniciada. La verificación real está dentro
// del controller (header x-cron-secret contra process.env.CRON_SECRET).
router.post("/resumen-diario", ejecutarResumenDiario);

module.exports = router;
