const jwt = require("jsonwebtoken");
const MovimientoContable = require("../models/MovimientoContable");
const BalanceMensual = require("../models/BalanceMensual");
const User = require("../models/User");
const { generarBalancePDF } = require("../utils/pdfGenerator");
const {
  subirBuffer,
  generarUrlDescargaFirmada,
} = require("../utils/cloudinaryUpload");

// POST /api/contabilidad/movimientos — admin registra un movimiento manual
async function crearMovimiento(req, res, next) {
  try {
    const { tipo, categoria, monto, descripcion, fecha } = req.body;

    if (!tipo || !categoria || monto === undefined) {
      return res.status(400).json({
        success: false,
        error: "tipo, categoria y monto son obligatorios.",
      });
    }

    const movimiento = await MovimientoContable.create({
      tipo,
      categoria,
      monto,
      descripcion: descripcion || "",
      fecha: fecha ? new Date(fecha) : new Date(),
      registradoPor: req.usuario._id,
    });

    res.status(201).json({ success: true, data: movimiento });
  } catch (error) {
    next(error);
  }
}

// GET /api/contabilidad/movimientos — admin, filtrable por mes/año/tipo/categoria
async function listarMovimientos(req, res, next) {
  try {
    const { mes, anio, tipo, categoria, page, limit } = req.query;
    const filtro = {};

    if (tipo) filtro.tipo = tipo;
    if (categoria) filtro.categoria = categoria;

    if (mes && anio) {
      const inicio = new Date(Number(anio), Number(mes) - 1, 1);
      const fin = new Date(Number(anio), Number(mes), 1);
      filtro.fecha = { $gte: inicio, $lt: fin };
    }

    const paginaActual = Math.max(1, Number(page) || 1);
    const limite = Math.min(100, Math.max(1, Number(limit) || 20));

    const totalDocumentos = await MovimientoContable.countDocuments(filtro);
    const totalPaginas = Math.max(1, Math.ceil(totalDocumentos / limite));

    const movimientos = await MovimientoContable.find(filtro)
      .populate("registradoPor", "nombre apellido")
      .sort({ fecha: -1 })
      .skip((paginaActual - 1) * limite)
      .limit(limite);

    res.json({
      success: true,
      data: movimientos,
      paginacion: { paginaActual, totalPaginas, totalDocumentos, limite },
    });
  } catch (error) {
    next(error);
  }
}

// Función interna: calcula totales y desglose por categoría de un mes/año dado
async function calcularResumenMes(mes, anio) {
  const inicio = new Date(anio, mes - 1, 1);
  const fin = new Date(anio, mes, 1);

  const movimientos = await MovimientoContable.find({
    fecha: { $gte: inicio, $lt: fin },
  });

  let totalEntradas = 0;
  let totalSalidas = 0;
  const desglosePorCategoria = {};

  movimientos.forEach((m) => {
    if (!desglosePorCategoria[m.categoria]) {
      desglosePorCategoria[m.categoria] = { entradas: 0, salidas: 0 };
    }
    if (m.tipo === "entrada") {
      totalEntradas += m.monto;
      desglosePorCategoria[m.categoria].entradas += m.monto;
    } else {
      totalSalidas += m.monto;
      desglosePorCategoria[m.categoria].salidas += m.monto;
    }
  });

  return {
    totalEntradas,
    totalSalidas,
    saldo: totalEntradas - totalSalidas,
    desglosePorCategoria,
  };
}

