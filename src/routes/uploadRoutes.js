const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { subirImagen } = require("../controllers/uploadController");
const { protegerRuta, permitirRoles } = require("../middleware/auth");

router.post(
  "/imagen",
  protegerRuta,
  permitirRoles("coordinadora", "admin"),
  upload.single("imagen"),
  subirImagen,
);

module.exports = router;
