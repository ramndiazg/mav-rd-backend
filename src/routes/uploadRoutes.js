const express = require("express");
const router = express.Router();
const { uploadImagen, uploadPDF } = require("../middleware/upload");
const { subirImagen, subirPDF } = require("../controllers/uploadController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

router.post(
  "/imagen",
  protegerRuta,
  // "estudiante" se agregó para que pueda subir su comprobante de pago
  // (voucher de depósito/transferencia) desde /inscripcion.
  permitirRoles("coordinadora", "admin", "estudiante"),
  uploadImagen.single("imagen"),
  subirImagen,
);

// NUEVO: material de estudio en PDF — solo coordinadora/admin
router.post(
  "/pdf",
  protegerRuta,
  permitirRoles("coordinadora", "admin"),
  uploadPDF.single("pdf"),
  subirPDF,
);

module.exports = router;
