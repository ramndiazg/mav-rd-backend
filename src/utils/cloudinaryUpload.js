const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");

// Sube un buffer en memoria a Cloudinary sin necesidad de guardarlo en disco.
// resourceType 'raw' se usa para PDFs (no son imagen ni video).
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

// NUEVO: genera una URL de descarga FIRMADA (autenticada con las
// credenciales de la cuenta) para un recurso "raw" como un PDF.
//
// Por qué existe esto: Cloudinary bloquea por defecto la entrega PÚBLICA
// (sin firmar) de archivos PDF/ZIP como medida de seguridad — por eso
// `urlPDF` (la URL pública guardada en cada Diploma) puede dar 401 al
// abrirla directo en el navegador. Una URL FIRMADA es distinta: prueba
// que quien la generó tiene las credenciales de la cuenta, así que
// Cloudinary sí la entrega, sin necesidad de cambiar ninguna
// configuración en su dashboard. La firma incluye una expiración corta
// (por defecto la de la librería), así que se genera de nuevo cada vez
// que se pide la descarga, no se guarda una sola vez.
function generarUrlDescargaFirmada(
  publicId,
  formato = "pdf",
  resourceType = "raw",
) {
  return cloudinary.utils.private_download_url(publicId, formato, {
    resource_type: resourceType,
    type: "upload",
  });
}

module.exports = { subirBuffer, generarUrlDescargaFirmada };
