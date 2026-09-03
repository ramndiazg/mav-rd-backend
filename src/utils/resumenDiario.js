const User = require("../models/User");
const Inscripcion = require("../models/Inscripcion");
const Diploma = require("../models/Diploma");
const IntentoExamen = require("../models/IntentoExamen");
const SolicitudEmpresarial = require("../models/SolicitudEmpresarial");
const DestinatarioNotificacion = require("../models/DestinatarioNotificacion");

// Reutilizamos el mismo mecanismo de envío que ya usa el resto del
// sistema (vouchers, balance pendiente, solicitudes de Empresas), pero
// como notificaciones.js no exporta sus funciones internas
// (enviarEmailResend/enviarMensajeTelegram son privadas a ese archivo),
// se re-declaran aquí de forma mínima en vez de modificar su contrato
// público. Si en el futuro se refactoriza notificaciones.js para
// exportarlas, esto se puede simplificar a un solo require.
async function enviarEmailResendDirecto({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: process.env.RESEND_FROM, to, subject, html }),
  });
  if (!res.ok) {
    throw new Error(`Resend respondió ${res.status}: ${await res.text()}`);
  }
}

async function enviarMensajeTelegramDirecto({ chatId, texto }) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: texto }),
  });
  if (!res.ok) {
    throw new Error(`Telegram respondió ${res.status}: ${await res.text()}`);
  }
}

function inicioYFinDeHoy() {
  const ahora = new Date();
  const inicio = new Date(
    Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()),
  );
  const fin = new Date(inicio.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { inicio, fin };
}

async function calcularResumenDelDia() {
  const { inicio, fin } = inicioYFinDeHoy();
  const filtroHoy = { createdAt: { $gte: inicio, $lte: fin } };

  const [
    nuevasInscripciones,
    pagosConfirmados,
    pagosRechazados,
    vouchersPendientesTotal,
    nuevosEstudiantes,
    diplomasGenerados,
    solicitudesEmpresas,
    intentosHoy,
  ] = await Promise.all([
    Inscripcion.countDocuments(filtroHoy),
    Inscripcion.countDocuments({ ...filtroHoy, estadoPago: "pagado" }),
    Inscripcion.countDocuments({ ...filtroHoy, estadoPago: "rechazado" }),
    Inscripcion.countDocuments({ estadoPago: "pendiente_verificacion" }), // total acumulado, no solo hoy
    User.countDocuments({ ...filtroHoy, rol: "estudiante" }),
    Diploma.countDocuments({ createdAt: { $gte: inicio, $lte: fin } }),
    SolicitudEmpresarial.countDocuments(filtroHoy),
    IntentoExamen.find({
      fechaFin: { $ne: null, $gte: inicio, $lte: fin },
    }).lean(),
  ]);

  const aprobados = intentosHoy.filter((i) => i.aprobado === true).length;
  const reprobados = intentosHoy.filter((i) => i.aprobado === false).length;

  return {
    fecha: inicio.toISOString().slice(0, 10),
    nuevasInscripciones,
    pagosConfirmados,
    pagosRechazados,
    vouchersPendientesTotal,
    nuevosEstudiantes,
    diplomasGenerados,
    solicitudesEmpresas,
    examenesAprobados: aprobados,
    examenesReprobados: reprobados,
  };
}

function armarTextoPlano(r) {
  return `📊 Resumen del ${r.fecha} — Muvo RD Vial

Nuevos registros: ${r.nuevosEstudiantes}
Inscripciones nuevas: ${r.nuevasInscripciones}
Pagos confirmados: ${r.pagosConfirmados}
Pagos rechazados: ${r.pagosRechazados}
Vouchers pendientes de verificar (acumulado): ${r.vouchersPendientesTotal}
Diplomas generados: ${r.diplomasGenerados}
Solicitudes de Empresas: ${r.solicitudesEmpresas}
Exámenes — aprobados: ${r.examenesAprobados} / reprobados: ${r.examenesReprobados}`;
}

function armarHtml(r) {
  const fila = (label, valor) =>
    `<tr><td style="padding:6px 0;color:#1F2937;">${label}</td><td style="padding:6px 0;text-align:right;font-weight:bold;color:#1B3A6B;">${valor}</td></tr>`;

  return `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#F7F8FA; padding:32px 16px;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
      <div style="background:#1B3A6B;padding:24px;text-align:center;">
        <h1 style="color:#fff;font-size:18px;margin:0;">Resumen del día — ${r.fecha}</h1>
      </div>
      <div style="padding:24px 28px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${fila("Nuevos registros", r.nuevosEstudiantes)}
          ${fila("Inscripciones nuevas", r.nuevasInscripciones)}
          ${fila("Pagos confirmados", r.pagosConfirmados)}
          ${fila("Pagos rechazados", r.pagosRechazados)}
          ${fila("Vouchers pendientes (acumulado)", r.vouchersPendientesTotal)}
          ${fila("Diplomas generados", r.diplomasGenerados)}
          ${fila("Solicitudes de Empresas", r.solicitudesEmpresas)}
          ${fila("Exámenes aprobados", r.examenesAprobados)}
          ${fila("Exámenes reprobados", r.examenesReprobados)}
        </table>
      </div>
    </div>
  </div>`;
}

// Ejecuta el cálculo y envía el resumen a todos los destinatarios
// activos — mismo mecanismo que vouchers/balance/empresas.
async function ejecutarYEnviarResumenDiario() {
  const resumen = await calcularResumenDelDia();
  const destinatarios = await DestinatarioNotificacion.find({ activo: true });

  const asunto = `Resumen del día ${resumen.fecha} — Muvo RD Vial`;
  const textoPlano = armarTextoPlano(resumen);
  const html = armarHtml(resumen);

  await Promise.all(
    destinatarios.map(async (d) => {
      try {
        if (d.tipo === "email") {
          await enviarEmailResendDirecto({
            to: d.valor,
            subject: asunto,
            html,
          });
        } else if (d.tipo === "telegram") {
          await enviarMensajeTelegramDirecto({
            chatId: d.valor,
            texto: textoPlano,
          });
        }
      } catch (err) {
        console.error(
          `No se pudo enviar el resumen diario a ${d.tipo}:${d.valor} —`,
          err.message,
        );
      }
    }),
  );

  return resumen;
}

module.exports = { calcularResumenDelDia, ejecutarYEnviarResumenDiario };
