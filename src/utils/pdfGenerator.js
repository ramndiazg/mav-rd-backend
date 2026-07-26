const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

// Coloca el logo en src/assets/logo-mav-rd.png (mismo archivo que usa el
// frontend en public/logo-mav-rd.png). Si no existe, el diploma se genera
// igual, solo sin el logo — no rompe nada, pero revisa que el archivo esté
// ahí si esperas verlo.
const RUTA_LOGO = path.join(__dirname, "../assets/logo-mav-rd.png");

// Centra texto horizontalmente con precisión real (mide el texto con la
// fuente exacta) en vez de estimar por cantidad de caracteres.
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

// Centra texto respecto a un punto X arbitrario (para texto dentro del sello,
// que no está centrado en la página completa).
function dibujarTextoCentradoEnX(page, texto, xCentro, y, font, size, color) {
  const anchoTexto = font.widthOfTextAtSize(texto, size);
  page.drawText(texto, { x: xCentro - anchoTexto / 2, y, size, font, color });
}

// Quita el prefijo "Sesión N: " del título si ya viene incluido (nuestras
// sesiones en la base se llaman "Sesión 1: Introducción a la Ley de
// Tránsito", etc.) — evita que el diploma diga "Sesión 1: Sesión 1: ...".
function tituloSinPrefijo(titulo, numero) {
  return titulo.replace(new RegExp(`^Sesión\\s*${numero}\\s*:\\s*`, "i"), "");
}

