const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

// Coloca el logo en src/assets/logo-mav-rd.png (mismo archivo que usa el
// frontend en public/logo-mav-rd.png). Si no existe, el diploma se genera
// igual, solo sin el logo — no rompe nada.
const RUTA_LOGO = path.join(__dirname, "../assets/logo-mav-rd.png");

// Centra texto horizontalmente con precisión real (mide el texto con la
// fuente exacta) en vez de estimar por cantidad de caracteres, que quedaba
// torcido con nombres muy cortos o muy largos.
function dibujarTextoCentrado(page, texto, y, font, size, color, anchoPagina) {
  const anchoTexto = font.widthOfTextAtSize(texto, size);
  page.drawText(texto, {
    x: (anchoPagina - anchoTexto) / 2,
    y,
    size,
    font,
    color,
  });
}

async function generarDiplomaPDF({
  nombreCompleto,
  cedula,
  fechaEmision,
  codigoVerificacion,
  sesiones = [], // [{ numero, titulo }] — opcional, para listar el detalle real
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // A4 horizontal (landscape)
  const { width, height } = page.getSize();

  const fontTitulo = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontTexto = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontItalica = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const azul = rgb(0x1b / 255, 0x3a / 255, 0x6b / 255);
  const rosa = rgb(0xd6 / 255, 0x33 / 255, 0x6c / 255);
  const gris = rgb(0.25, 0.25, 0.25);
  const grisClaro = rgb(0.55, 0.55, 0.55);
  const dorado = rgb(0.72, 0.58, 0.2);

  // --- Bordes decorativos (doble marco) ---
  page.drawRectangle({
    x: 18,
    y: 18,
    width: width - 36,
    height: height - 36,
    borderColor: azul,
    borderWidth: 2.5,
  });
  page.drawRectangle({
    x: 28,
    y: 28,
    width: width - 56,
    height: height - 56,
    borderColor: dorado,
    borderWidth: 1,
  });
  // Línea de acento bajo el encabezado
  page.drawLine({
    start: { x: width / 2 - 130, y: height - 132 },
    end: { x: width / 2 + 130, y: height - 132 },
    thickness: 1.5,
    color: dorado,
  });

  // --- Logo (si existe el archivo) ---
  let logoAlto = 0;
  if (fs.existsSync(RUTA_LOGO)) {
    const logoBytes = fs.readFileSync(RUTA_LOGO);
    const logoImg = await pdfDoc.embedPng(logoBytes);
    logoAlto = 70;
    const logoAncho = (logoImg.width / logoImg.height) * logoAlto;
    page.drawImage(logoImg, {
      x: (width - logoAncho) / 2,
      y: height - 60 - logoAlto,
      width: logoAncho,
      height: logoAlto,
    });
  }

  const yTitulo = height - (logoAlto ? 60 + logoAlto + 30 : 75);

  dibujarTextoCentrado(
    page,
    "MUJERES AL VOLANTE R.D.",
    yTitulo,
    fontTitulo,
    24,
    azul,
    width,
  );
  dibujarTextoCentrado(
    page,
    "CERTIFICADO DE FINALIZACIÓN DEL CURSO TEÓRICO-PRÁCTICO DE EDUCACIÓN VIAL",
    yTitulo - 24,
    fontTexto,
    11,
    grisClaro,
    width,
  );

  dibujarTextoCentrado(
    page,
    "Se otorga el presente certificado a",
    yTitulo - 65,
    fontItalica,
    13,
    gris,
    width,
  );

  dibujarTextoCentrado(
    page,
    nombreCompleto.toUpperCase(),
    yTitulo - 105,
    fontTitulo,
    28,
    rosa,
    width,
  );
  dibujarTextoCentrado(
    page,
    `Cédula: ${cedula}`,
    yTitulo - 128,
    fontTexto,
    12,
    gris,
    width,
  );

  dibujarTextoCentrado(
    page,
    "por haber completado satisfactoriamente las siguientes sesiones,",
    yTitulo - 160,
    fontTexto,
    12,
    gris,
    width,
  );
  dibujarTextoCentrado(
    page,
    "aprobando el examen correspondiente a cada una:",
    yTitulo - 178,
    fontTexto,
    12,
    gris,
    width,
  );

  // --- Detalle de las sesiones aprobadas (sin calificación, solo el nombre) ---
  const sesionesAMostrar =
    sesiones.length > 0
      ? sesiones
      : [
          { numero: 1, titulo: "Introducción a la Ley de Tránsito" },
          { numero: 2, titulo: "Señalización y normas viales" },
          { numero: 3, titulo: "Buenas prácticas de conducción" },
        ];

  let ySesiones = yTitulo - 215;
  sesionesAMostrar
    .sort((a, b) => a.numero - b.numero)
    .forEach((sesion) => {
      const texto = `-  Sesión ${sesion.numero}: ${sesion.titulo}`;
      dibujarTextoCentrado(page, texto, ySesiones, fontTexto, 12, azul, width);
      ySesiones -= 20;
    });

  const fechaTexto = new Date(fechaEmision).toLocaleDateString("es-DO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  dibujarTextoCentrado(
    page,
    `Emitido en Santo Domingo, República Dominicana, el ${fechaTexto}`,
    ySesiones - 20,
    fontTexto,
    11,
    gris,
    width,
  );

  // --- Firma ---
  page.drawLine({
    start: { x: width / 2 - 110, y: 110 },
    end: { x: width / 2 + 110, y: 110 },
    thickness: 1,
    color: gris,
  });
  dibujarTextoCentrado(
    page,
    "María Díaz — Fundadora, Mujeres al Volante R.D.",
    92,
    fontTexto,
    11,
    gris,
    width,
  );

  // --- Código de verificación (pie) ---
  page.drawText(`Código de verificación: ${codigoVerificacion}`, {
    x: 40,
    y: 40,
    size: 9,
    font: fontTexto,
    color: grisClaro,
  });
  page.drawText(
    "Verifica la autenticidad de este diploma en mujeresalvolanterd.com/verificar-diploma",
    {
      x: width - 380,
      y: 40,
      size: 9,
      font: fontTexto,
      color: grisClaro,
    },
  );

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function generarBalancePDF({
  mes,
  anio,
  totalEntradas,
  totalSalidas,
  saldo,
  desglosePorCategoria,
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 vertical

  const fontTitulo = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontTexto = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const azul = rgb(0x1b / 255, 0x3a / 255, 0x6b / 255);
  const rosa = rgb(0xd6 / 255, 0x33 / 255, 0x6c / 255);
  const gris = rgb(0.2, 0.2, 0.2);
  const verde = rgb(0x2f / 255, 0x9e / 255, 0x44 / 255);

  const { width, height } = page.getSize();
  const nombresMeses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  page.drawText("MUJERES AL VOLANTE R.D.", {
    x: 40,
    y: height - 60,
    size: 18,
    font: fontTitulo,
    color: azul,
  });
  page.drawText("Balance Contable Mensual", {
    x: 40,
    y: height - 85,
    size: 14,
    font: fontTexto,
    color: gris,
  });
  page.drawText(`${nombresMeses[mes - 1]} ${anio}`, {
    x: 40,
    y: height - 110,
    size: 22,
    font: fontTitulo,
    color: rosa,
  });

  let y = height - 160;
  const formatoRD = (n) =>
    `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

  page.drawText(`Total de entradas: ${formatoRD(totalEntradas)}`, {
    x: 40,
    y,
    size: 13,
    font: fontTexto,
    color: verde,
  });
  y -= 22;
  page.drawText(`Total de salidas: ${formatoRD(totalSalidas)}`, {
    x: 40,
    y,
    size: 13,
    font: fontTexto,
    color: rgb(0.8, 0.2, 0.2),
  });
  y -= 22;
  page.drawText(`Saldo del mes: ${formatoRD(saldo)}`, {
    x: 40,
    y,
    size: 15,
    font: fontTitulo,
    color: azul,
  });

  y -= 50;
  page.drawText("Desglose por categoría:", {
    x: 40,
    y,
    size: 13,
    font: fontTitulo,
    color: gris,
  });
  y -= 25;

  Object.entries(desglosePorCategoria).forEach(([categoria, montos]) => {
    page.drawText(
      `${categoria}: entradas ${formatoRD(montos.entradas)} / salidas ${formatoRD(montos.salidas)}`,
      { x: 55, y, size: 11, font: fontTexto, color: gris },
    );
    y -= 18;
  });

  page.drawText(`Generado el ${new Date().toLocaleDateString("es-DO")}`, {
    x: 40,
    y: 40,
    size: 9,
    font: fontTexto,
    color: gris,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = { generarDiplomaPDF, generarBalancePDF };
