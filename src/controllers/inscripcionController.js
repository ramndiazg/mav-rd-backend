const Inscripcion = require("../models/Inscripcion");
const ProgresoEstudiante = require("../models/ProgresoEstudiante");
const MovimientoContable = require("../models/MovimientoContable");
const Configuracion = require("../models/Configuracion");
const { notificarNuevoVoucher } = require("../utils/notificaciones");

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

// PATCH /api/inscripciones/:id/confirmar-pago — coordinadora/admin confirma pago
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
    inscripcion.notaRechazo = null; // por si venía de un rechazo previo
    await inscripcion.save();

    // Al confirmar el pago, se habilita el progreso de la estudiante en el Aula Virtual.
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

// PATCH /api/inscripciones/:id/rechazar-pago — NUEVO: coordinadora/admin rechaza un
// voucher (ej. monto no coincide, referencia inválida, comprobante ilegible).
async function rechazarPago(req, res, next) {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo || !motivo.trim()) {
      return res.status(400).json({
        success: false,
        error: "El motivo del rechazo es obligatorio.",
      });
    }

    const inscripcion = await Inscripcion.findById(id);
    if (!inscripcion) {
      return res
        .status(404)
        .json({ success: false, error: "Inscripción no encontrada." });
    }

    if (inscripcion.estadoPago === "pagado") {
      return res.status(409).json({
        success: false,
        error: "No se puede rechazar una inscripción ya pagada.",
      });
    }

    inscripcion.estadoPago = "rechazado";
    inscripcion.notaRechazo = motivo.trim();
    await inscripcion.save();

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

// GET /api/inscripciones/me — la estudiante ve su propio estado de pago
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

// POST /api/inscripciones/mia — NUEVO: la estudiante se auto-inscribe subiendo su
// propio comprobante de depósito/transferencia. El monto SIEMPRE se calcula en el
// backend desde Configuracion — nunca se confía en un monto que mande el cliente.
async function crearOReenviarInscripcionPropia(req, res, next) {
  try {
    const userId = req.usuario._id;
    const {
      tipoPlan,
      bancoEmisor,
      numeroReferencia,
      fechaDeposito,
      comprobanteUrl,
    } = req.body;

    if (
      !tipoPlan ||
      !bancoEmisor ||
      !numeroReferencia ||
      !fechaDeposito ||
      !comprobanteUrl
    ) {
      return res.status(400).json({
        success: false,
        error:
          "tipoPlan, bancoEmisor, numeroReferencia, fechaDeposito y comprobanteUrl son obligatorios.",
      });
    }

    if (!["normal", "vip"].includes(tipoPlan)) {
      return res
        .status(400)
        .json({ success: false, error: 'tipoPlan debe ser "normal" o "vip".' });
    }

    // Buscamos si ya tiene alguna inscripción (la más reciente)
    const actual = await Inscripcion.findOne({ userId }).sort({
      createdAt: -1,
    });

    if (
      actual &&
      ["pendiente_verificacion", "pagado", "pendiente"].includes(
        actual.estadoPago,
      )
    ) {
      return res.status(409).json({
        success: false,
        error: "Ya tienes una inscripción activa o en revisión.",
      });
    }

    // Precio real desde Configuracion — nunca desde el body
    const clave = tipoPlan === "vip" ? "precio_plan_vip" : "precio_plan_normal";
    const config = await Configuracion.findOne({ clave });
    if (!config) {
      return res.status(500).json({
        success: false,
        error:
          "El precio del plan no está configurado todavía. Contacta a la administración.",
      });
    }
    const monto = config.valor;

    const datosInscripcion = {
      userId,
      tipoPlan,
      monto,
      estadoPago: "pendiente_verificacion",
      metodoPago: "transferencia",
      bancoEmisor,
      numeroReferencia,
      fechaDeposito,
      comprobanteUrl,
      notaRechazo: null,
    };

    let inscripcion;
    if (actual && actual.estadoPago === "rechazado") {
      // Reenvío: actualizamos la misma inscripción en vez de crear una duplicada
      Object.assign(actual, datosInscripcion);
      inscripcion = await actual.save();
    } else {
      inscripcion = await Inscripcion.create(datosInscripcion);
    }

    // Sin await a propósito: la notificación no debe demorar ni poner en
    // riesgo la respuesta a la estudiante. Si Resend/Telegram fallan, se
    // registra en consola dentro de notificarNuevoVoucher — nunca aquí.
    notificarNuevoVoucher({
      nombreEstudiante: `${req.usuario.nombre} ${req.usuario.apellido}`,
      tipoPlan,
      monto,
    });

    res.status(201).json({ success: true, data: inscripcion });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.numeroReferencia) {
      return res.status(409).json({
        success: false,
        error: "Este número de referencia ya fue usado en otra inscripción.",
      });
    }
    next(error);
  }
}

module.exports = {
  crearInscripcion,
  confirmarPago,
  rechazarPago,
  listarInscripciones,
  obtenerMiInscripcion,
  crearOReenviarInscripcionPropia,
};
