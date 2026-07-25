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

// Se llama cuando una estudiante sube un voucher nuevo (o lo reenvía tras un
// rechazo). NUNCA debe tumbar el flujo principal de inscripción — cada
// destinatario se intenta por separado, y cualquier error solo se registra
// en consola, no se propaga hacia quien llamó a esta función.
async function notificarNuevoVoucher({ nombreEstudiante, tipoPlan, monto }) {
  try {
    const destinatarios = await DestinatarioNotificacion.find({ activo: true });

    const asunto = `Nuevo comprobante por verificar — ${nombreEstudiante}`;
    const urlPanel = `${process.env.FRONTEND_URL}/panel/pagos`;
    const textoPlano = `${nombreEstudiante} envió un comprobante de pago (plan ${tipoPlan}, RD$${monto}). Revísalo aquí: ${urlPanel}`;
    const htmlEmail = `<p>${nombreEstudiante} envió un comprobante de pago (plan <strong>${tipoPlan}</strong>, RD$${monto}).</p><p><a href="${urlPanel}">Revisarlo en el panel</a></p>`;

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

module.exports = { notificarNuevoVoucher };
