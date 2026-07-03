const Diploma = require("../models/Diploma");
const User = require("../models/User");
const ProgresoEstudiante = require("../models/ProgresoEstudiante");
const { generarDiplomaPDF } = require("../utils/pdfGenerator");
const { generarCodigoVerificacion } = require("../utils/verificationCode");
const { subirBuffer } = require("../utils/cloudinaryUpload");

// GET /api/diplomas/elegibles — coordinadora/admin: estudiantes que completaron
// el curso y todavía no tienen diploma generado
async function listarElegibles(req, res, next) {
  try {
    const progresosCompletados = await ProgresoEstudiante.find({
      cursoCompletado: true,
    });
    const userIds = progresosCompletados.map((p) => p.userId);

    const diplomasExistentes = await Diploma.find({
      userId: { $in: userIds },
    }).select("userId");
    const idsConDiploma = new Set(
      diplomasExistentes.map((d) => String(d.userId)),
    );

    const idsElegibles = userIds.filter((id) => !idsConDiploma.has(String(id)));
    const estudiantes = await User.find({ _id: { $in: idsElegibles } }).select(
      "nombre apellido cedula email",
    );

    res.json({ success: true, data: estudiantes });
  } catch (error) {
    next(error);
  }
}

// POST /api/diplomas/:userId/generar — coordinadora/admin genera el diploma
async function generarDiploma(req, res, next) {
  try {
    const { userId } = req.params;

    const yaExiste = await Diploma.findOne({ userId });
    if (yaExiste) {
      return res.status(409).json({
        success: false,
        error: "Esta estudiante ya tiene un diploma generado.",
      });
    }

    const progreso = await ProgresoEstudiante.findOne({ userId });
    if (!progreso || !progreso.cursoCompletado) {
      return res.status(400).json({
        success: false,
        error:
          "Esta estudiante todavía no ha completado y aprobado las 3 sesiones.",
      });
    }

    const estudiante = await User.findById(userId);
    if (!estudiante) {
      return res
        .status(404)
        .json({ success: false, error: "Estudiante no encontrada." });
    }

    const codigoVerificacion = await generarCodigoVerificacion();
    const fechaEmision = new Date();

    const pdfBuffer = await generarDiplomaPDF({
      nombreCompleto: `${estudiante.nombre} ${estudiante.apellido}`,
      cedula: estudiante.cedula,
      fechaEmision,
      codigoVerificacion,
    });

    const resultadoSubida = await subirBuffer(pdfBuffer, {
      folder: "mav-rd/diplomas",
      resourceType: "raw",
      filename: `diploma-${codigoVerificacion}`,
    });

    const diploma = await Diploma.create({
      userId,
      codigoVerificacion,
      fechaEmision,
      generadoPor: req.usuario._id,
      urlPDF: resultadoSubida.secure_url,
    });

    res.status(201).json({ success: true, data: diploma });
  } catch (error) {
    next(error);
  }
}

// GET /api/diplomas/verificar/:codigo — público, sin login
async function verificarDiploma(req, res, next) {
  try {
    const { codigo } = req.params;

    const diploma = await Diploma.findOne({
      codigoVerificacion: codigo,
    }).populate("userId", "nombre apellido cedula");

    if (!diploma) {
      return res.status(404).json({
        success: false,
        error: "Código de verificación no encontrado.",
      });
    }

    res.json({
      success: true,
      data: {
        valido: true,
        nombreCompleto: `${diploma.userId.nombre} ${diploma.userId.apellido}`,
        cedula: diploma.userId.cedula,
        fechaEmision: diploma.fechaEmision,
        codigoVerificacion: diploma.codigoVerificacion,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { listarElegibles, generarDiploma, verificarDiploma };
