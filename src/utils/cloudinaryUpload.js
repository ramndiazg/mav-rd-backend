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

module.exports = { subirBuffer };
