const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const Grupo = require("../models/Grupo");
const {
  enviarCorreoVerificacion,
  enviarCorreoRecuperacion,
} = require("../utils/notificaciones");
const { verificarCaptcha } = require("../utils/captcha");
const {
  verificarYNotificarBalancePendiente,
} = require("../utils/recordatorios");

function generarToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function generarTokenAleatorio() {
  return crypto.randomBytes(32).toString("hex");
}

// NUEVO (08/09/2026): agrega grupoTipo ("colegio" | "empresa" | null) al
// objeto de usuario que se manda al frontend, para que pueda decidir sin
// un segundo fetch si le toca TestPsicologico o
// InformacionComplementariaEscolar, y si le aplica el gate de práctica.
// Recibe un documento de Mongoose (con .toObject()) y devuelve un objeto
// plano listo para responder como JSON.
async function conGrupoTipo(usuarioDoc) {
  const usuarioPlano = usuarioDoc.toObject ? usuarioDoc.toObject() : usuarioDoc;

  if (!usuarioPlano.grupoId) {
    return { ...usuarioPlano, grupoTipo: null };
  }

  const grupo = await Grupo.findById(usuarioPlano.grupoId).select("tipo");
  return { ...usuarioPlano, grupoTipo: grupo?.tipo || null };
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
      captchaToken,
      // NUEVO (10/09/2026): honeypot — campo invisible para una persona
      // real (oculto por CSS en el frontend, ver registro/page.tsx), que
      // los bots simples suelen rellenar igual porque no ejecutan CSS,
      // solo ven el HTML del formulario. Si viene con contenido, es un
      // bot — se responde 201 "éxito" falso (no error) para no darle al
      // script ninguna pista de qué lo detectó, pero sin crear nada.
      sitioWeb,
    } = req.body;

    if (sitioWeb) {
      console.warn(
        `Registro bloqueado por honeypot — IP ${req.ip}, email: ${email || "(vacío)"}`,
      );
      return res
        .status(201)
        .json({ success: true, data: { usuario: null, token: null } });
    }

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

    const captchaValido = await verificarCaptcha(captchaToken, req.ip);
    if (!captchaValido) {
      return res.status(400).json({
        success: false,
        error: "No pudimos verificar que eres una persona. Intenta de nuevo.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const tokenVerificacionEmail = generarTokenAleatorio();
    const tokenVerificacionExpira = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

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
      tokenVerificacionEmail,
      tokenVerificacionExpira,
    });

    // Sin await a propósito: no debe demorar ni arriesgar la respuesta del
    // registro si Resend falla — el error, si lo hay, se registra dentro
    // de enviarCorreoVerificacion.
    enviarCorreoVerificacion({
      to: nuevoUsuarioCreado.email,
      nombre: nuevoUsuarioCreado.nombre,
      token: tokenVerificacionEmail,
    });

    const nuevoUsuario = await User.findById(nuevoUsuarioCreado._id).select(
      "-passwordHash",
    );

    const token = generarToken(nuevoUsuario._id);

    // NUEVO (08/09/2026): grupoId siempre es null justo después de un
    // autoregistro (nadie se autoregistra ya dentro de un Grupo), pero se
    // usa conGrupoTipo() igual por consistencia con login/perfil.
    res.status(201).json({
      success: true,
      data: { usuario: await conGrupoTipo(nuevoUsuario), token },
    });
  } catch (error) {
    // NUEVO (10/09/2026): mensaje genérico para el duplicado de
    // email/cédula en ESTE endpoint específico (público, sin login) —
    // el mensaje original ("ya existe una cuenta con ese email") permite
    // a cualquiera comprobar, probando uno por uno, qué correos o
    // cédulas ya están registrados en el sistema. El resto de los flujos
    // (creación de usuarios por admin, etc.) siguen usando el mensaje
    // específico de errorHandler.js — ahí quien pregunta ya inició
    // sesión, no es un riesgo de enumeración anónima.
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error:
          "No se pudo crear la cuenta con esos datos. Verifica la información e intenta de nuevo.",
      });
    }
    next(error);
  }
}

