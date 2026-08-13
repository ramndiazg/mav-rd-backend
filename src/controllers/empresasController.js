const { enviarSolicitudEmpresarial } = require("../utils/notificaciones");

// POST /api/empresas/contacto — público, sin login (formulario de la
// página de Empresas). No se guarda en base de datos: esta primera
// versión solo envía la notificación por correo/Telegram al mismo canal
// que ya usa la fundadora para avisos internos.
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
