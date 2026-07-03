const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

// Genera el PDF del diploma en memoria y devuelve un Buffer.
// Diseño simple en esta primera versión — se puede mejorar visualmente
// más adelante (agregar logo, firma escaneada, bordes decorativos, etc.)
// una vez tengamos los assets de marca definitivos.
async function generarDiplomaPDF({
  nombreCompleto,
  cedula,
  fechaEmision,
  codigoVerificacion,
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // A4 horizontal (landscape)

  const fontTitulo = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontTexto = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const azul = rgb(0x1b / 255, 0x3a / 255, 0x6b / 255);
  const rosa = rgb(0xd6 / 255, 0x33 / 255, 0x6c / 255);
  const gris = rgb(0.2, 0.2, 0.2);

  const { width, height } = page.getSize();

  // Borde decorativo simple
  page.drawRectangle({
    x: 20,
    y: 20,
    width: width - 40,
    height: height - 40,
    borderColor: azul,
    borderWidth: 3,
  });

  page.drawText("MUJERES AL VOLANTE R.D.", {
    x: width / 2 - 150,
    y: height - 90,
    size: 22,
    font: fontTitulo,
    color: azul,
  });

  page.drawText("Certifica que", {
    x: width / 2 - 55,
    y: height - 180,
    size: 14,
    font: fontTexto,
    color: gris,
  });

  page.drawText(nombreCompleto, {
    x: width / 2 - nombreCompleto.length * 7,
    y: height - 230,
    size: 26,
    font: fontTitulo,
    color: rosa,
  });

  page.drawText(`Cédula: ${cedula}`, {
    x: width / 2 - 60,
    y: height - 265,
    size: 12,
    font: fontTexto,
    color: gris,
  });

  page.drawText(
    "Ha completado satisfactoriamente el curso teórico de educación vial,",
    {
      x: width / 2 - 230,
      y: height - 310,
      size: 13,
      font: fontTexto,
      color: gris,
    },
  );
  page.drawText("aprobando las 3 sesiones y sus respectivos exámenes.", {
    x: width / 2 - 175,
    y: height - 330,
    size: 13,
    font: fontTexto,
    color: gris,
  });

  const fechaTexto = new Date(fechaEmision).toLocaleDateString("es-DO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  page.drawText(`Fecha de emisión: ${fechaTexto}`, {
    x: width / 2 - 90,
    y: height - 400,
    size: 12,
    font: fontTexto,
    color: gris,
  });

  page.drawText("_______________________________", {
    x: width / 2 - 110,
    y: 120,
    size: 12,
    font: fontTexto,
    color: gris,
  });
  page.drawText("María Díaz — Fundadora", {
    x: width / 2 - 80,
    y: 100,
    size: 11,
    font: fontTexto,
    color: gris,
  });

  page.drawText(`Código de verificación: ${codigoVerificacion}`, {
    x: 40,
    y: 40,
    size: 9,
    font: fontTexto,
    color: gris,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = { generarDiplomaPDF };
