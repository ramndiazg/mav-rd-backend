const { ejecutarYEnviarResumenDiario } = require("../utils/resumenDiario");

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

module.exports = { ejecutarResumenDiario };
