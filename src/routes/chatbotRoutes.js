const express = require("express");
const router = express.Router();
const { preguntar } = require("../controllers/chatbotController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

// Exclusivo de admin — mismo patrón que destinatarioRoutes.js y
// contabilidadRoutes.js. Ni siquiera coordinadora tiene acceso: este
// chatbot puede revelar cifras de negocio (balances, cantidad de
// estudiantes por provincia, etc.) que son solo de la fundadora.
router.use(protegerRuta, permitirRoles("admin"));

router.post("/preguntar", preguntar);

module.exports = router;
