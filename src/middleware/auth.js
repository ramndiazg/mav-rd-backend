const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verifica que el request traiga un JWT válido
async function protegerRuta(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, error: "No autorizado, falta token." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await User.findById(decoded.id).select("-passwordHash");
    if (!usuario || !usuario.activo) {
      return res
        .status(401)
        .json({ success: false, error: "Usuario no válido o inactivo." });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, error: "Token inválido o expirado." });
  }
}

// Restringe una ruta a ciertos roles. Uso: permitirRoles('admin', 'coordinadora')
function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        success: false,
        error: "No tienes permisos para realizar esta acción.",
      });
    }
    next();
  };
}

module.exports = { protegerRuta, permitirRoles };