// POST /api/contabilidad/balances/generar — admin genera (o regenera) el balance de un mes
async function generarBalance(req, res, next) {
  try {
    const { mes, anio } = req.body;

    if (!mes || !anio) {
      return res
        .status(400)
        .json({ success: false, error: "mes y anio son obligatorios." });
    }

    const resumen = await calcularResumenMes(mes, anio);

    const pdfBuffer = await generarBalancePDF({ mes, anio, ...resumen });

    const resultadoSubida = await subirBuffer(pdfBuffer, {
      folder: "mav-rd/balances",
      resourceType: "raw",
      filename: `balance-${anio}-${String(mes).padStart(2, "0")}-${Date.now()}`,
    });

    const balance = await BalanceMensual.findOneAndUpdate(
      { mes, anio },
      {
        mes,
        anio,
        totalEntradas: resumen.totalEntradas,
        totalSalidas: resumen.totalSalidas,
        saldo: resumen.saldo,
        urlPDF: resultadoSubida.secure_url,
        publicIdCloudinary: resultadoSubida.public_id,
        generadoAutomaticamente: false,
        generadoPor: req.usuario._id,
        fechaGeneracion: new Date(),
      },
      { upsert: true, new: true },
    );

    res.status(201).json({ success: true, data: balance });
  } catch (error) {
    next(error);
  }
}

// GET /api/contabilidad/balances — admin, historial completo
async function listarBalances(req, res, next) {
  try {
    const balances = await BalanceMensual.find({}).sort({ anio: -1, mes: -1 });
    res.json({ success: true, data: balances });
  } catch (error) {
    next(error);
  }
}

// GET /api/contabilidad/balances/:id — admin, un balance específico (con su urlPDF)
async function obtenerBalance(req, res, next) {
  try {
    const balance = await BalanceMensual.findById(req.params.id);
    if (!balance) {
      return res
        .status(404)
        .json({ success: false, error: "Balance no encontrado." });
    }
    res.json({ success: true, data: balance });
  } catch (error) {
    next(error);
  }
}

// Deriva el public_id (sin extensión) a partir de la URL pública guardada,
// para los balances generados ANTES de guardar publicIdCloudinary. Mismo
// patrón que ya usa diplomaController.js.
function derivarPublicIdDeUrl(urlPDF) {
  const match = urlPDF.match(/\/upload\/v\d+\/(.+?)(\.[a-zA-Z0-9]+)?$/);
  return match ? match[1] : null;
}

// GET /api/contabilidad/balances/:id/descargar?token=... — admin
// NUEVO: sirve el PDF directamente con las cabeceras correctas (en vez de
// redirigir a la URL cruda de Cloudinary, que llegaba sin extensión
// reconocible). Verifica el token manualmente porque este endpoint vive
// fuera del middleware protegerRuta normal — un <a href> de descarga no
// puede mandar el header Authorization, así que acepta ?token= por query,
// igual que ya resolvimos para diplomas.
async function descargarBalance(req, res, next) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ")
      ? header.slice(7)
      : req.query.token;
    if (!token) {
      return res.status(401).json({ success: false, error: "No autorizado." });
    }

    let usuario;
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      usuario = await User.findById(payload.id);
    } catch {
      return res
        .status(401)
        .json({ success: false, error: "Token inválido o expirado." });
    }

    if (!usuario || usuario.rol !== "admin") {
      return res.status(401).json({ success: false, error: "No autorizado." });
    }

    const balance = await BalanceMensual.findById(req.params.id);
    if (!balance) {
      return res
        .status(404)
        .json({ success: false, error: "Balance no encontrado." });
    }

    const publicId =
      balance.publicIdCloudinary || derivarPublicIdDeUrl(balance.urlPDF);
    if (!publicId) {
      return res.status(500).json({
        success: false,
        error:
          "No se pudo determinar el archivo en Cloudinary para este balance.",
      });
    }

    const urlFirmada = generarUrlDescargaFirmada(publicId);
    const respuestaCloudinary = await fetch(urlFirmada);
    if (!respuestaCloudinary.ok) {
      return res.status(502).json({
        success: false,
        error: "No se pudo obtener el PDF desde Cloudinary.",
      });
    }

    const buffer = Buffer.from(await respuestaCloudinary.arrayBuffer());
    const nombreArchivo = `balance-${balance.anio}-${String(balance.mes).padStart(2, "0")}.pdf`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nombreArchivo}"`,
    });
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  crearMovimiento,
  listarMovimientos,
  generarBalance,
  listarBalances,
  obtenerBalance,
  descargarBalance,
};
