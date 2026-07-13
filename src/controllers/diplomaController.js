const jwt = require("jsonwebtoken");
const Diploma = require("../models/Diploma");
const User = require("../models/User");
const Sesion = require("../models/Sesion");
const ProgresoEstudiante = require("../models/ProgresoEstudiante");
const { generarDiplomaPDF } = require("../utils/pdfGenerator");
const { generarCodigoVerificacion } = require("../utils/verificationCode");
const {
  subirBuffer,
  generarUrlDescargaFirmada,
} = require("../utils/cloudinaryUpload");

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

    const sesiones = await Sesion.find({
      numero: { $in: progreso.sesionesAprobadas },
    })
      .select("numero titulo")
      .lean();

    const codigoVerificacion = await generarCodigoVerificacion();
    const fechaEmision = new Date();

    const pdfBuffer = await generarDiplomaPDF({
      nombreCompleto: `${estudiante.nombre} ${estudiante.apellido}`,
      cedula: estudiante.cedula,
      fechaEmision,
      codigoVerificacion,
      sesiones,
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
      publicIdCloudinary: resultadoSubida.public_id,
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

// GET /api/diplomas/me — la estudiante ve su propio diploma
async function obtenerMiDiploma(req, res, next) {
  try {
    const diploma = await Diploma.findOne({ userId: req.usuario._id });

    if (!diploma) {
      return res.status(404).json({
        success: false,
        error: "Todavía no tienes un diploma generado.",
      });
    }

    res.json({ success: true, data: diploma });
  } catch (error) {
    next(error);
  }
}

// Deriva el public_id (sin extensión) a partir de la URL pública guardada,
// para los diplomas generados ANTES de guardar publicIdCloudinary.
function derivarPublicIdDeUrl(urlPDF) {
  const match = urlPDF.match(/\/upload\/v\d+\/(.+?)(\.[a-zA-Z0-9]+)?$/);
  return match ? match[1] : null;
}

// Verifica el token manualmente, aceptando tanto el header Authorization
// como ?token= por query string — esto último es necesario porque un link
// <a href> de descarga no puede mandar headers personalizados.
async function obtenerUsuarioDesdeToken(req) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ")
    ? header.slice(7)
    : req.query.token;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(payload.id);
  } catch {
    return null;
  }
}

async function enviarDescargaFirmada(diploma, res) {
  const publicId =
    diploma.publicIdCloudinary || derivarPublicIdDeUrl(diploma.urlPDF);
  if (!publicId) {
    return res.status(500).json({
      success: false,
      error:
        "No se pudo determinar el archivo en Cloudinary para este diploma.",
    });
  }

  const urlFirmada = generarUrlDescargaFirmada(publicId);

  // En vez de redirigir al navegador (lo que dejaba el archivo sin
  // extensión reconocible), el backend trae el PDF y lo sirve directo con
  // las cabeceras correctas — así el navegador SIEMPRE lo reconoce como PDF.
  const respuestaCloudinary = await fetch(urlFirmada);
  if (!respuestaCloudinary.ok) {
    return res.status(502).json({
      success: false,
      error: "No se pudo obtener el PDF desde Cloudinary.",
    });
  }

  const buffer = Buffer.from(await respuestaCloudinary.arrayBuffer());
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${diploma.codigoVerificacion}.pdf"`,
  });
  res.send(buffer);
}

// GET /api/diplomas/me/descargar — la estudiante descarga el suyo
async function descargarMiDiploma(req, res, next) {
  try {
    const usuario = await obtenerUsuarioDesdeToken(req);
    if (!usuario || usuario.rol !== "estudiante") {
      return res.status(401).json({ success: false, error: "No autorizado." });
    }

    const diploma = await Diploma.findOne({ userId: usuario._id });
    if (!diploma) {
      return res
        .status(404)
        .json({ success: false, error: "Diploma no encontrado." });
    }

    await enviarDescargaFirmada(diploma, res);
  } catch (error) {
    next(error);
  }
}

// GET /api/diplomas/:id/descargar — coordinadora/admin
async function descargarDiplomaPorId(req, res, next) {
  try {
    const usuario = await obtenerUsuarioDesdeToken(req);
    if (!usuario || !["coordinadora", "admin"].includes(usuario.rol)) {
      return res.status(401).json({ success: false, error: "No autorizado." });
    }

    const diploma = await Diploma.findById(req.params.id);
    if (!diploma) {
      return res
        .status(404)
        .json({ success: false, error: "Diploma no encontrado." });
    }

    await enviarDescargaFirmada(diploma, res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarElegibles,
  generarDiploma,
  verificarDiploma,
  obtenerMiDiploma,
  descargarMiDiploma,
  descargarDiplomaPorId,
};
