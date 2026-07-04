const express = require("express");
const router = express.Router();
const {
  listarTestimoniosPublico,
  listarTestimoniosAdmin,
  crearTestimonio,
  actualizarTestimonio,
  eliminarTestimonio,
} = require("../controllers/testimonioController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

router.get("/", listarTestimoniosPublico); // pública

router.get(
  "/admin",
  protegerRuta,
  permitirRoles("coordinadora", "admin"),
  listarTestimoniosAdmin,
);
router.post(
  "/",
  protegerRuta,
  permitirRoles("coordinadora", "admin"),
  crearTestimonio,
);
router.patch(
  "/:id",
  protegerRuta,
  permitirRoles("coordinadora", "admin"),
  actualizarTestimonio,
);
router.delete(
  "/:id",
  protegerRuta,
  permitirRoles("coordinadora", "admin"),
  eliminarTestimonio,
);

module.exports = router;
