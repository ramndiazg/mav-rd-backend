const DestinatarioNotificacion = require("../models/DestinatarioNotificacion");
const DestinatarioPractica = require("../models/DestinatarioPractica");
const Instructor = require("../models/Instructor");

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

async function enviarSolicitudEmpresarial({
  nombreEmpresa,
  contacto,
  cargo,
  telefono,
  email,
  cantidadEstudiantes,
  mensaje,
}) {
  try {
    const destinatarios = await DestinatarioNotificacion.find({ activo: true });

    const asunto = `Nueva solicitud empresarial — ${nombreEmpresa}`;
    const textoPlano = `${nombreEmpresa} solicitó información sobre el programa empresarial. Contacto: ${contacto}${
      cargo ? ` (${cargo})` : ""
    }, tel: ${telefono}, correo: ${email}${
      cantidadEstudiantes ? `, ~${cantidadEstudiantes} estudiantes` : ""
    }.${mensaje ? ` Mensaje: ${mensaje}` : ""}`;
    const htmlEmail = plantillaCorreo({
      titulo: "Nueva solicitud del programa empresarial",
      cuerpoHtml: `
        <p><strong>Empresa:</strong> ${nombreEmpresa}</p>
        <p><strong>Contacto:</strong> ${contacto}${cargo ? ` — ${cargo}` : ""}</p>
        <p><strong>Teléfono:</strong> ${telefono}</p>
        <p><strong>Correo:</strong> ${email}</p>
        ${
          cantidadEstudiantes
            ? `<p><strong>Cantidad estimada de estudiantes:</strong> ${cantidadEstudiantes}</p>`
            : ""
        }
        ${mensaje ? `<p><strong>Mensaje:</strong><br/>${mensaje}</p>` : ""}
      `,
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
    console.error("Error notificando solicitud empresarial:", err.message);
  }
}

// --- NUEVO (05/09/2026): estudiante lista para práctica ---
// Va a DOS listas distintas y separadas:
// 1) Cada Instructor activo, directo a su correo (via User.email) — son
//    quienes de verdad tienen que actuar.
// 2) DestinatarioPractica (activo) — visibilidad para fundadora/coordinadora,
//    sin mezclarse con DestinatarioNotificacion (esa es para vouchers/
//    balance/empresas).
async function notificarEstudianteListaParaPractica({
  nombre,
  apellido,
  cedula,
  telefono,
  email,
  tipoPlan,
}) {
  try {
    const [instructoresActivos, destinatariosPractica] = await Promise.all([
      Instructor.find({ activo: true }).populate("userId", "nombre email"),
      DestinatarioPractica.find({ activo: true }),
    ]);

    const asunto = `Estudiante lista para práctica — ${nombre} ${apellido}`;
    const textoPlano = `${nombre} ${apellido} (cédula ${cedula}, tel ${telefono}, correo ${email}, plan ${tipoPlan}) terminó toda la teoría y está lista para la práctica de manejo. Contáctala para coordinar.`;
    const htmlEmail = plantillaCorreo({
      titulo: "Estudiante lista para práctica",
      cuerpoHtml: `
        <p><strong>${nombre} ${apellido}</strong> terminó toda la teoría (las 4 sesiones y sus exámenes) y está lista para la práctica de manejo.</p>
        <p><strong>Cédula:</strong> ${cedula}<br/>
        <strong>Teléfono:</strong> ${telefono}<br/>
        <strong>Correo:</strong> ${email}<br/>
        <strong>Plan:</strong> ${tipoPlan}</p>
        <p>Contáctala para coordinar día y hora de práctica.</p>
      `,
    });

    const correosInstructores = instructoresActivos
      .map((i) => i.userId?.email)
      .filter(Boolean);

    await Promise.all([
      ...correosInstructores.map(async (correo) => {
        try {
          await enviarEmailResend({
            to: correo,
            subject: asunto,
            html: htmlEmail,
          });
        } catch (err) {
          console.error(
            `No se pudo notificar al instructor ${correo} —`,
            err.message,
          );
        }
      }),
      ...destinatariosPractica.map(async (d) => {
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
    ]);
  } catch (err) {
    console.error(
      "Error notificando estudiante lista para práctica:",
      err.message,
    );
  }
}

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
  enviarSolicitudEmpresarial,
  notificarEstudianteListaParaPractica,
  enviarCorreoVerificacion,
  enviarCorreoPagoConfirmado,
  enviarCorreoPagoRechazado,
  enviarCorreoDiplomaListo,
  enviarCorreoRecuperacion,
};
