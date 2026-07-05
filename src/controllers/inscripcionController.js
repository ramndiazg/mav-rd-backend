const Inscripcion = require("../models/Inscripcion");
const ProgresoEstudiante = require("../models/ProgresoEstudiante");
const MovimientoContable = require("../models/MovimientoContable");

// POST /api/inscripciones — coordinadora/admin crea la inscripción de una estudiante
async function crearInscripcion(req, res, next) {
  try {
    const { userId, tipoPlan, monto } = req.body;

    if (!userId || !tipoPlan || monto === undefined) {
      return res.status(400).json({
        success: false,
        error: "userId, tipoPlan y monto son obligatorios.",
      });
    }

    if (!["normal", "vip"].includes(tipoPlan)) {
      return res
        .status(400)
        .json({ success: false, error: 'tipoPlan debe ser "normal" o "vip".' });
    }

    // Evitar inscripciones duplicadas activas para la misma estudiante
    const existente = await Inscripcion.findOne({
      userId,
      estadoPago: "pendiente",
    });
    if (existente) {
      return res.status(409).json({
        success: false,
        error: "Esta estudiante ya tiene una inscripción pendiente de pago.",
      });
    }

    const inscripcion = await Inscripcion.create({ userId, tipoPlan, monto });

    res.status(201).json({ success: true, data: inscripcion });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/inscripciones/:id/confirmar-pago — coordinadora/admin confirma pago en efectivo
async function confirmarPago(req, res, next) {
  try {
    const { id } = req.params;

    const inscripcion = await Inscripcion.findById(id);
    if (!inscripcion) {
      return res
        .status(404)
        .json({ success: false, error: "Inscripción no encontrada." });
    }

    if (inscripcion.estadoPago === "pagado") {
      return res.status(409).json({
        success: false,
        error: "Esta inscripción ya estaba confirmada como pagada.",
      });
    }

    inscripcion.estadoPago = "pagado";
    inscripcion.fechaPago = new Date();
    inscripcion.confirmadoPor = req.usuario._id;
    await inscripcion.save();

    // Al confirmar el pago, se habilita el progreso de la estudiante en el Aula Virtual.
    // CORRECCIÓN: antes esto se creaba con sesionActualDesbloqueada en su default (0),
    // lo que dejaba a la estudiante sin poder ver ni la teoría de la Sesión 1
    // (GET /api/sesiones/:numero exige numero <= sesionActualDesbloqueada).
    // $setOnInsert asegura que esto SOLO pase la primera vez (si ya existe un
    // progreso previo — por ejemplo, una recompra — no se pisa su avance real).
    await ProgresoEstudiante.findOneAndUpdate(
      { userId: inscripcion.userId },
      {
        $setOnInsert: {
          userId: inscripcion.userId,
          sesionActualDesbloqueada: 1,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // El pago confirmado se registra automáticamente como entrada contable
    await MovimientoContable.create({
      tipo: "entrada",
      categoria: "inscripcion",
      monto: inscripcion.monto,
      descripcion: `Pago de inscripción (plan ${inscripcion.tipoPlan})`,
      fecha: inscripcion.fechaPago,
      inscripcionRelacionadaId: inscripcion._id,
      registradoPor: req.usuario._id,
    });

    res.json({ success: true, data: inscripcion });
  } catch (error) {
    next(error);
  }
}

// GET /api/inscripciones — coordinadora/admin lista inscripciones (filtrable por estado)
async function listarInscripciones(req, res, next) {
  try {
    const { estadoPago } = req.query;
    const filtro = {};
    if (estadoPago) filtro.estadoPago = estadoPago;

    const inscripciones = await Inscripcion.find(filtro)
      .populate("userId", "nombre apellido cedula email telefono")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: inscripciones });
  } catch (error) {
    next(error);
  }
}

// GET /api/inscripciones/me — NUEVO: la estudiante ve su propio estado de pago
async function obtenerMiInscripcion(req, res, next) {
  try {
    const inscripcion = await Inscripcion.findOne({
      userId: req.usuario._id,
    }).sort({ createdAt: -1 });

    // null es una respuesta válida: significa "todavía no te has inscrito"
    res.json({ success: true, data: inscripcion });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  crearInscripcion,
  confirmarPago,
  listarInscripciones,
  obtenerMiInscripcion,
};
