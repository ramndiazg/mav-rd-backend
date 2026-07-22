const Noticia = require("../models/Noticia");

// GET /api/noticias — público. Query params: page, limit
async function listarNoticias(req, res, next) {
  try {
    const { page, limit } = req.query;

    // Sin límite, esto traía TODAS las noticias siempre — con el tiempo
    // esto solo iba a crecer. Ahora pagina de verdad.
    const paginaActual = Math.max(1, Number(page) || 1);
    const limite = Math.min(50, Math.max(1, Number(limit) || 9));

    const totalDocumentos = await Noticia.countDocuments({});
    const totalPaginas = Math.max(1, Math.ceil(totalDocumentos / limite));

    const noticias = await Noticia.find({})
      .populate("autorId", "nombre apellido")
      .populate("comentarios.userId", "nombre apellido")
      .sort({ createdAt: -1 })
      .skip((paginaActual - 1) * limite)
      .limit(limite);

    res.json({
      success: true,
      data: noticias,
      paginacion: { paginaActual, totalPaginas, totalDocumentos, limite },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/noticias/:id — público
async function obtenerNoticia(req, res, next) {
  try {
    const noticia = await Noticia.findById(req.params.id)
      .populate("autorId", "nombre apellido")
      .populate("comentarios.userId", "nombre apellido");

    if (!noticia) {
      return res
        .status(404)
        .json({ success: false, error: "Noticia no encontrada." });
    }
    res.json({ success: true, data: noticia });
  } catch (error) {
    next(error);
  }
}

// POST /api/noticias — coordinadora/admin
async function crearNoticia(req, res, next) {
  try {
    const { titulo, contenido, imagenUrl, videoEmbedUrl } = req.body;

    if (!titulo || !contenido) {
      return res.status(400).json({
        success: false,
        error: "Título y contenido son obligatorios.",
      });
    }

    const noticia = await Noticia.create({
      titulo,
      contenido,
      imagenUrl: imagenUrl || null,
      videoEmbedUrl: videoEmbedUrl || null,
      autorId: req.usuario._id,
    });

    res.status(201).json({ success: true, data: noticia });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/noticias/:id — coordinadora/admin
async function actualizarNoticia(req, res, next) {
  try {
    const { titulo, contenido, imagenUrl, videoEmbedUrl } = req.body;

    const noticia = await Noticia.findByIdAndUpdate(
      req.params.id,
      {
        ...(titulo && { titulo }),
        ...(contenido && { contenido }),
        ...(imagenUrl !== undefined && { imagenUrl }),
        ...(videoEmbedUrl !== undefined && { videoEmbedUrl }),
      },
      { new: true },
    );

    if (!noticia) {
      return res
        .status(404)
        .json({ success: false, error: "Noticia no encontrada." });
    }
    res.json({ success: true, data: noticia });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/noticias/:id — coordinadora/admin
async function eliminarNoticia(req, res, next) {
  try {
    const noticia = await Noticia.findByIdAndDelete(req.params.id);
    if (!noticia) {
      return res
        .status(404)
        .json({ success: false, error: "Noticia no encontrada." });
    }
    res.json({ success: true, data: { eliminada: true } });
  } catch (error) {
    next(error);
  }
}

// POST /api/noticias/:id/like — cualquier usuaria autenticada (toggle: da o quita el like)
async function toggleLike(req, res, next) {
  try {
    const noticia = await Noticia.findById(req.params.id);
    if (!noticia) {
      return res
        .status(404)
        .json({ success: false, error: "Noticia no encontrada." });
    }

    const yaLeDioLike = noticia.likes.some(
      (id) => String(id) === String(req.usuario._id),
    );

    if (yaLeDioLike) {
      noticia.likes = noticia.likes.filter(
        (id) => String(id) !== String(req.usuario._id),
      );
    } else {
      noticia.likes.push(req.usuario._id);
    }

    await noticia.save();
    res.json({
      success: true,
      data: { totalLikes: noticia.likes.length, leDioLike: !yaLeDioLike },
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/noticias/:id/comentarios — cualquier usuaria autenticada
async function agregarComentario(req, res, next) {
  try {
    const { texto } = req.body;
    if (!texto || !texto.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "El comentario no puede estar vacío." });
    }

    const noticia = await Noticia.findById(req.params.id);
    if (!noticia) {
      return res
        .status(404)
        .json({ success: false, error: "Noticia no encontrada." });
    }

    noticia.comentarios.push({ userId: req.usuario._id, texto: texto.trim() });
    await noticia.save();

    res.status(201).json({
      success: true,
      data: noticia.comentarios[noticia.comentarios.length - 1],
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/noticias/:id/comentarios/:comentarioId — coordinadora/admin
async function eliminarComentario(req, res, next) {
  try {
    const { id, comentarioId } = req.params;

    const noticia = await Noticia.findById(id);
    if (!noticia) {
      return res
        .status(404)
        .json({ success: false, error: "Noticia no encontrada." });
    }

    noticia.comentarios = noticia.comentarios.filter(
      (c) => String(c._id) !== comentarioId,
    );
    await noticia.save();

    res.json({ success: true, data: { eliminado: true } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarNoticias,
  obtenerNoticia,
  crearNoticia,
  actualizarNoticia,
  eliminarNoticia,
  toggleLike,
  agregarComentario,
  eliminarComentario,
};
