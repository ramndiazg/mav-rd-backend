const express = require("express");
const router = express.Router();
const {
  listarNoticias,
  obtenerNoticia,
  crearNoticia,
  actualizarNoticia,
  eliminarNoticia,
  toggleLike,
  agregarComentario,
  eliminarComentario,
} = require("../controllers/noticiaController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

// Públicas
router.get("/", listarNoticias);
router.get("/:id", obtenerNoticia);

// Coordinadora/admin — gestión de contenido
router.post(
  "/",
  protegerRuta,
  permitirRoles("coordinadora", "admin"),
  crearNoticia,
);
router.patch(
  "/:id",
  protegerRuta,
  permitirRoles("coordinadora", "admin"),
  actualizarNoticia,
);
router.delete(
  "/:id",
  protegerRuta,
  permitirRoles("coordinadora", "admin"),
  eliminarNoticia,
);
router.delete(
  "/:id/comentarios/:comentarioId",
  protegerRuta,
  permitirRoles("coordinadora", "admin"),
  eliminarComentario,
);

// Cualquier usuaria autenticada (estudiante, coordinadora o admin)
router.post(
  "/:id/like",
  protegerRuta,
  permitirRoles("estudiante", "coordinadora", "admin"),
  toggleLike,
);
router.post(
  "/:id/comentarios",
  protegerRuta,
  permitirRoles("estudiante", "coordinadora", "admin"),
  agregarComentario,
);

module.exports = router;
