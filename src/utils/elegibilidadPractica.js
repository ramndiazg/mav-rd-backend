// Centraliza el criterio de "¿a esta estudiante le aplica la práctica de
// manejo?" — antes de esta función (11/09/2026) el mismo `!grupoId` estaba
// repetido de forma independiente en diplomaController.js (x2),
// practicaController.js y intentoExamenController.js. Un solo lugar
// evita que un cambio de criterio (por ejemplo, cuando Motorista/Pesados
// se diseñen y probablemente tampoco cursen práctica) haya que
// replicarlo a mano en 4 archivos y corra el riesgo de quedar
// desincronizado en alguno.
//
// Hoy el único criterio real es `grupoId` (estudiantes de un Grupo
// Escolar/Empresarial no cursan práctica). Recibe el `User` completo (o
// cualquier objeto con `grupoId`) para no atarse a qué otros campos se
// necesiten más adelante.
function requierePracticaDeManejo(usuario) {
  return !usuario?.grupoId;
}

module.exports = { requierePracticaDeManejo };
