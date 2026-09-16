const express = require("express");
const router = express.Router();
const {
  listarTodos,
  agregar,
  actualizarEstado,
  consultarCobertura,
} = require("../controllers/municipioPracticaController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

// Nota de orden: "/cobertura" es GET con un solo segmento, "/:id" es PATCH
// con un solo segmento — métodos distintos, sin colisión real, pero se
// deja "/cobertura" primero por claridad (mismo criterio que planRoutes.js).
router.get("/cobertura", consultarCobertura); // pública
router.get("/", protegerRuta, permitirRoles("admin"), listarTodos);
router.post("/", protegerRuta, permitirRoles("admin"), agregar);
router.patch("/:id", protegerRuta, permitirRoles("admin"), actualizarEstado);

module.exports = router;
