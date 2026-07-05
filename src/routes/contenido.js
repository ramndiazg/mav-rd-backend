const express = require("express");
const router = express.Router();
const {
  listarContenido,
  obtenerContenido,
  crearContenido,
  editarContenido,
} = require("../controllers/contenidoController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

// Lectura pública — cualquier página del sitio puede pedir estos bloques
router.get("/", listarContenido);
router.get("/:clave", obtenerContenido);

// Escritura exclusiva de la fundadora (admin)
router.post("/", protegerRuta, permitirRoles("admin"), crearContenido);
router.patch("/:clave", protegerRuta, permitirRoles("admin"), editarContenido);

module.exports = router;
