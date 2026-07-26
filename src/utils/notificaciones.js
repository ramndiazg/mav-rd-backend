const DestinatarioNotificacion = require("../models/DestinatarioNotificacion");

// Usa fetch nativo de Node (disponible desde Node 18+) — sin agregar
// dependencias nuevas al proyecto.

async function enviarEmailResend({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM,
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(`Resend respondió ${res.status}: ${detalle}`);
  }
}

async function enviarMensajeTelegram({ chatId, texto }) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: texto }),
  });

  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(`Telegram respondió ${res.status}: ${detalle}`);
  }
}

// --- Plantilla visual compartida por todos los correos de la app ---
// Logo + colores de marca + pie de página consistentes, para que se vean
// profesionales en vez de texto plano. El logo se sirve desde el propio
// dominio de producción del frontend (public/logo-mav-rd.png).
function plantillaCorreo({ titulo, cuerpoHtml, botonTexto, botonUrl }) {
  const logoUrl = `${process.env.FRONTEND_URL}/logo-mav-rd.png`;

  return `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#F7F8FA; padding:32px 16px;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
      <div style="background:#1B3A6B;padding:24px;text-align:center;">
        <img src="${logoUrl}" alt="Muvo RD Vial" width="80" style="border-radius:50%;display:inline-block;" />
      </div>
      <div style="padding:32px 28px;">
        <h1 style="font-size:20px;color:#1B3A6B;margin:0 0 16px;font-family:Arial,sans-serif;">${titulo}</h1>
        <div style="font-size:14px;color:#1F2937;line-height:1.6;">${cuerpoHtml}</div>
        ${
          botonUrl
            ? `<div style="text-align:center;margin-top:28px;">
          <a href="${botonUrl}" style="background:#D6336C;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:bold;font-size:14px;display:inline-block;">${botonTexto}</a>
        </div>`
            : ""
        }
      </div>
      <div style="background:#F7F8FA;padding:16px;text-align:center;font-size:11px;color:#6B7280;">
        Muvo RD Vial — Embajadoras de la educación vial<br/>
        Un proyecto de la asociación sin fines de lucro Mujeres al Volante RD
      </div>
    </div>
  </div>`;
}

// --- Notificación interna: nueva estudiante subió un voucher ---
async function notificarNuevoVoucher({ nombreEstudiante, tipoPlan, monto }) {
  try {
    const destinatarios = await DestinatarioNotificacion.find({ activo: true });

    const asunto = `Nuevo comprobante por verificar — ${nombreEstudiante}`;
    const urlPanel = `${process.env.FRONTEND_URL}/panel/pagos`;
    const textoPlano = `${nombreEstudiante} envió un comprobante de pago (plan ${tipoPlan}, RD$${monto}). Revísalo aquí: ${urlPanel}`;
    const htmlEmail = plantillaCorreo({
      titulo: "Nuevo comprobante por verificar",
      cuerpoHtml: `<p>${nombreEstudiante} envió un comprobante de pago.</p><p><strong>Plan:</strong> ${tipoPlan}<br/><strong>Monto:</strong> RD$${monto}</p>`,
      botonTexto: "Revisar en el panel",
      botonUrl: urlPanel,
    });

    await Promise.all(
      destinatarios.map(async (d) => {
        try {
          if (d.tipo === "email") {
            await enviarEmailResend({
              to: d.valor,
              subject: asunto,
              html: htmlEmail,
            });
          } else if (d.tipo === "telegram") {
            await enviarMensajeTelegram({ chatId: d.valor, texto: textoPlano });
          }
        } catch (err) {
          console.error(
            `No se pudo notificar a ${d.tipo}:${d.valor} —`,
            err.message,
          );
        }
      }),
    );
  } catch (err) {
    console.error("Error general notificando nuevo voucher:", err.message);
  }
}

// --- Correo a la estudiante: verificar su cuenta ---
async function enviarCorreoVerificacion({ to, nombre, token }) {
  try {
    const urlVerificacion = `${process.env.FRONTEND_URL}/verificar-email?token=${token}`;
    await enviarEmailResend({
      to,
      subject: "Verifica tu correo — Muvo RD Vial",
      html: plantillaCorreo({
        titulo: `Hola, ${nombre}`,
        cuerpoHtml: `<p>Gracias por registrarte en Muvo RD Vial. Confirma tu correo para poder inscribirte en el curso.</p><p style="color:#6B7280;font-size:12px;">Este link expira en 24 horas.</p>`,
        botonTexto: "Verificar mi correo",
        botonUrl: urlVerificacion,
      }),
    });
  } catch (err) {
    console.error(
      `No se pudo enviar el correo de verificación a ${to} —`,
      err.message,
    );
  }
}

