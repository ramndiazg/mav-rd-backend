const { enviarSolicitudEscolar } = require("../utils/notificaciones");
const SolicitudEscolar = require("../models/SolicitudEscolar");

// POST /api/escolar/contacto — público, sin login (formulario de la
// página de Escolar). Mismo patrón que empresasController.js — se
// guarda primero en Mongo (queda registro real aunque falle el correo)
// y luego se dispara la notificación.
async function enviarContactoEscolar(req, res, next) {
  try {
    const {
      nombreColegio,
      contacto,
      cargo,
      telefono,
      email,
      cantidadEstudiantes,
      mensaje,
      // Honeypot — mismo patrón que empresasController.js/authController.js.
      sitioWeb,
    } = req.body;

    if (sitioWeb) {
      console.warn(
        `Contacto escolar bloqueado por honeypot — IP ${req.ip}, email: ${email || "(vacío)"}`,
      );
      return res.json({ success: true });
    }

    if (!nombreColegio || !contacto || !telefono || !email) {
      return res.status(400).json({
        success: false,
        error:
          "Nombre del colegio, contacto, teléfono y correo son obligatorios.",
      });
    }

    await SolicitudEscolar.create({
      nombreColegio,
      contacto,
      cargo,
      telefono,
      email,
      cantidadEstudiantes,
      mensaje,
    });

    // enviarSolicitudEscolar nunca lanza error hacia afuera (loguea
    // internamente si Resend/Telegram fallan).
    await enviarSolicitudEscolar({
      nombreColegio,
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

module.exports = { enviarContactoEscolar };
