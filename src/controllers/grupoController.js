const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Grupo = require("../models/Grupo");
const User = require("../models/User");
const Inscripcion = require("../models/Inscripcion");
const ProgresoEstudiante = require("../models/ProgresoEstudiante");
const MovimientoContable = require("../models/MovimientoContable");
const Sesion = require("../models/Sesion");
const ContenidoSesion = require("../models/ContenidoSesion");
const IntentoExamen = require("../models/IntentoExamen");
const Diploma = require("../models/Diploma");
const TestPsicologico = require("../models/TestPsicologico");
const CuestionarioEscolar = require("../models/CuestionarioEscolar");
const { enviarCorreoCredencialesGrupo } = require("../utils/notificaciones");
const {
  enviarReporteAhora: enviarReporteDelGrupo,
} = require("../utils/reporteGrupos");

function generarPasswordAleatoria() {
  // 8 bytes -> 16 caracteres hex, suficiente para una contraseña inicial
  // que la estudiante puede cambiar luego desde /auth/cambiar-password.
  return crypto.randomBytes(8).toString("hex");
}

// Grupo.tipo ("colegio"/"empresa") es el valor operativo (roles, permisos,
// gate de práctica/cuestionario en el resto del backend). Inscripcion.programa
// usa los nombres del currículo que ya aparecen en toda la especificación
// y en el resto de la documentación ("escolar"/"empresarial"), para que los
// reportes de contabilidad/admin agrupen igual que el resto de los
// documentos del proyecto. Son dos vocabularios del mismo concepto a
// propósito, no un descuido — si se necesita un tercer valor (Motorista) el
// día que se diseñe, este mapeo es el lugar a extender.
function programaDeGrupo(grupo) {
  return grupo.tipo === "colegio" ? "escolar" : "empresarial";
}