// --- Correo a la estudiante: su pago fue confirmado ---
async function enviarCorreoPagoConfirmado({ to, nombre, tipoPlan }) {
  try {
    const urlDashboard = `${process.env.FRONTEND_URL}/dashboard`;
    await enviarEmailResend({
      to,
      subject: "¡Tu pago fue confirmado! — Muvo RD Vial",
      html: plantillaCorreo({
        titulo: `¡Felicidades, ${nombre}!`,
        cuerpoHtml: `<p>Confirmamos tu pago del <strong>plan ${tipoPlan}</strong>. Ya tienes acceso a la Sesión 1 en tu Aula Virtual.</p>`,
        botonTexto: "Ir a mi panel",
        botonUrl: urlDashboard,
      }),
    });
  } catch (err) {
    console.error(
      `No se pudo enviar el correo de pago confirmado a ${to} —`,
      err.message,
    );
  }
}

// --- Correo a la estudiante: su voucher fue rechazado ---
async function enviarCorreoPagoRechazado({ to, nombre, motivo }) {
  try {
    const urlInscripcion = `${process.env.FRONTEND_URL}/inscripcion`;
    await enviarEmailResend({
      to,
      subject: "Necesitamos revisar tu comprobante — Muvo RD Vial",
      html: plantillaCorreo({
        titulo: `Hola, ${nombre}`,
        cuerpoHtml: `<p>Revisamos tu comprobante de pago y no pudimos confirmarlo por este motivo:</p><p style="background:#FBEAF0;border-radius:8px;padding:12px;color:#1B3A6B;"><strong>${motivo}</strong></p><p>Puedes corregirlo y volver a enviarlo cuando quieras.</p>`,
        botonTexto: "Reenviar comprobante",
        botonUrl: urlInscripcion,
      }),
    });
  } catch (err) {
    console.error(
      `No se pudo enviar el correo de pago rechazado a ${to} —`,
      err.message,
    );
  }
}

// --- Correo a la estudiante: su diploma ya está listo ---
async function enviarCorreoDiplomaListo({ to, nombre, codigoVerificacion }) {
  try {
    const urlDiploma = `${process.env.FRONTEND_URL}/diploma`;
    await enviarEmailResend({
      to,
      subject: "¡Tu diploma está listo! — Muvo RD Vial",
      html: plantillaCorreo({
        titulo: `¡Lo lograste, ${nombre}!`,
        cuerpoHtml: `<p>Completaste el curso de Muvo RD Vial y tu diploma ya está disponible.</p><p><strong>Código de verificación:</strong> ${codigoVerificacion}</p>`,
        botonTexto: "Ver mi diploma",
        botonUrl: urlDiploma,
      }),
    });
  } catch (err) {
    console.error(
      `No se pudo enviar el correo de diploma listo a ${to} —`,
      err.message,
    );
  }
}

// --- Correo a la estudiante: recuperar contraseña ---
async function enviarCorreoRecuperacion({ to, nombre, token }) {
  try {
    const urlRestablecer = `${process.env.FRONTEND_URL}/restablecer-password?token=${token}`;
    await enviarEmailResend({
      to,
      subject: "Recupera tu contraseña — Muvo RD Vial",
      html: plantillaCorreo({
        titulo: `Hola, ${nombre}`,
        cuerpoHtml: `<p>Recibimos una solicitud para restablecer tu contraseña. Si no fuiste tú, ignora este correo.</p><p style="color:#6B7280;font-size:12px;">Este link expira en 1 hora.</p>`,
        botonTexto: "Restablecer mi contraseña",
        botonUrl: urlRestablecer,
      }),
    });
  } catch (err) {
    console.error(
      `No se pudo enviar el correo de recuperación a ${to} —`,
      err.message,
    );
  }
}

// --- Notificación interna: falta generar el balance del mes anterior ---
async function notificarBalancePendiente({ mes, anio }) {
  try {
    const nombresMeses = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    const nombreMes = nombresMeses[mes - 1];

    const destinatarios = await DestinatarioNotificacion.find({ activo: true });
    const asunto = `Falta generar el balance de ${nombreMes} ${anio}`;
    const urlPanel = `${process.env.FRONTEND_URL}/admin/contabilidad`;
    const textoPlano = `Todavía no se ha generado el balance contable de ${nombreMes} ${anio}. Genéralo aquí: ${urlPanel}`;
    const htmlEmail = plantillaCorreo({
      titulo: "Balance mensual pendiente",
      cuerpoHtml: `<p>Todavía no se ha generado el balance contable de <strong>${nombreMes} ${anio}</strong>.</p>`,
      botonTexto: "Generar balance",
      botonUrl: urlPanel,
    });

    await Promise.all(
      destinatarios.map(async (d) => {
        try {
          if (d.tipo === "email") {
            await enviarEmailResend({
              to: d.valor,
              subject: asunto,
              html: htmlEmail,
            });
          } else if (d.tipo === "telegram") {
            await enviarMensajeTelegram({ chatId: d.valor, texto: textoPlano });
          }
        } catch (err) {
          console.error(
            `No se pudo notificar a ${d.tipo}:${d.valor} —`,
            err.message,
          );
        }
      }),
    );
  } catch (err) {
    console.error("Error notificando balance pendiente:", err.message);
  }
}

module.exports = {
  notificarNuevoVoucher,
  notificarBalancePendiente,
  enviarCorreoVerificacion,
  enviarCorreoPagoConfirmado,
  enviarCorreoPagoRechazado,
  enviarCorreoDiplomaListo,
  enviarCorreoRecuperacion,
};
