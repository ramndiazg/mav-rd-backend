const multer = require("multer");

// Guarda el archivo en memoria (buffer) en vez de disco — se sube directo a
// Cloudinary desde ahí. Límite de 5MB, solo imágenes.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Solo se permiten archivos de imagen."));
    }
    cb(null, true);
  },
});

module.exports = upload;
