const express = require("express");
const router = express.Router();
const { registro, login, perfil } = require("../controllers/authController");
const { protegerRuta } = require("../middleware/auth");

router.post("/registro", registro);
router.post("/login", login);
router.get("/perfil", protegerRuta, perfil);

module.exports = router;
