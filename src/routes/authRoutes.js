const express = require("express");
const router = express.Router();
const {
  registro,
  login,
  perfil,
  cambiarPassword,
  verificarEmail,
  reenviarVerificacion,
  olvidePassword,
  restablecerPassword,
} = require("../controllers/authController");
const { protegerRuta } = require("../middleware/auth");
const {
  limitadorRegistro,
  limitadorLogin,
  limitadorCorreoTransaccional,
} = require("../middleware/rateLimiters");

// NUEVO (10/09/2026): rate limiting en los endpoints públicos sin
// autenticación — son el blanco natural de bots (registro masivo,
// fuerza bruta de login, bombardeo de correos de recuperación). Ver
// ARQUITECTURA_BACKEND.md, sección "Seguridad — ataque de registro
// masivo".
router.post("/registro", limitadorRegistro, registro);
router.post("/login", limitadorLogin, login);
router.get("/perfil", protegerRuta, perfil);
router.patch("/cambiar-password", protegerRuta, cambiarPassword);

// Verificación de email
router.get("/verificar-email", verificarEmail); // público — viene del link del correo
router.post(
  "/reenviar-verificacion",
  limitadorCorreoTransaccional,
  protegerRuta,
  reenviarVerificacion,
);

// NUEVO: recuperación de contraseña — ambas públicas (la persona no tiene sesión)
router.post("/olvide-password", limitadorCorreoTransaccional, olvidePassword);
router.post("/restablecer-password", restablecerPassword);

module.exports = router;