// POST /api/grupos — Formulario 1: datos del grupo. No crea nada más
// (ni cuentas ni movimientos contables) — eso espera al roster real
// (confirmarRoster). Ver ESPECIFICACION_PROGRAMAS_NUEVOS.md sección 3.
async function crearGrupo(req, res, next) {
  try {
    const {
      tipo,
      nombreInstitucion,
      contactoNombre,
      contactoEmail,
      contactoTelefono,
      precioAcordado,
      cantidadEstudiantesEstimada,
      notas,
    } = req.body;

    if (
      !tipo ||
      !nombreInstitucion ||
      !contactoNombre ||
      !contactoEmail ||
      !contactoTelefono ||
      precioAcordado === undefined ||
      !cantidadEstudiantesEstimada
    ) {
      return res.status(400).json({
        success: false,
        error:
          "tipo, nombreInstitucion, contactoNombre, contactoEmail, contactoTelefono, precioAcordado y cantidadEstudiantesEstimada son obligatorios.",
      });
    }

    if (!["colegio", "empresa"].includes(tipo)) {
      return res.status(400).json({
        success: false,
        error: 'tipo debe ser "colegio" o "empresa".',
      });
    }

    if (precioAcordado <= 0 || cantidadEstudiantesEstimada <= 0) {
      return res.status(400).json({
        success: false,
        error:
          "precioAcordado y cantidadEstudiantesEstimada deben ser mayores a 0.",
      });
    }

    const grupo = await Grupo.create({
      tipo,
      nombreInstitucion,
      contactoNombre,
      contactoEmail,
      contactoTelefono,
      precioAcordado,
      cantidadEstudiantesEstimada,
      notas: notas || null,
      creadoPor: req.usuario._id,
      // pendienteRoster: true y fechaInicio: null quedan por default del
      // schema — explícito aquí solo en el comentario para que quede
      // claro que es intencional, no un olvido.
    });

    res.status(201).json({ success: true, data: grupo });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------
// Seguimiento de grupos (NUEVO 18/09/2026)
//
// Todo lo de esta sección se calcula al vuelo a partir de las colecciones
// que ya existen (User, ProgresoEstudiante, IntentoExamen, Diploma,
// TestPsicologico/CuestionarioEscolar) — no se agregó ningún campo ni
// colección nueva, así que no hay nada que migrar en Atlas.
// ---------------------------------------------------------------------

// Una estudiante sin actividad en más de estos días (y sin haber
// terminado la teoría) se marca como "rezagada" — es lo que la
// coordinadora necesita ver primero para dar seguimiento. Sin actividad
// alguna, se cuenta desde que arrancó el grupo.
const DIAS_SIN_ACTIVIDAD = 7;
const MS_DIA = 24 * 60 * 60 * 1000;

// Cantidad real de sesiones del currículo "estandar" (que es el que
// consumen Escolar y Empresarial). Se lee de Mongo en vez de escribir un
// 4 fijo, por si el curso vuelve a crecer (ver comentario en
// models/Sesion.js). El 4 solo es el respaldo si la colección estuviera
// vacía.
async function contarSesionesDelCurso() {
  const total = await Sesion.countDocuments({
    programaContenido: "estandar",
    activo: true,
  });
  return total || 4;
}

function maxFecha(fechas) {
  const validas = fechas.filter(Boolean).map((f) => new Date(f).getTime());
  return validas.length ? new Date(Math.max(...validas)) : null;
}

function promedio(numeros) {
  return numeros.length
    ? Math.round(numeros.reduce((a, n) => a + n, 0) / numeros.length)
    : null;
}

// Una fila por estudiante, para todos los grupos pedidos, con un número
// FIJO de consultas a Mongo (no una por estudiante ni una por grupo).
// Devuelve Map<grupoId(string), fila[]>.
async function construirFilasPorGrupo(grupos, totalSesiones) {
  const filasPorGrupo = new Map(grupos.map((g) => [String(g._id), []]));
  if (grupos.length === 0) return filasPorGrupo;

  const grupoPorId = new Map(grupos.map((g) => [String(g._id), g]));

  const estudiantes = await User.find({
    grupoId: { $in: grupos.map((g) => g._id) },
  })
    .select("nombre apellido cedula email telefono activo createdAt grupoId")
    .sort({ apellido: 1, nombre: 1 })
    .lean();

  if (estudiantes.length === 0) return filasPorGrupo;

  const userIds = estudiantes.map((e) => e._id);

  const [progresos, diplomas, intentos, escolares, perfiles] =
    await Promise.all([
      ProgresoEstudiante.find({ userId: { $in: userIds } })
        .select(
          "userId sesionesAprobadas sesionActualDesbloqueada cursoCompletado contenidosVistos updatedAt",
        )
        .lean(),
      Diploma.find({ userId: { $in: userIds } })
        .select("userId")
        .lean(),
      IntentoExamen.find({ userId: { $in: userIds } })
        .select("userId sesionId calificacion fechaFin updatedAt")
        .lean(),
      CuestionarioEscolar.find({ userId: { $in: userIds } })
        .select("userId")
        .lean(),
      TestPsicologico.find({ userId: { $in: userIds } })
        .select("userId")
        .lean(),
    ]);

  const progresoPorUsuario = new Map(
    progresos.map((p) => [String(p.userId), p]),
  );
  const conDiploma = new Set(diplomas.map((d) => String(d.userId)));
  const conEscolar = new Set(escolares.map((c) => String(c.userId)));
  const conPerfil = new Set(perfiles.map((c) => String(c.userId)));

  const intentosPorUsuario = new Map();
  for (const intento of intentos) {
    const clave = String(intento.userId);
    if (!intentosPorUsuario.has(clave)) intentosPorUsuario.set(clave, []);
    intentosPorUsuario.get(clave).push(intento);
  }

  const ahora = Date.now();

  for (const est of estudiantes) {
    const claveUsuario = String(est._id);
    const grupo = grupoPorId.get(String(est.grupoId));
    const progreso = progresoPorUsuario.get(claveUsuario);
    const misIntentos = intentosPorUsuario.get(claveUsuario) || [];

    const sesionesAprobadas = progreso?.sesionesAprobadas?.length || 0;
    const materialesVistos = progreso?.contenidosVistos?.length || 0;
    const cursoCompletado = !!progreso?.cursoCompletado;

    // Promedio = promedio de la MEJOR nota de cada sesión entre los
    // exámenes ya entregados (un reintento no castiga a la estudiante).
    const mejorPorSesion = new Map();
    for (const intento of misIntentos) {
      if (!intento.fechaFin || intento.calificacion === null) continue;
      const clave = String(intento.sesionId);
      const previa = mejorPorSesion.get(clave);
      if (previa === undefined || intento.calificacion > previa) {
        mejorPorSesion.set(clave, intento.calificacion);
      }
    }
    const promedioExamenes = promedio([...mejorPorSesion.values()]);

    // Última actividad: el updatedAt del progreso solo cuenta si hubo
    // actividad real — al crear el roster el progreso se inicializa con
    // sesionActualDesbloqueada: 1 y ese updatedAt no significa que la
    // estudiante haya hecho nada.
    const hayActividadEnProgreso =
      materialesVistos > 0 || sesionesAprobadas > 0;
    const ultimaActividad = maxFecha([
      hayActividadEnProgreso ? progreso.updatedAt : null,
      ...misIntentos.map((i) => i.updatedAt),
    ]);

    const tieneActividad = !!ultimaActividad || cursoCompletado;

    let estado;
    if (!est.activo) estado = "inactiva";
    else if (cursoCompletado) estado = "completado";
    else if (tieneActividad) estado = "en_curso";
    else estado = "sin_iniciar";

    const referencia = ultimaActividad || grupo?.fechaInicio || est.createdAt;
    const rezagada =
      est.activo &&
      !cursoCompletado &&
      ahora - new Date(referencia).getTime() > DIAS_SIN_ACTIVIDAD * MS_DIA;

    const cuestionarioCompletado =
      grupo?.tipo === "colegio"
        ? conEscolar.has(claveUsuario)
        : conPerfil.has(claveUsuario);

    filasPorGrupo.get(String(est.grupoId)).push({
      _id: est._id,
      nombre: est.nombre,
      apellido: est.apellido,
      cedula: est.cedula || null,
      email: est.email,
      telefono: est.telefono,
      activo: est.activo,
      createdAt: est.createdAt,
      sesionesAprobadas,
      totalSesiones,
      sesionActualDesbloqueada: progreso?.sesionActualDesbloqueada || 0,
      materialesVistos,
      cursoCompletado,
      porcentajeAvance: cursoCompletado
        ? 100
        : Math.round((sesionesAprobadas / totalSesiones) * 100),
      promedioExamenes,
      tieneDiploma: conDiploma.has(claveUsuario),
      cuestionarioCompletado,
      ultimaActividad,
      estado,
      rezagada,
    });
  }

  return filasPorGrupo;
}

// Resumen agregado del grupo. Los contadores de avance solo cuentan a las
// estudiantes activas (una desactivada porque ya no pertenece a la
// institución no debe inflar ni bajar el porcentaje del grupo).
function armarResumen(filas) {
  const activas = filas.filter((f) => f.activo);
  return {
    total: filas.length,
    activas: activas.length,
    inactivas: filas.length - activas.length,
    completados: activas.filter((f) => f.estado === "completado").length,
    enCurso: activas.filter((f) => f.estado === "en_curso").length,
    sinIniciar: activas.filter((f) => f.estado === "sin_iniciar").length,
    rezagadas: activas.filter((f) => f.rezagada).length,
    diplomas: activas.filter((f) => f.tieneDiploma).length,
    cuestionariosCompletados: activas.filter((f) => f.cuestionarioCompletado)
      .length,
    porcentajeAvance: activas.length
      ? Math.round(
          activas.reduce((a, f) => a + f.porcentajeAvance, 0) / activas.length,
        )
      : 0,
    promedioExamenes: promedio(
      activas.map((f) => f.promedioExamenes).filter((v) => v !== null),
    ),
    ultimaActividad: maxFecha(filas.map((f) => f.ultimaActividad)),
  };
}

// GET /api/grupos — coordinadora/admin: lista de todos los grupos, cada
// uno con su resumen de avance ya calculado (para la tarjeta). Sigue
// devolviendo cantidadEstudiantesReal como antes (todas las cuentas del
// grupo, activas o no) para no romper nada que ya la lea.
async function listarGrupos(req, res, next) {
  try {
    const grupos = await Grupo.find({}).sort({ createdAt: -1 }).lean();
    const totalSesiones = await contarSesionesDelCurso();
    const filasPorGrupo = await construirFilasPorGrupo(grupos, totalSesiones);

    const data = grupos.map((g) => {
      const filas = filasPorGrupo.get(String(g._id)) || [];
      return {
        ...g,
        cantidadEstudiantesReal: filas.length,
        resumen: armarResumen(filas),
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// GET /api/grupos/:id — coordinadora/admin: detalle de un grupo + su
// roster con el avance de cada estudiante + el resumen agregado.
async function obtenerGrupo(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res
        .status(404)
        .json({ success: false, error: "Grupo no encontrado." });
    }
    const grupo = await Grupo.findById(req.params.id).lean();
    if (!grupo) {
      return res
        .status(404)
        .json({ success: false, error: "Grupo no encontrado." });
    }

    const totalSesiones = await contarSesionesDelCurso();
    const filasPorGrupo = await construirFilasPorGrupo([grupo], totalSesiones);
    const estudiantes = filasPorGrupo.get(String(grupo._id)) || [];

    res.json({
      success: true,
      data: {
        grupo,
        estudiantes,
        resumen: armarResumen(estudiantes),
        totalSesiones,
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/grupos/:id/estudiantes/:userId — coordinadora/admin: ficha
// completa de UNA estudiante del grupo: datos, avance por sesión (material
// visto, intentos de examen con sus notas), cuestionario de ingreso con
// sus respuestas y diploma. Verifica que la estudiante pertenezca a ESE
// grupo — no sirve para espiar a una estudiante de otro grupo o
// individual pasando un id cualquiera.
async function obtenerEstudianteDeGrupo(req, res, next) {
  try {
    const { id, userId } = req.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(userId)) {
      return res
        .status(404)
        .json({ success: false, error: "Estudiante no encontrada." });
    }

    const grupo = await Grupo.findById(id).lean();
    if (!grupo) {
      return res
        .status(404)
        .json({ success: false, error: "Grupo no encontrado." });
    }

    const estudiante = await User.findOne({ _id: userId, grupoId: grupo._id })
      .select(
        "nombre apellido cedula email telefono provincia municipio fechaNacimiento activo emailVerificado createdAt",
      )
      .lean();
    if (!estudiante) {
      return res.status(404).json({
        success: false,
        error: "Esta estudiante no pertenece a este grupo.",
      });
    }

    const progreso = await ProgresoEstudiante.findOne({ userId }).lean();
    const programaContenido = progreso?.programa || "estandar";

    const sesiones = await Sesion.find({ programaContenido, activo: true })
      .sort({ numero: 1 })
      .select("numero titulo")
      .lean();
    const sesionIds = sesiones.map((s) => s._id);

    const esEscolar = grupo.tipo === "colegio";

    const [contenidos, intentos, cuestionario, diploma, inscripcion] =
      await Promise.all([
        ContenidoSesion.find({ sesionId: { $in: sesionIds }, activo: true })
          .sort({ orden: 1, createdAt: 1 })
          .select("sesionId titulo tipo")
          .lean(),
        // Sin `respuestas` a propósito: el detalle pregunta por pregunta
        // se pide aparte, solo cuando la coordinadora abre un intento.
        IntentoExamen.find({ userId })
          .sort({ createdAt: 1 })
          .select(
            "sesionId numeroIntento calificacion aprobado fechaInicio fechaFin",
          )
          .lean(),
        esEscolar
          ? CuestionarioEscolar.findOne({ userId }).lean()
          : TestPsicologico.findOne({ userId }).lean(),
        Diploma.findOne({ userId })
          .select("codigoVerificacion fechaEmision")
          .lean(),
        Inscripcion.findOne({ userId })
          .select("estadoPago fechaPago createdAt")
          .lean(),
      ]);

    const vistos = new Set((progreso?.contenidosVistos || []).map(String));
    const aprobadas = new Set(progreso?.sesionesAprobadas || []);
    const fechaAprobacionPorSesion = new Map(
      (progreso?.fechasAprobacionSesion || []).map((f) => [f.sesion, f.fecha]),
    );
    const sesionDesbloqueada = progreso?.sesionActualDesbloqueada || 0;

    let materialTotal = 0;
    let materialVisto = 0;

    const sesionesVista = sesiones.map((s) => {
      const materiales = contenidos
        .filter((c) => String(c.sesionId) === String(s._id))
        .map((c) => ({
          _id: c._id,
          titulo: c.titulo,
          tipo: c.tipo,
          visto: vistos.has(String(c._id)),
        }));
      materialTotal += materiales.length;
      materialVisto += materiales.filter((m) => m.visto).length;

      const intentosSesion = intentos
        .filter((i) => String(i.sesionId) === String(s._id))
        .map((i) => ({
          _id: i._id,
          numeroIntento: i.numeroIntento,
          calificacion: i.calificacion,
          aprobado: i.aprobado,
          fechaInicio: i.fechaInicio,
          fechaFin: i.fechaFin,
          estadoIntento: i.fechaFin
            ? "entregado"
            : i.fechaInicio
              ? "en_curso"
              : "sin_iniciar",
          duracionSegundos:
            i.fechaInicio && i.fechaFin
              ? Math.round(
                  (new Date(i.fechaFin) - new Date(i.fechaInicio)) / 1000,
                )
              : null,
        }));
      const notas = intentosSesion
        .filter(
          (i) => i.estadoIntento === "entregado" && i.calificacion !== null,
        )
        .map((i) => i.calificacion);

      const aprobada = aprobadas.has(s.numero);
      return {
        _id: s._id,
        numero: s.numero,
        titulo: s.titulo,
        estado: aprobada
          ? "aprobada"
          : s.numero <= sesionDesbloqueada
            ? "disponible"
            : "bloqueada",
        fechaAprobacion: fechaAprobacionPorSesion.get(s.numero) || null,
        materiales,
        intentos: intentosSesion,
        mejorCalificacion: notas.length ? Math.max(...notas) : null,
      };
    });

    const mejores = sesionesVista
      .map((s) => s.mejorCalificacion)
      .filter((n) => n !== null);

    res.json({
      success: true,
      data: {
        grupo: {
          _id: grupo._id,
          tipo: grupo.tipo,
          nombreInstitucion: grupo.nombreInstitucion,
        },
        estudiante,
        progreso: {
          cursoCompletado: !!progreso?.cursoCompletado,
          sesionesAprobadas: progreso?.sesionesAprobadas?.length || 0,
          totalSesiones: sesiones.length,
          materialVisto,
          materialTotal,
          promedioExamenes: promedio(mejores),
        },
        sesiones: sesionesVista,
        // El cuestionario devuelve las respuestas crudas, igual que
        // /api/test-psicologico/:userId y /api/cuestionario-escolar/:userId
        // (mismo nivel de acceso: coordinadora/admin). `tipo` le dice al
        // frontend cuál banco de preguntas usar para mostrarlas.
        cuestionario: {
          tipo: esEscolar ? "escolar" : "perfil_conductual",
          completado: !!cuestionario,
          fecha: cuestionario?.createdAt || null,
          respuestas: cuestionario?.respuestas || [],
          reflexiones: cuestionario?.reflexiones || [],
        },
        diploma: diploma
          ? {
              emitido: true,
              fechaEmision: diploma.fechaEmision,
              codigoVerificacion: diploma.codigoVerificacion,
            }
          : { emitido: false },
        inscripcion: inscripcion
          ? {
              estadoPago: inscripcion.estadoPago,
              fechaPago: inscripcion.fechaPago,
              creadaEl: inscripcion.createdAt,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/grupos/:id/estudiantes/:userId/intentos/:intentoId —
// coordinadora/admin: un examen ya entregado, pregunta por pregunta (qué
// respondió la estudiante vs. cuál era la correcta). El endpoint
// equivalente de la estudiante (/intentos-examen/:id/detalle) solo deja
// ver los intentos propios.
async function obtenerIntentoDeEstudiante(req, res, next) {
  try {
    const { id, userId, intentoId } = req.params;
    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(userId) ||
      !mongoose.isValidObjectId(intentoId)
    ) {
      return res
        .status(404)
        .json({ success: false, error: "Intento no encontrado." });
    }

    const perteneceAlGrupo = await User.exists({ _id: userId, grupoId: id });
    if (!perteneceAlGrupo) {
      return res.status(404).json({
        success: false,
        error: "Esta estudiante no pertenece a este grupo.",
      });
    }

    const intento = await IntentoExamen.findOne({ _id: intentoId, userId })
      .populate("examenId")
      .lean();
    if (!intento) {
      return res
        .status(404)
        .json({ success: false, error: "Intento no encontrado." });
    }
    if (!intento.fechaFin) {
      return res.status(400).json({
        success: false,
        error: "Este examen todavía no ha sido entregado.",
      });
    }
    // Los bancos de preguntas se pueden borrar y recrear (ver "Pendiente
    // real" en ARQUITECTURA_BACKEND.md) — un intento viejo puede quedar
    // apuntando a un examen que ya no existe.
    if (!intento.examenId || !Array.isArray(intento.examenId.preguntas)) {
      return res.status(404).json({
        success: false,
        error:
          "El banco de preguntas de este examen ya no existe, no se puede mostrar el detalle.",
      });
    }

    const preguntas = intento.examenId.preguntas.map((p, i) => {
      const respuesta = intento.respuestas?.[i];
      return {
        texto: p.texto,
        opciones: p.opciones,
        respuestaEstudiante: respuesta === undefined ? null : respuesta,
        respuestaCorrectaIndex: p.respuestaCorrectaIndex,
        acerto: respuesta === p.respuestaCorrectaIndex,
      };
    });

    res.json({
      success: true,
      data: {
        calificacion: intento.calificacion,
        aprobado: intento.aprobado,
        preguntas,
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/grupos/:id/estudiantes/:userId/reenviar-credenciales —
// coordinadora/admin: genera una contraseña NUEVA y se la manda por
// correo a la estudiante. Útil cuando perdió el correo original o no le
// llegó. La contraseña anterior deja de servir. Deliberadamente NO se
// devuelve la contraseña en la respuesta — solo viaja por el correo, igual
// que al cargar el roster.
async function reenviarCredenciales(req, res, next) {
  try {
    const { id, userId } = req.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(userId)) {
      return res
        .status(404)
        .json({ success: false, error: "Estudiante no encontrada." });
    }

    const grupo = await Grupo.findById(id);
    if (!grupo) {
      return res
        .status(404)
        .json({ success: false, error: "Grupo no encontrado." });
    }

    const usuario = await User.findOne({ _id: userId, grupoId: grupo._id });
    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: "Esta estudiante no pertenece a este grupo.",
      });
    }
    if (!usuario.activo) {
      return res.status(400).json({
        success: false,
        error:
          "La cuenta está inactiva — reactívala antes de reenviar credenciales.",
      });
    }

    const passwordPlano = generarPasswordAleatoria();
    usuario.passwordHash = await bcrypt.hash(passwordPlano, 10);
    // Si tenía un enlace de recuperación pendiente, ya no aplica.
    usuario.tokenRecuperacion = null;
    usuario.tokenRecuperacionExpira = null;
    await usuario.save();

    await enviarCorreoCredencialesGrupo({
      to: usuario.email,
      nombre: usuario.nombre,
      password: passwordPlano,
      nombreInstitucion: grupo.nombreInstitucion,
    });

    res.json({
      success: true,
      data: { email: usuario.email },
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/grupos/:id/enviar-reporte — coordinadora/admin: envía YA el
// reporte de avance al contacto de la institución (el mismo correo que
// manda el cron diario). No cambia el estado del grupo.
async function enviarReporteAhora(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res
        .status(404)
        .json({ success: false, error: "Grupo no encontrado." });
    }
    const grupo = await Grupo.findById(req.params.id);
    if (!grupo) {
      return res
        .status(404)
        .json({ success: false, error: "Grupo no encontrado." });
    }
    if (grupo.pendienteRoster) {
      return res.status(400).json({
        success: false,
        error: "Este grupo todavía no tiene estudiantes cargadas.",
      });
    }

    const { enviado, cantidad } = await enviarReporteDelGrupo(grupo);
    if (!enviado) {
      return res.status(502).json({
        success: false,
        error:
          "No se pudo enviar el correo (revisa el correo de contacto del grupo e inténtalo de nuevo).",
      });
    }

    res.json({
      success: true,
      data: { email: grupo.contactoEmail, cantidad },
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/grupos/:id/roster — Formulario 2: carga el roster real.
//
// Soporta dos casos, distinguidos por Grupo.pendienteRoster:
//
// 1) Primera confirmación (pendienteRoster: true): crea las cuentas y las
//    inscripciones de TODO el roster enviado, registra el pago total en
//    contabilidad (ver nota "CAMBIO (10/09/2026)" más abajo — ya NO se
//    prorratea en varias entradas), fija fechaInicio (de aquí cuentan las
//    24h del primer reporte diario) y pendienteRoster pasa a false.
// 2) Adición tardía (pendienteRoster: false, ya se confirmó antes): el
//    mismo endpoint acepta más estudiantes para un grupo que ya inició.
//    No genera ningún cobro ni entrada contable nueva — precioAcordado ya
//    se registró completo en la primera confirmación. Inscripcion.monto
//    de cada estudiante nuevo sigue calculándose como referencia interna
//    (cuánto "vale" su cupo dentro del total), pero es solo eso, una
//    referencia — no alimenta contabilidad.
async function confirmarRoster(req, res, next) {
  try {
    const grupo = await Grupo.findById(req.params.id);
    if (!grupo) {
      return res
        .status(404)
        .json({ success: false, error: "Grupo no encontrado." });
    }

    const { estudiantes } = req.body;
    if (!Array.isArray(estudiantes) || estudiantes.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Se esperaba un arreglo 'estudiantes' con al menos un elemento.",
      });
    }

    const esPrimeraConfirmacion = grupo.pendienteRoster;
    const programa = programaDeGrupo(grupo);

    // --- Paso 1: crear las cuentas, una por una. Un error en una fila
    // (cédula/correo duplicado, campo faltante) no debe tumbar el resto
    // del roster — se reporta como aviso y se sigue con las demás, mismo
    // espíritu "no bloqueante" que el resto de esta funcionalidad.
    const creados = []; // [{ usuario, passwordPlano }]
    const errores = [];

    for (let i = 0; i < estudiantes.length; i++) {
      const fila = estudiantes[i] || {};
      try {
        const {
          nombre,
          apellido,
          cedula,
          telefono,
          email,
          provincia,
          fechaNacimiento,
        } = fila;

        if (
          !nombre ||
          !apellido ||
          !telefono ||
          !email ||
          !provincia ||
          !fechaNacimiento
        ) {
          throw new Error(
            "Faltan campos obligatorios (nombre, apellido, telefono, email, provincia, fechaNacimiento).",
          );
        }

        const passwordPlano = generarPasswordAleatoria();
        const passwordHash = await bcrypt.hash(passwordPlano, 10);

        // NUEVO (10/09/2026): cédula es opcional aquí — los grupos tipo
        // colegio suelen tener menores sin cédula. Cualquier valor vacío
        // o literalmente "n/a" (con o sin mayúsculas/puntos/espacios) se
        // guarda como "sin cédula" de verdad (undefined), no como el
        // texto "N/A" — así el índice sparse de User.cedula no choca
        // entre dos estudiantes sin cédula (ver nota en models/User.js).
        const cedulaLimpia = (cedula || "").trim();
        const sinCedula = !cedulaLimpia || /^n\.?\/?a\.?$/i.test(cedulaLimpia);

        const nuevoUsuario = await User.create({
          nombre,
          apellido,
          ...(sinCedula ? {} : { cedula: cedulaLimpia }),
          telefono,
          email,
          passwordHash,
          provincia,
          fechaNacimiento,
          rol: "estudiante",
          grupoId: grupo._id,
          // NUEVO (09/09/2026): estas cuentas nunca pasan por /registro ni
          // por el link de verificación — las crea Muvo a partir del
          // roster que manda la institución, así que se marcan verificadas
          // directo. emailVerificado solo bloquea el flujo de
          // auto-inscripción individual (crearOReenviarInscripcionPropia),
          // que estas estudiantes tampoco usan (su Inscripcion se crea
          // aquí mismo, ya pagada).
          emailVerificado: true,
        });

        creados.push({ usuario: nuevoUsuario, passwordPlano });
      } catch (err) {
        let motivo = err.message;
        if (err.code === 11000) {
          const campo = Object.keys(err.keyPattern || {})[0];
          motivo =
            campo === "email"
              ? "Ya existe una cuenta con ese correo."
              : campo === "cedula"
                ? "Ya existe una cuenta con esa cédula."
                : `Valor duplicado (${campo}).`;
        }
        errores.push({ fila: i + 1, email: fila.email || null, motivo });
      }
    }

    if (creados.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No se pudo crear ninguna cuenta del roster.",
        errores,
      });
    }

    // --- Paso 2: registro por estudiante (Inscripcion) + contabilidad.
    //
    // CAMBIO (10/09/2026): antes esto prorrateaba precioAcordado entre el
    // roster y creaba un MovimientoContable por estudiante. La fundadora
    // pidió eliminar el prorrateo contable — muchas entradas pequeñas por
    // el mismo grupo distorsionan el balance y hacen más difícil
    // entenderlo de un vistazo. Ahora: Inscripcion.monto de cada
    // estudiante guarda su parte prorrateada solo como referencia interna
    // (para saber cuánto "vale" cada cupo si se necesita mirar el
    // detalle), pero la CONTABILIDAD (MovimientoContable, lo único que
    // alimenta /contabilidad y los balances mensuales) recibe una sola
    // entrada por el monto TOTAL, y solo en la primera confirmación del
    // roster (el primer pago real de la institución). Adiciones tardías
    // (esPrimeraConfirmacion === false) no generan ningún
    // MovimientoContable nuevo — no hay cobro adicional real que
    // registrar, precioAcordado ya cubrió al grupo completo por delante.
    const cantidadExistente = esPrimeraConfirmacion
      ? 0
      : (await User.countDocuments({ grupoId: grupo._id })) - creados.length;
    const cantidadTotal = cantidadExistente + creados.length;

    const montoBase = Math.floor(grupo.precioAcordado / cantidadTotal);
    const residuo = grupo.precioAcordado - montoBase * cantidadTotal;

    const ahora = new Date();
    const inscripcionesCreadas = [];

    for (let i = 0; i < creados.length; i++) {
      const { usuario, passwordPlano } = creados[i];
      // El residuo del redondeo se le asigna a la primera estudiante de
      // ESTE lote (no a la primera del grupo en términos absolutos) —
      // igual de arbitrario que cualquier otra regla de redondeo, pero
      // consistente con "el residuo va en el primer registro" de la
      // especificación. Este monto ya NO se contabiliza individualmente
      // (ver nota arriba); es solo referencia dentro de Inscripcion.
      const monto = i === 0 ? montoBase + residuo : montoBase;

      const inscripcion = await Inscripcion.create({
        userId: usuario._id,
        programa,
        tipoPlan: "grupo",
        monto,
        estadoPago: "pagado",
        metodoPago: "grupo",
        fechaPago: ahora,
        confirmadoPor: req.usuario._id,
      });
      inscripcionesCreadas.push(inscripcion);

      // Mismo patrón que confirmarPago en inscripcionController.js —
      // upsert por si ya existiera (no debería, pero es defensivo y barato).
      await ProgresoEstudiante.findOneAndUpdate(
        { userId: usuario._id },
        {
          $setOnInsert: { userId: usuario._id, sesionActualDesbloqueada: 1 },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      // Sin await a propósito, igual que el resto de correos transaccionales
      // del proyecto — no debe demorar ni arriesgar la respuesta si Resend
      // falla para una fila en particular.
      enviarCorreoCredencialesGrupo({
        to: usuario.email,
        nombre: usuario.nombre,
        password: passwordPlano,
        nombreInstitucion: grupo.nombreInstitucion,
      });
    }

    // Una sola entrada contable, solo en el primer pago, por el total
    // negociado — no por la suma de las partes prorrateadas (es el mismo
    // número, pero como UNA entrada en vez de una por estudiante).
    if (esPrimeraConfirmacion && inscripcionesCreadas.length > 0) {
      await MovimientoContable.create({
        tipo: "entrada",
        categoria: "inscripcion",
        monto: grupo.precioAcordado,
        descripcion: `Inscripción de grupo — ${grupo.nombreInstitucion} (pago total, ${creados.length} estudiante${creados.length === 1 ? "" : "s"})`,
        fecha: ahora,
        inscripcionRelacionadaId: inscripcionesCreadas[0]._id,
        registradoPor: req.usuario._id,
      });
    }

    if (esPrimeraConfirmacion) {
      grupo.pendienteRoster = false;
      grupo.fechaInicio = ahora;
      await grupo.save();
    }

    const discrepancia =
      esPrimeraConfirmacion &&
      creados.length !== grupo.cantidadEstudiantesEstimada;

    res.status(201).json({
      success: true,
      data: {
        creados: creados.length,
        errores,
        esPrimeraConfirmacion,
        discrepancia,
        cantidadEstimada: grupo.cantidadEstudiantesEstimada,
        cantidadCreadaEnEsteLote: creados.length,
        cantidadTotalGrupo: cantidadTotal,
      },
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/grupos/:id — coordinadora/admin: editar datos del grupo
// (notas, contacto, activo a mano). No permite tocar tipo/precioAcordado
// una vez pendienteRoster es false, para no invalidar el prorrateo ya
// hecho sin querer.
async function actualizarGrupo(req, res, next) {
  try {
    const grupo = await Grupo.findById(req.params.id);
    if (!grupo) {
      return res
        .status(404)
        .json({ success: false, error: "Grupo no encontrado." });
    }

    const camposEditables = [
      "nombreInstitucion",
      "contactoNombre",
      "contactoEmail",
      "contactoTelefono",
      "notas",
      "activo",
    ];
    // precioAcordado y cantidadEstudiantesEstimada solo se pueden tocar
    // mientras no se haya confirmado ningún roster todavía — después ya
    // hay movimientos contables calculados a partir de ese número.
    if (grupo.pendienteRoster) {
      camposEditables.push("precioAcordado", "cantidadEstudiantesEstimada");
    }

    for (const campo of camposEditables) {
      if (req.body[campo] !== undefined) {
        grupo[campo] = req.body[campo];
      }
    }

    await grupo.save();
    res.json({ success: true, data: grupo });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  crearGrupo,
  listarGrupos,
  obtenerGrupo,
  obtenerEstudianteDeGrupo,
  obtenerIntentoDeEstudiante,
  reenviarCredenciales,
  enviarReporteAhora,
  confirmarRoster,
  actualizarGrupo,
};
