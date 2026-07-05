const express = require("express");
const router = express.Router();
const {
  registro,
  login,
  perfil,
  cambiarPassword,
} = require("../controllers/authController");
const { protegerRuta } = require("../middleware/auth");

router.post("/registro", registro);
router.post("/login", login);
router.get("/perfil", protegerRuta, perfil);
router.patch("/cambiar-password", protegerRuta, cambiarPassword);

module.exports = router;
