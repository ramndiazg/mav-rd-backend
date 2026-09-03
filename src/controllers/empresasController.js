const { enviarSolicitudEmpresarial } = require("../utils/notificaciones");
const SolicitudEmpresarial = require("../models/SolicitudEmpresarial");

// POST /api/empresas/contacto — público, sin login (formulario de la
// página de Empresas).
//
// ACTUALIZADO (28/08/2026): ahora sí se guarda en Mongo (antes no se
// persistía nada, ver HISTORIAL_MODIFICACIONES.md). Se guarda primero
// — así queda un registro real incluso si el correo de notificación
// falla — y luego se dispara la notificación como ya funcionaba antes.
async function enviarContactoEmpresarial(req, res, next) {
  try {
    const {
      nombreEmpresa,
      contacto,
      cargo,
      telefono,
      email,
      cantidadEstudiantes,
      mensaje,
    } = req.body;

    if (!nombreEmpresa || !contacto || !telefono || !email) {
      return res.status(400).json({
        success: false,
        error:
          "Nombre de la empresa, contacto, teléfono y correo son obligatorios.",
      });
    }

    await SolicitudEmpresarial.create({
      nombreEmpresa,
      contacto,
      cargo,
      telefono,
      email,
      cantidadEstudiantes,
      mensaje,
    });

    // enviarSolicitudEmpresarial nunca lanza error hacia afuera (loguea
    // internamente si Resend/Telegram fallan), así que no hace falta
    // envolver esto en su propio try/catch adicional.
    await enviarSolicitudEmpresarial({
      nombreEmpresa,
      contacto,
      cargo,
      telefono,
      email,
      cantidadEstudiantes,
      mensaje,
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

module.exports = { enviarContactoEmpresarial };
