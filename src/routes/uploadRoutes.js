const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { subirImagen } = require("../controllers/uploadController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

router.post(
  "/imagen",
  protegerRuta,
  // "estudiante" se agregó para que pueda subir su comprobante de pago
  // (voucher de depósito/transferencia) desde /inscripcion.
  permitirRoles("coordinadora", "admin", "estudiante"),
  upload.single("imagen"),
  subirImagen,
);

module.exports = router;