async function generarDiplomaPDF({
  nombreCompleto,
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

  // --- Logo (si existe el archivo) ---
  let logoAlto = 0;
  if (fs.existsSync(RUTA_LOGO)) {
    const logoBytes = fs.readFileSync(RUTA_LOGO);
    const logoImg = await pdfDoc.embedPng(logoBytes);
    logoAlto = 70;
    const logoAncho = (logoImg.width / logoImg.height) * logoAlto;
    page.drawImage(logoImg, {
      x: (width - logoAncho) / 2,
      y: height - 55 - logoAlto,
      width: logoAncho,
      height: logoAlto,
    });
  }

  // --- Todo el layout se calcula desde este único punto de referencia ---
  // así nada se desalinea si el logo existe o no.
  const yTitulo = height - (logoAlto ? 55 + logoAlto + 35 : 80);

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
    yTitulo - 22,
    fontTexto,
    11,
    grisClaro,
    width,
  );

  page.drawLine({
    start: { x: width / 2 - 130, y: yTitulo - 38 },
    end: { x: width / 2 + 130, y: yTitulo - 38 },
    thickness: 1.2,
    color: dorado,
  });

  dibujarTextoCentrado(
    page,
    "Se otorga el presente certificado a",
    yTitulo - 62,
    fontItalica,
    13,
    gris,
    width,
  );
  dibujarTextoCentrado(
    page,
    nombreCompleto.toUpperCase(),
    yTitulo - 102,
    fontTitulo,
    28,
    rosa,
    width,
  );

  dibujarTextoCentrado(
    page,
    "por haber completado satisfactoriamente las siguientes sesiones,",
    yTitulo - 135,
    fontTexto,
    12,
    gris,
    width,
  );
  dibujarTextoCentrado(
    page,
    "aprobando el examen correspondiente a cada una:",
    yTitulo - 153,
    fontTexto,
    12,
    gris,
    width,
  );

  const sesionesAMostrar =
    sesiones.length > 0
      ? sesiones
      : [
          { numero: 1, titulo: "Introducción a la Ley de Tránsito" },
          { numero: 2, titulo: "Señalización y normas viales" },
          { numero: 3, titulo: "Buenas prácticas de conducción" },
        ];

  let yLinea = yTitulo - 190;
  sesionesAMostrar
    .sort((a, b) => a.numero - b.numero)
    .forEach((sesion) => {
      const texto = `-  ${tituloSinPrefijo(sesion.titulo, sesion.numero)}`;
      dibujarTextoCentrado(page, texto, yLinea, fontTexto, 12, azul, width);
      yLinea -= 20;
    });

  yLinea -= 10;
  dibujarTextoCentrado(
    page,
    "Asimismo, completó de forma presencial el curso práctico de manejo.",
    yLinea,
    fontItalica,
    12,
    gris,
    width,
  );

  const fechaTexto = new Date(fechaEmision).toLocaleDateString("es-DO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  yLinea -= 28;
  dibujarTextoCentrado(
    page,
    `Emitido en Santo Domingo, República Dominicana, el ${fechaTexto}`,
    yLinea,
    fontTexto,
    11,
    gris,
    width,
  );

  const yFirmaLinea = 118;
  page.drawLine({
    start: { x: width / 2 - 110, y: yFirmaLinea },
    end: { x: width / 2 + 110, y: yFirmaLinea },
    thickness: 1,
    color: gris,
  });
  dibujarTextoCentrado(
    page,
    "María Díaz Guzmán",
    yFirmaLinea - 16,
    fontTitulo,
    12,
    gris,
    width,
  );
  dibujarTextoCentrado(
    page,
    "Fundadora, Mujeres al Volante R.D.",
    yFirmaLinea - 32,
    fontTexto,
    10,
    grisClaro,
    width,
  );

  const selloX = width - 130;
  const selloY = 145;
  page.drawEllipse({
    x: selloX,
    y: selloY,
    xScale: 46,
    yScale: 46,
    borderColor: dorado,
    borderWidth: 2,
  });
  page.drawEllipse({
    x: selloX,
    y: selloY,
    xScale: 39,
    yScale: 39,
    borderColor: azul,
    borderWidth: 1,
  });
  dibujarTextoCentradoEnX(
    page,
    "CURSO",
    selloX,
    selloY + 15,
    fontTitulo,
    9,
    azul,
  );
  dibujarTextoCentradoEnX(
    page,
    "APROBADO",
    selloX,
    selloY + 3,
    fontTitulo,
    9,
    azul,
  );
  page.drawSvgPath(
    "M 0,6 L 1.41,1.94 L 5.71,1.85 L 2.28,-0.74 L 3.53,-4.85 L 0,-2.4 L -3.53,-4.85 L -2.28,-0.74 L -5.71,1.85 L -1.41,1.94 Z",
    { x: selloX, y: selloY - 8, color: dorado, scale: 1 },
  );
  dibujarTextoCentradoEnX(
    page,
    "MAV·RD",
    selloX,
    selloY - 24,
    fontTexto,
    8,
    dorado,
  );

  page.drawText(`Código de verificación: ${codigoVerificacion}`, {
    x: 40,
    y: 40,
    size: 9,
    font: fontTexto,
    color: grisClaro,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// --- Balance mensual: rediseño "Opción A" (tarjetas de totales + tabla) ---
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
  const { width, height } = page.getSize();

  const fontTitulo = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontTexto = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const azul = rgb(0x1b / 255, 0x3a / 255, 0x6b / 255);
  const azulClaro = rgb(0x4a / 255, 0x7f / 255, 0xc9 / 255);
  const rosa = rgb(0xd6 / 255, 0x33 / 255, 0x6c / 255);
  const gris = rgb(0.2, 0.2, 0.2);
  const grisClaro = rgb(0.55, 0.55, 0.55);
  const verde = rgb(0x2f / 255, 0x9e / 255, 0x44 / 255);
  const rojo = rgb(0.75, 0.2, 0.2);
  const fondoClaro = rgb(0.97, 0.97, 0.98);
  const fondoFilaAlterna = rgb(0.95, 0.96, 0.98);

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

  const formatoRD = (n) =>
    `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

  const margen = 40;

  // --- Encabezado con logo ---
  let yActual = height - 50;
  if (fs.existsSync(RUTA_LOGO)) {
    const logoBytes = fs.readFileSync(RUTA_LOGO);
    const logoImg = await pdfDoc.embedPng(logoBytes);
    const logoAlto = 45;
    const logoAncho = (logoImg.width / logoImg.height) * logoAlto;
    page.drawImage(logoImg, {
      x: margen,
      y: yActual - logoAlto + 8,
      width: logoAncho,
      height: logoAlto,
    });
    page.drawText("Muvo RD Vial", {
      x: margen + logoAncho + 14,
      y: yActual - 10,
      size: 16,
      font: fontTitulo,
      color: azul,
    });
    page.drawText("Balance Contable Mensual", {
      x: margen + logoAncho + 14,
      y: yActual - 28,
      size: 11,
      font: fontTexto,
      color: grisClaro,
    });
    yActual -= logoAlto + 20;
  } else {
    page.drawText("Muvo RD Vial", {
      x: margen,
      y: yActual,
      size: 18,
      font: fontTitulo,
      color: azul,
    });
    page.drawText("Balance Contable Mensual", {
      x: margen,
      y: yActual - 22,
      size: 11,
      font: fontTexto,
      color: grisClaro,
    });
    yActual -= 50;
  }

  page.drawText(`${nombresMeses[mes - 1]} ${anio}`, {
    x: margen,
    y: yActual,
    size: 22,
    font: fontTitulo,
    color: rosa,
  });
  yActual -= 45;

  // --- 3 tarjetas de totales, lado a lado ---
  const anchoTarjeta = (width - margen * 2 - 24) / 3;
  const altoTarjeta = 68;
  const tarjetas = [
    { etiqueta: "Total entradas", valor: totalEntradas, color: verde },
    { etiqueta: "Total salidas", valor: totalSalidas, color: rojo },
    {
      etiqueta: "Saldo del mes",
      valor: saldo,
      color: saldo >= 0 ? azul : rojo,
    },
  ];

  tarjetas.forEach((t, i) => {
    const x = margen + i * (anchoTarjeta + 12);
    page.drawRectangle({
      x,
      y: yActual - altoTarjeta,
      width: anchoTarjeta,
      height: altoTarjeta,
      color: fondoClaro,
      borderColor: rgb(0.88, 0.89, 0.91),
      borderWidth: 1,
    });
    page.drawText(t.etiqueta, {
      x: x + 12,
      y: yActual - 22,
      size: 9,
      font: fontTexto,
      color: grisClaro,
    });
    page.drawText(formatoRD(t.valor), {
      x: x + 12,
      y: yActual - 44,
      size: 13,
      font: fontTitulo,
      color: t.color,
    });
  });

  yActual -= altoTarjeta + 40;

  // --- Tabla de desglose por categoría, con columnas alineadas ---
  page.drawText("Desglose por categoría", {
    x: margen,
    y: yActual,
    size: 13,
    font: fontTitulo,
    color: azul,
  });
  yActual -= 22;

  const colCategoria = margen;
  const colEntradas = margen + 220;
  const colSalidas = margen + 360;
  const anchoTabla = width - margen * 2;
  const altoFila = 22;

  // Encabezado de la tabla
  page.drawRectangle({
    x: margen,
    y: yActual - 16,
    width: anchoTabla,
    height: altoFila,
    color: azulClaro,
  });
  page.drawText("Categoría", {
    x: colCategoria + 8,
    y: yActual - 10,
    size: 9,
    font: fontTitulo,
    color: rgb(1, 1, 1),
  });
  page.drawText("Entradas", {
    x: colEntradas,
    y: yActual - 10,
    size: 9,
    font: fontTitulo,
    color: rgb(1, 1, 1),
  });
  page.drawText("Salidas", {
    x: colSalidas,
    y: yActual - 10,
    size: 9,
    font: fontTitulo,
    color: rgb(1, 1, 1),
  });
  yActual -= altoFila;

  const categorias = Object.entries(desglosePorCategoria || {});
  categorias.forEach(([categoria, montos], i) => {
    if (i % 2 === 1) {
      page.drawRectangle({
        x: margen,
        y: yActual - 16,
        width: anchoTabla,
        height: altoFila,
        color: fondoFilaAlterna,
      });
    }
    const nombreCategoria =
      categoria.charAt(0).toUpperCase() + categoria.slice(1);
    page.drawText(nombreCategoria, {
      x: colCategoria + 8,
      y: yActual - 10,
      size: 10,
      font: fontTexto,
      color: gris,
    });
    page.drawText(formatoRD(montos.entradas), {
      x: colEntradas,
      y: yActual - 10,
      size: 10,
      font: fontTexto,
      color: verde,
    });
    page.drawText(formatoRD(montos.salidas), {
      x: colSalidas,
      y: yActual - 10,
      size: 10,
      font: fontTexto,
      color: rojo,
    });
    yActual -= altoFila;
  });

  if (categorias.length === 0) {
    page.drawText("No hubo movimientos registrados este mes.", {
      x: colCategoria + 8,
      y: yActual - 10,
      size: 10,
      font: fontTexto,
      color: grisClaro,
    });
  }

  page.drawText(`Generado el ${new Date().toLocaleDateString("es-DO")}`, {
    x: margen,
    y: 40,
    size: 9,
    font: fontTexto,
    color: grisClaro,
  });
  page.drawText("Muvo RD Vial — Embajadoras de la educación vial", {
    x: margen,
    y: 28,
    size: 8,
    font: fontTexto,
    color: grisClaro,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = { generarDiplomaPDF, generarBalancePDF };
