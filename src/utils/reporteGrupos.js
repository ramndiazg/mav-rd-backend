const Grupo = require("../models/Grupo");
const User = require("../models/User");
const ProgresoEstudiante = require("../models/ProgresoEstudiante");
const Diploma = require("../models/Diploma");

// Reutilizamos el mismo mecanismo de envío que el resto del sistema, pero
// como notificaciones.js no exporta sus funciones internas
// (enviarEmailResend es privada a ese archivo), se re-declara aquí de
// forma mínima — mismo patrón ya usado en resumenDiario.js, ver su propio
// comentario para el porqué.
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

// Progreso de cada estudiante del grupo — sesiones aprobadas (de 4),
// curso completado, diploma generado. Ver ESPECIFICACION_PROGRAMAS_NUEVOS.md
// sección 4: "sesiones completadas, exámenes aprobados/pendientes,
// diplomas generados" por estudiante, no solo un total agregado, porque el
// contacto de la institución quiere saber quién específicamente va
// atrasada.
async function calcularProgresoGrupo(grupo) {
  const estudiantes = await User.find({ grupoId: grupo._id })
    .select("nombre apellido")
    .sort({ nombre: 1 });
  const userIds = estudiantes.map((e) => e._id);

  const [progresos, diplomas] = await Promise.all([
    ProgresoEstudiante.find({ userId: { $in: userIds } }),
    Diploma.find({ userId: { $in: userIds } }).select("userId"),
  ]);

  const progresoPorId = new Map(progresos.map((p) => [String(p.userId), p]));
  const idsConDiploma = new Set(diplomas.map((d) => String(d.userId)));

  const filas = estudiantes.map((e) => {
    const progreso = progresoPorId.get(String(e._id));
    return {
      nombre: `${e.nombre} ${e.apellido}`,
      sesionesAprobadas: progreso?.sesionesAprobadas?.length || 0,
      cursoCompletado: progreso?.cursoCompletado || false,
      tieneDiploma: idsConDiploma.has(String(e._id)),
    };
  });

  // Reporte final: TODOS los estudiantes del grupo tienen cursoCompletado
  // true — no diploma generado, que puede ser un paso administrativo
  // posterior (ver especificación, sección 1). Un grupo sin ningún
  // estudiante (roster vacío, no debería pasar pero es defensivo) nunca
  // se marca como terminado, para no apagar un grupo mal cargado por error.
  const todosCompletaron =
    filas.length > 0 && filas.every((f) => f.cursoCompletado);

  return { filas, todosCompletaron };
}

function armarHtml({ grupo, filas, esFinal }) {
  const fila = (f) => {
    const estado = f.tieneDiploma
      ? "Diploma listo"
      : f.cursoCompletado
        ? "Teoría completa"
        : `${f.sesionesAprobadas}/4 sesiones`;
    return `<tr>
      <td style="padding:6px 0;color:#1F2937;border-bottom:1px solid #F0F0F0;">${f.nombre}</td>
      <td style="padding:6px 0;text-align:right;font-weight:bold;color:#1B3A6B;border-bottom:1px solid #F0F0F0;">${estado}</td>
    </tr>`;
  };

  return `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#F7F8FA; padding:32px 16px;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
      <div style="background:#1B3A6B;padding:24px;text-align:center;">
        <h1 style="color:#fff;font-size:18px;margin:0;">${grupo.nombreInstitucion}</h1>
        <p style="color:#ffffffcc;font-size:12px;margin:4px 0 0;">Reporte de avance — Muvo RD Vial</p>
      </div>
      <div style="padding:24px 28px;">
        ${
          esFinal
            ? `<p style="background:#E9F7EF;color:#1B3A6B;border-radius:8px;padding:12px;font-size:14px;margin:0 0 16px;"><strong>¡Todo el grupo completó la teoría del curso!</strong> Este es el último reporte automático — si necesitan seguimiento adicional (ej. diplomas), contáctenos directamente.</p>`
            : ""
        }
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${filas.map(fila).join("")}
        </table>
      </div>
    </div>
  </div>`;
}

// Envía el reporte de UN grupo. No lanza — igual que el resto de las
// funciones de envío del proyecto, un fallo de Resend para un grupo no
// debe tumbar el cron para los demás.
async function enviarReporteDeGrupo(grupo, { filas, esFinal }) {
  try {
    const asunto = esFinal
      ? `Reporte final — ${grupo.nombreInstitucion} completó el curso`
      : `Reporte de avance — ${grupo.nombreInstitucion}`;
    await enviarEmailResendDirecto({
      to: grupo.contactoEmail,
      subject: asunto,
      html: armarHtml({ grupo, filas, esFinal }),
    });
    return true;
  } catch (err) {
    console.error(
      `No se pudo enviar el reporte de grupo a ${grupo.contactoEmail} (${grupo.nombreInstitucion}) —`,
      err.message,
    );
    return false;
  }
}

// Punto de entrada del cron (ver controllers/resumenController.js). Todos
// los Grupo con activo: true y fechaInicio de hace más de 24 horas —
// fan-out, un correo por grupo, no uno para todos. Si TODOS los
// estudiantes de un grupo completaron la teoría, ese envío se marca como
// reporte final y Grupo.activo pasa a false en la misma pasada, para que
// no vuelva a entrar mañana. Ver ESPECIFICACION_PROGRAMAS_NUEVOS.md
// sección 4.
async function ejecutarYEnviarReportesGrupo() {
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const grupos = await Grupo.find({
    activo: true,
    fechaInicio: { $ne: null, $lte: hace24h },
  });

  const resultados = [];

  for (const grupo of grupos) {
    const { filas, todosCompletaron } = await calcularProgresoGrupo(grupo);

    const enviado = await enviarReporteDeGrupo(grupo, {
      filas,
      esFinal: todosCompletaron,
    });

    if (todosCompletaron) {
      grupo.activo = false;
      await grupo.save();
    }

    resultados.push({
      grupoId: grupo._id,
      nombreInstitucion: grupo.nombreInstitucion,
      cantidadEstudiantes: filas.length,
      enviado,
      reporteFinal: todosCompletaron,
    });
  }

  return resultados;
}

module.exports = { ejecutarYEnviarReportesGrupo };
