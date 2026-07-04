const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

function generarToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// POST /api/auth/registro — cuenta gratuita de estudiante
async function registro(req, res, next) {
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

    const nuevoUsuarioCreado = await User.create({
      nombre,
      apellido,
      cedula,
      telefono,
      email,
      passwordHash,
      provincia,
      fechaNacimiento,
      rol: "estudiante",
    });

    // Se vuelve a consultar excluyendo passwordHash antes de responder al frontend
    const nuevoUsuario = await User.findById(nuevoUsuarioCreado._id).select(
      "-passwordHash",
    );

    const token = generarToken(nuevoUsuario._id);

    res
      .status(201)
      .json({ success: true, data: { usuario: nuevoUsuario, token } });
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email y contraseña son obligatorios.",
      });
    }

    const usuario = await User.findOne({ email: email.toLowerCase() });
    if (!usuario) {
      return res
        .status(401)
        .json({ success: false, error: "Credenciales inválidas." });
    }

    const passwordValido = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValido) {
      return res
        .status(401)
        .json({ success: false, error: "Credenciales inválidas." });
    }

    if (!usuario.activo) {
      return res
        .status(403)
        .json({ success: false, error: "Esta cuenta está desactivada." });
    }

    const token = generarToken(usuario._id);

    // Se vuelve a consultar excluyendo passwordHash antes de responder al frontend.
    // (Asignar `usuario.passwordHash = undefined` no es suficiente: Mongoose puede
    // seguir serializando el campo al convertir el documento a JSON.)
    const usuarioSinHash = await User.findById(usuario._id).select(
      "-passwordHash",
    );

    res.json({ success: true, data: { usuario: usuarioSinHash, token } });
  } catch (error) {
    next(error);
  }
}

// GET /api/auth/perfil — requiere estar autenticada
async function perfil(req, res) {
  // req.usuario ya viene sin passwordHash (excluido en el middleware protegerRuta)
  res.json({ success: true, data: { usuario: req.usuario } });
}

module.exports = { registro, login, perfil };
