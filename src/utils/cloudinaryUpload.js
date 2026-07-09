const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");

// Sube un buffer en memoria a Cloudinary sin necesidad de guardarlo en disco.
// resourceType 'raw' se usa para PDFs (no son imagen ni video).
//
// NOTA: por ahora el public_id se sube SIN extensión (como estaba
// originalmente) — para ver/descargar el PDF hay que agregar ".pdf" a mano
// al final de la URL. Se intentó agregar la extensión automáticamente, pero
// eso chocó con una restricción de entrega de PDF/ZIP en la cuenta de
// Cloudinary (401). Revertido hasta resolver esa configuración con calma.
function subirBuffer(buffer, { folder, resourceType = "raw", filename }) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType, public_id: filename },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

module.exports = { subirBuffer };
