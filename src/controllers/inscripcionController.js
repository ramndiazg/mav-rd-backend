const Inscripcion = require("../models/Inscripcion");
const ProgresoEstudiante = require("../models/ProgresoEstudiante");
const MovimientoContable = require("../models/MovimientoContable");
const Configuracion = require("../models/Configuracion");
const User = require("../models/User");
const {
  notificarNuevoVoucher,
  enviarCorreoPagoConfirmado,
  enviarCorreoPagoRechazado,
} = require("../utils/notificaciones");

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
    inscripcion.notaRechazo = null;
    await inscripcion.save();

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

    await MovimientoContable.create({
      tipo: "entrada",
      categoria: "inscripcion",
      monto: inscripcion.monto,
      descripcion: `Pago de inscripción (plan ${inscripcion.tipoPlan})`,
      fecha: inscripcion.fechaPago,
      inscripcionRelacionadaId: inscripcion._id,
      registradoPor: req.usuario._id,
    });

    // Sin await a propósito: no debe demorar la respuesta a la coordinadora.
    User.findById(inscripcion.userId).then((estudiante) => {
      if (estudiante) {
        enviarCorreoPagoConfirmado({
          to: estudiante.email,
          nombre: estudiante.nombre,
          tipoPlan: inscripcion.tipoPlan,
        });
      }
    });

    res.json({ success: true, data: inscripcion });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/inscripciones/:id/rechazar-pago — coordinadora/admin rechaza un voucher
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

    // Sin await a propósito: no debe demorar la respuesta a la coordinadora.
    User.findById(inscripcion.userId).then((estudiante) => {
      if (estudiante) {
        enviarCorreoPagoRechazado({
          to: estudiante.email,
          nombre: estudiante.nombre,
          motivo: inscripcion.notaRechazo,
        });
      }
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

// GET /api/inscripciones/me — la estudiante ve su propia inscripción
async function obtenerMiInscripcion(req, res, next) {
  try {
    const inscripcion = await Inscripcion.findOne({
      userId: req.usuario._id,
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: inscripcion });
  } catch (error) {
    next(error);
  }
}

// POST /api/inscripciones/mia — la estudiante se auto-inscribe subiendo su
// propio comprobante de depósito/transferencia.
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

    if (!req.usuario.emailVerificado) {
      return res.status(403).json({
        success: false,
        error:
          "Verifica tu correo antes de inscribirte. Revisa tu bandeja de entrada o pide reenviar el correo desde tu panel.",
      });
    }

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
      Object.assign(actual, datosInscripcion);
      inscripcion = await actual.save();
    } else {
      inscripcion = await Inscripcion.create(datosInscripcion);
    }

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
