const express = require("express");
const router = express.Router();
const {
  crearMovimiento,
  listarMovimientos,
  generarBalance,
  listarBalances,
  obtenerBalance,
} = require("../controllers/contabilidadController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

// Toda la contabilidad es exclusiva de la fundadora (admin) — la coordinadora no entra aquí
router.use(protegerRuta, permitirRoles("admin"));

router.post("/movimientos", crearMovimiento);
router.get("/movimientos", listarMovimientos);

router.post("/balances/generar", generarBalance);
router.get("/balances", listarBalances);
router.get("/balances/:id", obtenerBalance);

module.exports = router;
