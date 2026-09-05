const express = require("express");
const router = express.Router();
const {
  listarInstructores,
  listarInstructoresActivos,
  actualizarInstructor,
} = require("../controllers/instructorController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

router.get("/", protegerRuta, permitirRoles("admin"), listarInstructores);

router.get(
  "/activos",
  protegerRuta,
  permitirRoles("estudiante", "conductor", "coordinadora", "admin"),
  listarInstructoresActivos,
);

router.patch(
  "/:id",
  protegerRuta,
  permitirRoles("admin"),
  actualizarInstructor,
);

module.exports = router;
