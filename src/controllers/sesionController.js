const Sesion = require("../models/Sesion");
const ProgresoEstudiante = require("../models/ProgresoEstudiante");
const TestPsicologico = require("../models/TestPsicologico");
const CuestionarioEscolar = require("../models/CuestionarioEscolar");
const Grupo = require("../models/Grupo");

// GET /api/sesiones — coordinadora/admin: lista completa con contenido, para
// gestión. NUEVO (13/09/2026): ?programaContenido= opcional — sin él, sigue
// devolviendo las de los 3 programas mezcladas (compatibilidad con
// llamadas viejas), pero el panel de coordinadora ahora siempre lo manda
// (ver ARQUITECTURA_FRONTEND.md) para poder gestionar Estándar,
// Motorizados y Pesados por separado.
async function listarSesiones(req, res, next) {
  try {
    const { programaContenido } = req.query;
    const filtro = programaContenido ? { programaContenido } : {};
    const sesiones = await Sesion.find(filtro).sort({
      programaContenido: 1,
      numero: 1,
    });
    res.json({ success: true, data: sesiones });
  } catch (error) {
    next(error);
  }
}

// GET /api/sesiones/:numero — estudiante: solo si tiene acceso desbloqueado
//
// ACTUALIZADO (04/09/2026): antes de cualquier sesión (incluida la 1), se
// exige haber completado el test psicológico. Este es el único punto de
// entrada real al contenido de una sesión, así que bloquear aquí cubre
// tanto la pantalla del dashboard como cualquier intento de llamar a la
// API directo sin pasar por el frontend.
//
// ACTUALIZADO (08/09/2026): el cuestionario exigido ya no es siempre
// TestPsicologico. Si el estudiante pertenece a un Grupo de tipo
// "colegio" (programa Escolar), se exige CuestionarioEscolar en su
// lugar (renombrado en código el 11/09/2026, antes
// InformacionComplementariaEscolar — ver models/CuestionarioEscolar.js)
// — nunca ambos, y nunca el framing de "test psicológico" para estas
// estudiantes. Para todo lo demás (grupoId null, o Grupo de tipo
// "empresa"), sigue exigiendo TestPsicologico igual que hoy.
async function obtenerSesionParaEstudiante(req, res, next) {
  try {
    const numero = Number(req.params.numero);

    let esEscolar = false;
    if (req.usuario.grupoId) {
      const grupo = await Grupo.findById(req.usuario.grupoId).select("tipo");
      esEscolar = grupo?.tipo === "colegio";
    }

    if (esEscolar) {
      const cuestionarioCompletado = await CuestionarioEscolar.exists({
        userId: req.usuario._id,
      });
      if (!cuestionarioCompletado) {
        return res.status(403).json({
          success: false,
          error:
            "Debes completar el cuestionario de perfil antes de acceder al contenido.",
          codigo: "CUESTIONARIO_ESCOLAR_PENDIENTE",
        });
      }
    } else {
      const testCompletado = await TestPsicologico.exists({
        userId: req.usuario._id,
      });
      if (!testCompletado) {
        return res.status(403).json({
          success: false,
          error:
            "Debes completar el cuestionario de perfil antes de acceder al contenido.",
          codigo: "TEST_PSICOLOGICO_PENDIENTE",
        });
      }
    }

    const progreso = await ProgresoEstudiante.findOne({
      userId: req.usuario._id,
    });
    if (!progreso || numero > progreso.sesionActualDesbloqueada) {
      return res.status(403).json({
        success: false,
        error: "Esta sesión aún no ha sido desbloqueada por tu coordinadora.",
      });
    }

    // NUEVO (13/09/2026): filtrado también por programaContenido — con
    // Motorizados/Pesados ya sembrados, `numero` se repite entre
    // programas (Sesion.numero dejó de ser único global el 11/09/2026,
    // ver models/Sesion.js). Sin este filtro, una estudiante de
    // Motorizados podía terminar viendo, por accidente, la Sesión 1 de
    // `estandar` (mismo numero, Sesion distinta). `progreso.programa` es
    // el espejo de Inscripcion.programa (ver models/ProgresoEstudiante.js).
    const sesion = await Sesion.findOne({
      numero,
      programaContenido: progreso.programa || "estandar",
    });
    if (!sesion) {
      return res
        .status(404)
        .json({ success: false, error: "Sesión no encontrada." });
    }

    res.json({ success: true, data: sesion });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/sesiones/:numero?programaContenido=estandar — admin: editar
// teoría/videos. NUEVO (13/09/2026): ?programaContenido= (default
// "estandar", para no romper ningún llamado viejo del panel que todavía
// no lo mande) — sin esto, con `numero` repetido entre programas, esta
// consulta podía actualizar la Sesión equivocada al azar (Mongo devuelve
// la primera que matchea `{ numero }` sin más criterio).
async function actualizarSesion(req, res, next) {
  try {
    const numero = Number(req.params.numero);
    const programaContenido = req.query.programaContenido || "estandar";
    const { titulo, teoria, videos, activo } = req.body;

    const sesion = await Sesion.findOneAndUpdate(
      { numero, programaContenido },
      {
        ...(titulo && { titulo }),
        ...(teoria && { teoria }),
        ...(videos && { videos }),
        ...(activo !== undefined && { activo }),
      },
      { new: true },
    );

    if (!sesion) {
      return res
        .status(404)
        .json({ success: false, error: "Sesión no encontrada." });
    }

    res.json({ success: true, data: sesion });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarSesiones,
  obtenerSesionParaEstudiante,
  actualizarSesion,
};
