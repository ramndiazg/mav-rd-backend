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

router.post("/registro", registro);
router.post("/login", login);
router.get("/perfil", protegerRuta, perfil);
router.patch("/cambiar-password", protegerRuta, cambiarPassword);

// Verificación de email
router.get("/verificar-email", verificarEmail); // público — viene del link del correo
router.post("/reenviar-verificacion", protegerRuta, reenviarVerificacion);

// NUEVO: recuperación de contraseña — ambas públicas (la persona no tiene sesión)
router.post("/olvide-password", olvidePassword);
router.post("/restablecer-password", restablecerPassword);

module.exports = router;
