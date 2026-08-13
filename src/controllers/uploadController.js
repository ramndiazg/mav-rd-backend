const { subirBuffer } = require("../utils/cloudinaryUpload");

// POST /api/uploads/imagen — coordinadora/admin/estudiante sube una imagen
// (noticias, testimonios, portada de material, comprobante de pago)
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

// NUEVO: POST /api/uploads/pdf — coordinadora/admin sube un PDF de material
// de estudio. Espera multipart/form-data con el campo "pdf".
// Igual que con los diplomas, el recurso queda como resourceType 'raw' en
// Cloudinary, así que devolvemos también publicId — la entrega real al
// estudiante se hace con una URL firmada generada al momento (ver
// contenidoSesionController.js), no con la secure_url pública de aquí.
async function subirPDF(req, res, next) {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "No se recibió ningún archivo." });
    }

    const resultado = await subirBuffer(req.file.buffer, {
      folder: "mav-rd/contenido-sesion",
      resourceType: "raw",
      filename: `pdf-${Date.now()}`,
    });

    res.json({
      success: true,
      data: { url: resultado.secure_url, publicId: resultado.public_id },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { subirImagen, subirPDF };
