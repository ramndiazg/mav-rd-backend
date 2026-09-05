const express = require("express");
const router = express.Router();
const {
  listarDestinatariosPractica,
  crearDestinatarioPractica,
  actualizarDestinatarioPractica,
  eliminarDestinatarioPractica,
} = require("../controllers/destinatarioPracticaController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

// Exclusivo de admin — lista separada de /api/destinatarios, solo para
// avisos de estudiantes listas para la parte práctica.
router.use(protegerRuta, permitirRoles("admin"));

router.get("/", listarDestinatariosPractica);
router.post("/", crearDestinatarioPractica);
router.patch("/:id", actualizarDestinatarioPractica);
router.delete("/:id", eliminarDestinatarioPractica);

module.exports = router;
