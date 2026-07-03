const { subirBuffer } = require("../utils/cloudinaryUpload");

// POST /api/uploads/imagen — coordinadora/admin sube una imagen (noticias, testimonios)
// Espera multipart/form-data con el campo "imagen"
async function subirImagen(req, res, next) {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "No se recibió ningún archivo." });
    }

    const resultado = await subirBuffer(req.file.buffer, {
      folder: "mav-rd/imagenes",
      resourceType: "image",
      filename: `img-${Date.now()}`,
    });

    res.json({ success: true, data: { url: resultado.secure_url } });
  } catch (error) {
    next(error);
  }
}

module.exports = { subirImagen };
