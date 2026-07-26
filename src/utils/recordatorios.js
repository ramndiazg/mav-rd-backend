const BalanceMensual = require("../models/BalanceMensual");
const Configuracion = require("../models/Configuracion");
const { notificarBalancePendiente } = require("./notificaciones");

// Se llama cada vez que un admin carga su perfil (GET /api/auth/perfil).
// Revisa si el balance del mes CALENDARIO ANTERIOR ya existe; si no, y si
// no se ha avisado ya sobre ese mes específico (usamos un marcador en
// Configuracion para no repetir el aviso una y otra vez), notifica una sola
// vez. Nunca debe tumbar el login/perfil — todo va en try/catch.
async function verificarYNotificarBalancePendiente() {
  try {
    const ahora = new Date();
    let mesAnterior = ahora.getMonth(); // getMonth() es 0-indexado = mes anterior en base 1
    let anioMesAnterior = ahora.getFullYear();
    if (mesAnterior === 0) {
      mesAnterior = 12;
      anioMesAnterior -= 1;
    }

    const balanceExiste = await BalanceMensual.findOne({
      mes: mesAnterior,
      anio: anioMesAnterior,
    });
    if (balanceExiste) return; // ya se generó, nada que hacer

    const marcador = `recordatorio_balance_${anioMesAnterior}${String(mesAnterior).padStart(2, "0")}`;
    const yaAvisado = await Configuracion.findOne({ clave: marcador });
    if (yaAvisado) return; // ya se avisó sobre este mes específico, no repetir

    await notificarBalancePendiente({
      mes: mesAnterior,
      anio: anioMesAnterior,
    });
    await Configuracion.create({
      clave: marcador,
      valor: 1,
      actualizadoPor: null,
    });
  } catch (err) {
    console.error("Error verificando recordatorio de balance:", err.message);
  }
}

module.exports = { verificarYNotificarBalancePendiente };
