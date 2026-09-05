const express = require("express");
const router = express.Router();
const {
  listarPendientes,
  aprobarPractica,
} = require("../controllers/practicaController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

router.use(protegerRuta, permitirRoles("conductor", "admin"));

router.get("/pendientes", listarPendientes);
router.post("/:userId/aprobar", aprobarPractica);

module.exports = router;
