const jwt = require("jsonwebtoken");
const ContenidoSesion = require("../models/ContenidoSesion");
const Sesion = require("../models/Sesion");
const ProgresoEstudiante = require("../models/ProgresoEstudiante");
const User = require("../models/User");
const { intentarDesbloquear } = require("./examenController");
const { generarUrlDescargaFirmada } = require("../utils/cloudinaryUpload");

// GET /api/contenido-sesion/sesion/:sesionId — cualquier autenticada, solo activos
async function listarActivosPorSesion(req, res, next) {
  try {
    const { sesionId } = req.params;
    const contenidos = await ContenidoSesion.find({
      sesionId,
      activo: true,
    }).sort({
      orden: 1,
    });
    res.json({ success: true, data: contenidos });
  } catch (error) {
    next(error);
  }
}

// GET /api/contenido-sesion/admin/sesion/:sesionId — coordinadora/admin, todos
async function listarTodosPorSesion(req, res, next) {
  try {
    const { sesionId } = req.params;
    const contenidos = await ContenidoSesion.find({ sesionId }).sort({
      orden: 1,
    });
    res.json({ success: true, data: contenidos });
  } catch (error) {
    next(error);
  }
}

// POST /api/contenido-sesion — coordinadora/admin
async function crearContenido(req, res, next) {
  try {
    const {
      sesionId,
      titulo,
      tipo,
      url,
      publicIdCloudinary,
      contenidoTexto,
      imagenUrl,
      orden,
    } = req.body;

    if (!sesionId || !titulo || !tipo) {
      return res.status(400).json({
        success: false,
        error: "sesionId, titulo y tipo son obligatorios.",
      });
    }

    const sesion = await Sesion.findById(sesionId);
    if (!sesion) {
      return res
        .status(404)
        .json({ success: false, error: "Sesión no encontrada." });
    }

    const contenido = await ContenidoSesion.create({
      sesionId,
      titulo,
      tipo,
      url,
      publicIdCloudinary,
      contenidoTexto,
      imagenUrl,
      orden: orden ?? 0,
    });

    res.status(201).json({ success: true, data: contenido });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/contenido-sesion/:id — coordinadora/admin
async function editarContenido(req, res, next) {
  try {
    const { id } = req.params;
    const {
      titulo,
      tipo,
      url,
      publicIdCloudinary,
      contenidoTexto,
      imagenUrl,
      orden,
      activo,
    } = req.body;

    const contenido = await ContenidoSesion.findById(id);
    if (!contenido) {
      return res
        .status(404)
        .json({ success: false, error: "Contenido no encontrado." });
    }

    if (titulo !== undefined) contenido.titulo = titulo;
    if (tipo !== undefined) contenido.tipo = tipo;
    if (url !== undefined) contenido.url = url;
    if (publicIdCloudinary !== undefined)
      contenido.publicIdCloudinary = publicIdCloudinary;
    if (contenidoTexto !== undefined) contenido.contenidoTexto = contenidoTexto;
    if (imagenUrl !== undefined) contenido.imagenUrl = imagenUrl;
    if (orden !== undefined) contenido.orden = orden;
    if (activo !== undefined) contenido.activo = activo;

    await contenido.save();
    res.json({ success: true, data: contenido });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/contenido-sesion/:id — admin, borrado lógico
async function eliminarContenido(req, res, next) {
  try {
    const { id } = req.params;
    const contenido = await ContenidoSesion.findById(id);
    if (!contenido) {
      return res
        .status(404)
        .json({ success: false, error: "Contenido no encontrado." });
    }
    contenido.activo = false;
    await contenido.save();
    res.json({ success: true, data: contenido });
  } catch (error) {
    next(error);
  }
}

// POST /api/contenido-sesion/:id/marcar-visto — estudiante
async function marcarVisto(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.usuario._id;

    const contenido = await ContenidoSesion.findById(id);
    if (!contenido) {
      return res
        .status(404)
        .json({ success: false, error: "Contenido no encontrado." });
    }

    const progreso = await ProgresoEstudiante.findOne({ userId });
    if (!progreso) {
      return res.status(404).json({
        success: false,
        error: "No tienes un pago confirmado todavía.",
      });
    }

    const yaEstaba = progreso.contenidosVistos.some(
      (cid) => String(cid) === String(contenido._id),
    );
    if (!yaEstaba) {
      progreso.contenidosVistos.push(contenido._id);
      await progreso.save();
    }

    const contenidosDeLaSesion = await ContenidoSesion.find({
      sesionId: contenido.sesionId,
      activo: true,
    });
    const idsVistos = new Set(
      progreso.contenidosVistos.map((cid) => String(cid)),
    );
    const completó = contenidosDeLaSesion.every((c) =>
      idsVistos.has(String(c._id)),
    );

    let examenDesbloqueado = false;
    let esperaActiva = false;
    let disponibleEn = null;

    if (completó) {
      const resultado = await intentarDesbloquear({
        sesionId: contenido.sesionId,
        userId,
        desbloqueadoPor: userId,
      });

      if (resultado.ok) {
        examenDesbloqueado = true;
      } else if (resultado.esperaActiva) {
        esperaActiva = true;
        disponibleEn = resultado.disponibleEn;
      }
    }

    res.json({
      success: true,
      data: {
        contenidoId: contenido._id,
        examenDesbloqueado,
        esperaActiva,
        disponibleEn,
      },
    });
  } catch (error) {
    next(error);
  }
}

// Verifica el token manualmente (mismo patrón que diplomaController.js),
// porque un link <a href> de descarga no puede mandar headers
// personalizados — acepta tanto Authorization como ?token=.
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

// GET /api/contenido-sesion/:id/archivo — entrega el PDF con una URL
// firmada generada al momento (Cloudinary bloquea la entrega pública de
// recursos 'raw' sin firmar, igual que pasaba con los diplomas).
// Coordinadora/admin: acceso libre. Estudiante: solo si la sesión de este
// material ya está desbloqueada para ella.
async function obtenerArchivo(req, res, next) {
  try {
    const usuario = await obtenerUsuarioDesdeToken(req);
    if (!usuario) {
      return res.status(401).json({ success: false, error: "No autorizado." });
    }

    const contenido = await ContenidoSesion.findById(req.params.id);
    if (!contenido || !contenido.activo) {
      return res
        .status(404)
        .json({ success: false, error: "Material no encontrado." });
    }

    if (contenido.tipo !== "pdf" || !contenido.publicIdCloudinary) {
      return res.status(400).json({
        success: false,
        error: "Este material no tiene un archivo PDF cargado.",
      });
    }

    if (usuario.rol === "estudiante") {
      const sesion = await Sesion.findById(contenido.sesionId);
      const progreso = await ProgresoEstudiante.findOne({
        userId: usuario._id,
      });
      const desbloqueada =
        sesion &&
        progreso &&
        sesion.numero <= progreso.sesionActualDesbloqueada;
      if (!desbloqueada) {
        return res.status(403).json({
          success: false,
          error: "Todavía no tienes acceso a este material.",
        });
      }
    } else if (!["coordinadora", "admin"].includes(usuario.rol)) {
      return res.status(401).json({ success: false, error: "No autorizado." });
    }

    const urlFirmada = generarUrlDescargaFirmada(contenido.publicIdCloudinary);

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
      "Content-Disposition": `inline; filename="${contenido.titulo}.pdf"`,
    });
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarActivosPorSesion,
  listarTodosPorSesion,
  crearContenido,
  editarContenido,
  eliminarContenido,
  marcarVisto,
  obtenerArchivo,
};
