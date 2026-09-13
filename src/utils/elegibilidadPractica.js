// Centraliza el criterio de "¿a esta estudiante le aplica la práctica de
// manejo?" — antes de esta función (11/09/2026) el mismo `!grupoId` estaba
// repetido de forma independiente en diplomaController.js (x2),
// practicaController.js y intentoExamenController.js. Un solo lugar
// evita que un cambio de criterio haya que replicarlo a mano en varios
// archivos y corra el riesgo de quedar desincronizado en alguno.
//
// ACTUALIZADO (13/09/2026): Motorizados y Pesados tampoco cursan práctica
// de manejo — "por ahora, solo teoría", igual que Escolar/Empresarial (ver
// ANALISIS_MOTORISTA_PESADOS.md). A diferencia de Escolar/Empresarial
// (que se distinguen por `grupoId`), Motorizados/Pesados se inscriben
// individualmente igual que `estandar` — no tienen `grupoId`, así que el
// criterio viejo (`!grupoId`) por sí solo las dejaría atrapadas para
// siempre esperando una práctica que nunca va a llegar. El segundo
// parámetro (`programa`) es quien resuelve ese caso.
//
// Recibe el `User` completo (o cualquier objeto con `grupoId`) y,
// opcionalmente, el `programa` de su inscripción/progreso
// (`Inscripcion.programa` o `ProgresoEstudiante.programa`) — se deja
// opcional para no romper ningún llamado viejo que todavía no lo pase,
// aunque a partir de ahora todos los llamados reales sí lo hacen.
const PROGRAMAS_SIN_PRACTICA = ["motorizados", "pesados"];

function requierePracticaDeManejo(usuario, programa) {
  const tieneGrupo = Boolean(usuario?.grupoId);
  const esProgramaSinPractica = Boolean(
    programa && PROGRAMAS_SIN_PRACTICA.includes(programa),
  );
  return !tieneGrupo && !esProgramaSinPractica;
}

module.exports = { requierePracticaDeManejo, PROGRAMAS_SIN_PRACTICA };
