const express = require("express");
const router = express.Router();
const {
  obtenerConfiguracion,
  actualizarConfiguracion,
} = require("../controllers/configuracionController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

router.get("/", obtenerConfiguracion); // pública, el frontend necesita ver precios
router.patch(
  "/:clave",
  protegerRuta,
  permitirRoles("admin"),
  actualizarConfiguracion,
);

module.exports = router;
