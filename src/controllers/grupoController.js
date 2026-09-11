const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Grupo = require("../models/Grupo");
const User = require("../models/User");
const Inscripcion = require("../models/Inscripcion");
const ProgresoEstudiante = require("../models/ProgresoEstudiante");
const MovimientoContable = require("../models/MovimientoContable");
const { enviarCorreoCredencialesGrupo } = require("../utils/notificaciones");

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

// GET /api/grupos — coordinadora/admin: lista de todos los grupos, con la
// cantidad real de estudiantes calculada al vuelo (no se guarda como
// campo, ver nota de diseño en Resumen_sesion_08_09_2026_grupo___MD).
async function listarGrupos(req, res, next) {
  try {
    const grupos = await Grupo.find({}).sort({ createdAt: -1 }).lean();
    const conteos = await User.aggregate([
      { $match: { grupoId: { $in: grupos.map((g) => g._id) } } },
      { $group: { _id: "$grupoId", cantidad: { $sum: 1 } } },
    ]);
    const cantidadPorGrupo = new Map(
      conteos.map((c) => [String(c._id), c.cantidad]),
    );

    const data = grupos.map((g) => ({
      ...g,
      cantidadEstudiantesReal: cantidadPorGrupo.get(String(g._id)) || 0,
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// GET /api/grupos/:id — coordinadora/admin: detalle de un grupo + su roster
async function obtenerGrupo(req, res, next) {
  try {
    const grupo = await Grupo.findById(req.params.id);
    if (!grupo) {
      return res
        .status(404)
        .json({ success: false, error: "Grupo no encontrado." });
    }

    const estudiantes = await User.find({ grupoId: grupo._id })
      .select("nombre apellido cedula email telefono activo createdAt")
      .sort({ createdAt: 1 });

    res.json({ success: true, data: { grupo, estudiantes } });
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
  confirmarRoster,
  actualizarGrupo,
};
