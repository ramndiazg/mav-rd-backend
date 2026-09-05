const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Diploma = require("../models/Diploma");
const Instructor = require("../models/Instructor");

async function listarUsuarios(req, res, next) {
  try {
    const { rol, search, activo, conDiploma, page, limit } = req.query;
    const filtro = {};

    if (rol) filtro.rol = rol;
    if (activo !== undefined) filtro.activo = activo === "true";

    if (search) {
      const regex = new RegExp(search, "i");
      filtro.$or = [
        { nombre: regex },
        { apellido: regex },
        { cedula: regex },
        { email: regex },
      ];
    }

    if (conDiploma !== undefined) {
      const diplomas = await Diploma.find().select("userId");
      const idsConDiploma = diplomas.map((d) => d.userId);
      filtro._id =
        conDiploma === "true"
          ? { $in: idsConDiploma }
          : { $nin: idsConDiploma };
    }

    const paginaActual = Math.max(1, Number(page) || 1);
    const limite = Math.min(100, Math.max(1, Number(limit) || 20));

    const totalDocumentos = await User.countDocuments(filtro);
    const totalPaginas = Math.max(1, Math.ceil(totalDocumentos / limite));

    const usuarios = await User.find(filtro)
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .skip((paginaActual - 1) * limite)
      .limit(limite);

    res.json({
      success: true,
      data: usuarios,
      paginacion: { paginaActual, totalPaginas, totalDocumentos, limite },
    });
  } catch (error) {
    next(error);
  }
}

async function crearCoordinadora(req, res, next) {
  try {
    const {
      nombre,
      apellido,
      cedula,
      telefono,
      email,
      password,
      provincia,
      fechaNacimiento,
    } = req.body;

    if (
      !nombre ||
      !apellido ||
      !cedula ||
      !telefono ||
      !email ||
      !password ||
      !provincia ||
      !fechaNacimiento
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Todos los campos son obligatorios." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const coordinadoraCreada = await User.create({
      nombre,
      apellido,
      cedula,
      telefono,
      email,
      passwordHash,
      provincia,
      fechaNacimiento,
      rol: "coordinadora",
    });

    const coordinadora = await User.findById(coordinadoraCreada._id).select(
      "-passwordHash",
    );

    res.status(201).json({ success: true, data: coordinadora });
  } catch (error) {
    next(error);
  }
}

// NUEVO (05/09/2026): POST /api/usuarios/conductor — admin crea la cuenta
// del chofer Y su perfil de Instructor (días/horarios) en un solo paso.
async function crearConductor(req, res, next) {
  try {
    const {
      nombre,
      apellido,
      cedula,
      telefono,
      email,
      password,
      provincia,
      fechaNacimiento,
      diasDisponibles,
    } = req.body;

    if (
      !nombre ||
      !apellido ||
      !cedula ||
      !telefono ||
      !email ||
      !password ||
      !provincia ||
      !fechaNacimiento
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Todos los campos son obligatorios." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const conductorCreado = await User.create({
      nombre,
      apellido,
      cedula,
      telefono,
      email,
      passwordHash,
      provincia,
      fechaNacimiento,
      rol: "conductor",
    });

    const instructor = await Instructor.create({
      userId: conductorCreado._id,
      diasDisponibles: diasDisponibles || [],
    });

    const conductor = await User.findById(conductorCreado._id).select(
      "-passwordHash",
    );

    res.status(201).json({
      success: true,
      data: { usuario: conductor, instructor },
    });
  } catch (error) {
    next(error);
  }
}

async function cambiarEstado(req, res, next) {
  try {
    const { activo } = req.body;
    if (activo === undefined) {
      return res
        .status(400)
        .json({ success: false, error: 'El campo "activo" es obligatorio.' });
    }

    const usuario = await User.findByIdAndUpdate(
      req.params.id,
      { activo },
      { new: true },
    ).select("-passwordHash");
    if (!usuario) {
      return res
        .status(404)
        .json({ success: false, error: "Usuaria no encontrada." });
    }
    res.json({ success: true, data: usuario });
  } catch (error) {
    next(error);
  }
}

async function cambiarRol(req, res, next) {
  try {
    const { rol } = req.body;
    // NUEVO: se agrega "conductor" a los roles válidos.
    if (!["estudiante", "coordinadora", "admin", "conductor"].includes(rol)) {
      return res.status(400).json({ success: false, error: "Rol inválido." });
    }

    const usuario = await User.findByIdAndUpdate(
      req.params.id,
      { rol },
      { new: true },
    ).select("-passwordHash");
    if (!usuario) {
      return res
        .status(404)
        .json({ success: false, error: "Usuaria no encontrada." });
    }
    res.json({ success: true, data: usuario });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarUsuarios,
  crearCoordinadora,
  crearConductor,
  cambiarEstado,
  cambiarRol,
};
