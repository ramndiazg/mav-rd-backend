const ProgresoEstudiante = require("../models/ProgresoEstudiante");
const User = require("../models/User");
const Inscripcion = require("../models/Inscripcion");

// GET /api/practica/pendientes — conductor/admin: estudiantes que
// terminaron la teoría (4 sesiones + 4 exámenes) y todavía esperan que un
// chofer confirme su práctica.
async function listarPendientes(req, res, next) {
  try {
    const progresos = await ProgresoEstudiante.find({
      cursoCompletado: true,
      practicaAprobada: false,
    }).sort({ updatedAt: 1 });

    const userIds = progresos.map((p) => p.userId);

    const [usuarios, inscripciones] = await Promise.all([
      User.find({ _id: { $in: userIds } }).select(
        "nombre apellido cedula telefono email",
      ),
      Inscripcion.find({
        userId: { $in: userIds },
        estadoPago: "pagado",
      }).select("userId tipoPlan"),
    ]);

    const usuariosPorId = new Map(usuarios.map((u) => [String(u._id), u]));
    const planPorUsuario = new Map(
      inscripciones.map((i) => [String(i.userId), i.tipoPlan]),
    );

    const data = progresos.map((p) => {
      const usuario = usuariosPorId.get(String(p.userId));
      const fechaCompletado = p.fechasAprobacionSesion.find(
        (f) => f.sesion === 4,
      )?.fecha;

      return {
        userId: p.userId,
        nombre: usuario?.nombre,
        apellido: usuario?.apellido,
        cedula: usuario?.cedula,
        telefono: usuario?.telefono,
        email: usuario?.email,
        tipoPlan: planPorUsuario.get(String(p.userId)) || null,
        fechaCompletado: fechaCompletado || null,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// POST /api/practica/:userId/aprobar — conductor/admin confirma la práctica
async function aprobarPractica(req, res, next) {
  try {
    const { userId } = req.params;

    const progreso = await ProgresoEstudiante.findOne({ userId });
    if (!progreso) {
      return res.status(404).json({
        success: false,
        error: "No hay progreso registrado para esta estudiante.",
      });
    }

    if (!progreso.cursoCompletado) {
      return res.status(400).json({
        success: false,
        error: "Esta estudiante todavía no ha completado la teoría.",
      });
    }

    if (progreso.practicaAprobada) {
      return res.status(409).json({
        success: false,
        error: "La práctica de esta estudiante ya estaba aprobada.",
      });
    }

    progreso.practicaAprobada = true;
    progreso.fechaAprobacionPractica = new Date();
    progreso.practicaAprobadaPor = req.usuario._id;
    await progreso.save();

    res.json({ success: true, data: progreso });
  } catch (error) {
    next(error);
  }
}

module.exports = { listarPendientes, aprobarPractica };
