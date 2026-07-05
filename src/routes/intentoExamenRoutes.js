const express = require("express");
const router = express.Router();
const {
  obtenerIntentoActivo,
  iniciarIntento,
  entregarIntento,
} = require("../controllers/intentoExamenController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

router.use(protegerRuta, permitirRoles("estudiante"));

router.get("/activo/:sesionId", obtenerIntentoActivo);
router.post("/:id/iniciar", iniciarIntento);
router.post("/:id/entregar", entregarIntento);

module.exports = router;
