const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");

// Sube un buffer en memoria a Cloudinary sin necesidad de guardarlo en disco.
// resourceType 'raw' se usa para PDFs (no son imagen ni video).
//
// CORRECCIÓN: Cloudinary usa el public_id tal cual para construir la URL final.
// Si no incluye la extensión (ej. "diploma-MAV-2026-000123" en vez de
// "diploma-MAV-2026-000123.pdf"), el archivo queda servido sin ".pdf" al
// final de la URL — el navegador no puede reconocer que es un PDF al
// descargarlo y lo guarda como un archivo genérico ("file") en vez de PDF.
// Por eso ahora se agrega automáticamente la extensión cuando corresponde.
function subirBuffer(
  buffer,
  { folder, resourceType = "raw", filename, formato = "pdf" },
) {
  return new Promise((resolve, reject) => {
    const tieneExtension = /\.[a-zA-Z0-9]+$/.test(filename);
    const publicId =
      resourceType === "raw" && formato && !tieneExtension
        ? `${filename}.${formato}`
        : filename;

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType, public_id: publicId },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

module.exports = { subirBuffer };
