const multer = require("multer");

// Guarda el archivo en memoria (buffer) en vez de disco — se sube directo a
// Cloudinary desde ahí.

// Imágenes: 5MB, solo image/* (sin cambios de comportamiento respecto a antes)
const uploadImagen = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Solo se permiten archivos de imagen."));
    }
    cb(null, true);
  },
});

// NUEVO: PDFs (material de estudio) — 15MB, solo application/pdf
const uploadPDF = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Solo se permiten archivos PDF."));
    }
    cb(null, true);
  },
});

module.exports = { uploadImagen, uploadPDF };