// GET /api/auth/verificar-email?token=... — público (viene de un link de correo)
async function verificarEmail(req, res, next) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, error: "Falta el token." });
    }

    const usuario = await User.findOne({
      tokenVerificacionEmail: token,
      tokenVerificacionExpira: { $gt: new Date() },
    });

    if (!usuario) {
      return res.status(400).json({
        success: false,
        error: "El link de verificación es inválido o ya expiró.",
      });
    }

    usuario.emailVerificado = true;
    usuario.tokenVerificacionEmail = null;
    usuario.tokenVerificacionExpira = null;
    await usuario.save();

    res.json({ success: true, data: { mensaje: "Correo verificado." } });
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/reenviar-verificacion — requiere estar logueada
async function reenviarVerificacion(req, res, next) {
  try {
    if (req.usuario.emailVerificado) {
      return res
        .status(409)
        .json({ success: false, error: "Tu correo ya está verificado." });
    }

    const usuario = await User.findById(req.usuario._id);
    usuario.tokenVerificacionEmail = generarTokenAleatorio();
    usuario.tokenVerificacionExpira = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    );
    await usuario.save();

    await enviarCorreoVerificacion({
      to: usuario.email,
      nombre: usuario.nombre,
      token: usuario.tokenVerificacionEmail,
    });

    res.json({
      success: true,
      data: { mensaje: "Correo de verificación reenviado." },
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/olvide-password — público — { email }
async function olvidePassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, error: "El correo es obligatorio." });
    }

    const usuario = await User.findOne({ email: email.toLowerCase() });

    // Por seguridad, respondemos éxito igual exista o no la cuenta —
    // así no se puede usar este endpoint para averiguar qué correos están
    // registrados en el sistema.
    if (usuario) {
      usuario.tokenRecuperacion = generarTokenAleatorio();
      usuario.tokenRecuperacionExpira = new Date(Date.now() + 60 * 60 * 1000); // 1h
      await usuario.save();

      await enviarCorreoRecuperacion({
        to: usuario.email,
        nombre: usuario.nombre,
        token: usuario.tokenRecuperacion,
      });
    }

    res.json({
      success: true,
      data: {
        mensaje:
          "Si ese correo está registrado, te enviamos un link para restablecer tu contraseña.",
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/restablecer-password — público — { token, passwordNueva }
async function restablecerPassword(req, res, next) {
  try {
    const { token, passwordNueva } = req.body;

    if (!token || !passwordNueva) {
      return res.status(400).json({
        success: false,
        error: "token y passwordNueva son obligatorios.",
      });
    }

    if (passwordNueva.length < 8) {
      return res.status(400).json({
        success: false,
        error: "La nueva contraseña debe tener al menos 8 caracteres.",
      });
    }

    const usuario = await User.findOne({
      tokenRecuperacion: token,
      tokenRecuperacionExpira: { $gt: new Date() },
    });

    if (!usuario) {
      return res.status(400).json({
        success: false,
        error: "El link de recuperación es inválido o ya expiró.",
      });
    }

    usuario.passwordHash = await bcrypt.hash(passwordNueva, 10);
    usuario.tokenRecuperacion = null;
    usuario.tokenRecuperacionExpira = null;
    await usuario.save();

    res.json({ success: true, data: { mensaje: "Contraseña actualizada." } });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/auth/cambiar-password — cualquier usuaria autenticada
async function cambiarPassword(req, res, next) {
  try {
    const { passwordActual, passwordNueva } = req.body;

    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({
        success: false,
        error: "passwordActual y passwordNueva son obligatorios.",
      });
    }

    if (passwordNueva.length < 8) {
      return res.status(400).json({
        success: false,
        error: "La nueva contraseña debe tener al menos 8 caracteres.",
      });
    }

    const usuario = await User.findById(req.usuario._id).select(
      "+passwordHash",
    );

    const coincide = await bcrypt.compare(passwordActual, usuario.passwordHash);
    if (!coincide) {
      return res.status(401).json({
        success: false,
        error: "La contraseña actual no es correcta.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    usuario.passwordHash = await bcrypt.hash(passwordNueva, salt);
    await usuario.save();

    res.json({ success: true, data: { mensaje: "Contraseña actualizada." } });
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

    const usuarioSinHash = await User.findById(usuario._id).select(
      "-passwordHash",
    );

    res.json({
      success: true,
      data: { usuario: await conGrupoTipo(usuarioSinHash), token },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/auth/perfil — requiere estar autenticada
async function perfil(req, res) {
  // Sin await a propósito: no debe demorar la respuesta del perfil.
  if (req.usuario.rol === "admin") {
    verificarYNotificarBalancePendiente();
  }
  res.json({
    success: true,
    data: { usuario: await conGrupoTipo(req.usuario) },
  });
}

module.exports = {
  registro,
  login,
  perfil,
  cambiarPassword,
  verificarEmail,
  reenviarVerificacion,
  olvidePassword,
  restablecerPassword,
};
