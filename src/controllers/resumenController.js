const { ejecutarYEnviarResumenDiario } = require("../utils/resumenDiario");
const { ejecutarYEnviarReportesGrupo } = require("../utils/reporteGrupos");

// POST /api/interno/resumen-diario — llamado por el GitHub Action
// programado (cron), no por una persona logueada. Por eso vive FUERA
// de protegerRuta (no hay usuario/JWT de por medio) y en vez de eso se
// verifica un secreto compartido — mismo espíritu que la verificación
// manual de token en GET /contenido-sesion/:id/archivo, pero aquí el
// "token" es un secreto fijo guardado en Render y en GitHub Actions
// Secrets, no algo específico de un usuario.
async function ejecutarResumenDiario(req, res, next) {
  try {
    const secretoRecibido = req.headers["x-cron-secret"];
    if (
      !process.env.CRON_SECRET ||
      secretoRecibido !== process.env.CRON_SECRET
    ) {
      return res.status(401).json({ success: false, error: "No autorizado." });
    }

    const resumen = await ejecutarYEnviarResumenDiario();
    res.json({ success: true, resumen });
  } catch (error) {
    next(error);
  }
}

// POST /api/interno/reporte-grupos — NUEVO (09/09/2026, paso 5 de
// ESPECIFICACION_PROGRAMAS_NUEVOS.md). Mismo mecanismo que
// ejecutarResumenDiario (GitHub Action programado + secreto compartido),
// pero dispara el reporte diario por Grupo (Escolar/Empresarial) en vez
// del resumen general de la app — son dos crons separados, con su propio
// horario (10:00 AM RD, no 9:00 PM) y su propio workflow de GitHub.
async function ejecutarReporteGrupos(req, res, next) {
  try {
    const secretoRecibido = req.headers["x-cron-secret"];
    if (
      !process.env.CRON_SECRET ||
      secretoRecibido !== process.env.CRON_SECRET
    ) {
      return res.status(401).json({ success: false, error: "No autorizado." });
    }

    const resultados = await ejecutarYEnviarReportesGrupo();
    res.json({ success: true, resultados });
  } catch (error) {
    next(error);
  }
}

module.exports = { ejecutarResumenDiario, ejecutarReporteGrupos };
