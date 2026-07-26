const express = require("express");
const router = express.Router();
const {
  crearMovimiento,
  listarMovimientos,
  generarBalance,
  listarBalances,
  obtenerBalance,
  descargarBalance,
} = require("../controllers/contabilidadController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

// Este endpoint verifica el token manualmente (acepta ?token= en la URL,
// necesario para un <a href> de descarga que no puede mandar headers) — por
// eso va ANTES del router.use() de abajo, que exige el header Authorization.
router.get("/balances/:id/descargar", descargarBalance);

// El resto de contabilidad es exclusivo de la fundadora (admin)
router.use(protegerRuta, permitirRoles("admin"));

router.post("/movimientos", crearMovimiento);
router.get("/movimientos", listarMovimientos);

router.post("/balances/generar", generarBalance);
router.get("/balances", listarBalances);
router.get("/balances/:id", obtenerBalance);

module.exports = router;
