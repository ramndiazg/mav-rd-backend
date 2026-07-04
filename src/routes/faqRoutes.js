const express = require("express");
const router = express.Router();
const {
  listarFaqsPublico,
  listarFaqsAdmin,
  crearFaq,
  actualizarFaq,
  eliminarFaq,
} = require("../controllers/faqController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

router.get("/", listarFaqsPublico); // pública

router.get(
  "/admin",
  protegerRuta,
  permitirRoles("coordinadora", "admin"),
  listarFaqsAdmin,
);
router.post(
  "/",
  protegerRuta,
  permitirRoles("coordinadora", "admin"),
  crearFaq,
);
router.patch(
  "/:id",
  protegerRuta,
  permitirRoles("coordinadora", "admin"),
  actualizarFaq,
);
router.delete(
  "/:id",
  protegerRuta,
  permitirRoles("coordinadora", "admin"),
  eliminarFaq,
);

module.exports = router;
