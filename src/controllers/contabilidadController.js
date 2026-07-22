const MovimientoContable = require("../models/MovimientoContable");
const BalanceMensual = require("../models/BalanceMensual");
const { generarBalancePDF } = require("../utils/pdfGenerator");
const { subirBuffer } = require("../utils/cloudinaryUpload");

// POST /api/contabilidad/movimientos — admin registra un movimiento manual
// (sueldos, materiales, transporte, publicidad, otro — o entradas manuales)
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
// Query params nuevos: page, limit
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

    // Antes esto traía TODOS los movimientos que calzaran con el filtro, sin
    // límite — con meses/años acumulados esto solo iba a crecer. Ahora pagina.
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

    // Si ya existía un balance guardado para ese mes, se reemplaza (regenerar)
    const balance = await BalanceMensual.findOneAndUpdate(
      { mes, anio },
      {
        mes,
        anio,
        totalEntradas: resumen.totalEntradas,
        totalSalidas: resumen.totalSalidas,
        saldo: resumen.saldo,
        urlPDF: resultadoSubida.secure_url,
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

module.exports = {
  crearMovimiento,
  listarMovimientos,
  generarBalance,
  listarBalances,
  obtenerBalance,
};
