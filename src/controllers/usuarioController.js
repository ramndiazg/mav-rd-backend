const bcrypt = require("bcryptjs");
const User = require("../models/User");

// GET /api/usuarios — coordinadora/admin: buscar usuarias por rol/nombre/cedula/email
// Query params: rol, search, activo
async function listarUsuarios(req, res, next) {
  try {
    const { rol, search, activo } = req.query;
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

    const usuarios = await User.find(filtro)
      .select("-passwordHash")
      .limit(50)
      .sort({ createdAt: -1 });
    res.json({ success: true, data: usuarios });
  } catch (error) {
    next(error);
  }
}

// POST /api/usuarios/coordinadora — admin crea directamente una cuenta de coordinadora
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

    // Se vuelve a consultar excluyendo passwordHash antes de responder al frontend
    const coordinadora = await User.findById(coordinadoraCreada._id).select(
      "-passwordHash",
    );

    res.status(201).json({ success: true, data: coordinadora });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/usuarios/:id/estado — admin activa/desactiva una cuenta
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

// PATCH /api/usuarios/:id/rol — admin cambia el rol de una cuenta (caso excepcional)
async function cambiarRol(req, res, next) {
  try {
    const { rol } = req.body;
    if (!["estudiante", "coordinadora", "admin"].includes(rol)) {
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
  cambiarEstado,
  cambiarRol,
};
