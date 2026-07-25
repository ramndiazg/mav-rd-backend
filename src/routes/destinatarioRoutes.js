const express = require("express");
const router = express.Router();
const {
  listarDestinatarios,
  crearDestinatario,
  actualizarDestinatario,
  eliminarDestinatario,
} = require("../controllers/destinatarioController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

// Exclusivo de admin (ni siquiera coordinadora) — mismo patrón que Contabilidad
router.use(protegerRuta, permitirRoles("admin"));

router.get("/", listarDestinatarios);
router.post("/", crearDestinatario);
router.patch("/:id", actualizarDestinatario);
router.delete("/:id", eliminarDestinatario);

module.exports = router;
