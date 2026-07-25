const express = require("express");
const router = express.Router();
const {
  registro,
  login,
  perfil,
  cambiarPassword,
  verificarEmail,
  reenviarVerificacion,
} = require("../controllers/authController");
const { protegerRuta } = require("../middleware/auth");

router.post("/registro", registro);
router.post("/login", login);
router.get("/perfil", protegerRuta, perfil);
router.patch("/cambiar-password", protegerRuta, cambiarPassword);

// NUEVO: verificación de email
router.get("/verificar-email", verificarEmail); // público — viene del link del correo
router.post("/reenviar-verificacion", protegerRuta, reenviarVerificacion);

module.exports = router;
