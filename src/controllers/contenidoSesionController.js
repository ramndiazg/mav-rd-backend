const ContenidoSesion = require("../models/ContenidoSesion");
const Sesion = require("../models/Sesion");
const ProgresoEstudiante = require("../models/ProgresoEstudiante");
const { intentarDesbloquear } = require("./examenController");

// GET /api/contenido-sesion/sesion/:sesionId — cualquier autenticada, solo activos
// (la estudiante lo usa para ver su lista de materiales de estudio)
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

// GET /api/contenido-sesion/admin/sesion/:sesionId — coordinadora/admin, todos (incluye inactivos)
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
    const { sesionId, titulo, tipo, url, contenidoTexto, orden } = req.body;

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
      contenidoTexto,
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
    const { titulo, tipo, url, contenidoTexto, orden, activo } = req.body;

    const contenido = await ContenidoSesion.findById(id);
    if (!contenido) {
      return res
        .status(404)
        .json({ success: false, error: "Contenido no encontrado." });
    }

    if (titulo !== undefined) contenido.titulo = titulo;
    if (tipo !== undefined) contenido.tipo = tipo;
    if (url !== undefined) contenido.url = url;
    if (contenidoTexto !== undefined) contenido.contenidoTexto = contenidoTexto;
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
// Al completar TODO el contenido activo de una sesión, desbloquea el examen
// automáticamente — sin que la coordinadora tenga que hacer nada.
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

    // ¿Ya vio TODO el contenido activo de esta sesión?
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
    if (completó) {
      const resultado = await intentarDesbloquear({
        sesionId: contenido.sesionId,
        userId,
        desbloqueadoPor: userId,
      });
      // Si intentarDesbloquear falla (ej. ya agotó los 3 intentos, o no es su
      // turno todavía), no rompemos la respuesta de "marcar visto" — el
      // contenido igual queda marcado, solo no se crea un examen nuevo.
      examenDesbloqueado = resultado.ok;
    }

    res.json({
      success: true,
      data: { contenidoId: contenido._id, examenDesbloqueado },
    });
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
};
