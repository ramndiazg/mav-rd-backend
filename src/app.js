const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const authRoutes = require("./routes/authRoutes");
const configuracionRoutes = require("./routes/configuracionRoutes");
const inscripcionRoutes = require("./routes/inscripcionRoutes");
const sesionRoutes = require("./routes/sesionRoutes");
const examenRoutes = require("./routes/examenRoutes");
const intentoExamenRoutes = require("./routes/intentoExamenRoutes");
const progresoRoutes = require("./routes/progresoRoutes");
const diplomaRoutes = require("./routes/diplomaRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const planRoutes = require("./routes/planRoutes");
const noticiaRoutes = require("./routes/noticiaRoutes");
const testimonioRoutes = require("./routes/testimonioRoutes");
const faqRoutes = require("./routes/faqRoutes");
const contabilidadRoutes = require("./routes/contabilidadRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const contenidoRoutes = require("./routes/contenido");
const contenidoSesionRoutes = require("./routes/contenidoSesion");
const destinatarioRoutes = require("./routes/destinatarioRoutes");
const destinatarioPracticaRoutes = require("./routes/destinatarioPracticaRoutes");
const instructorRoutes = require("./routes/instructorRoutes");
const practicaRoutes = require("./routes/practicaRoutes");
const empresasRoutes = require("./routes/empresasRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
const resumenRoutes = require("./routes/resumenRoutes");
const testPsicologicoRoutes = require("./routes/testPsicologicoRoutes");
const cuestionarioEscolarRoutes = require("./routes/cuestionarioEscolarRoutes");
const grupoRoutes = require("./routes/grupoRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// NUEVO (10/09/2026): Render pone la app detrás de un proxy — sin esto,
// req.ip siempre devuelve la IP del proxy (la misma para todas las
// requests), lo que vuelve inútil cualquier rate limiting por IP. "1"
// confía en un solo salto de proxy (el de Render), que es lo correcto
// aquí — no usar `true` (confiaría en cualquier cantidad de proxies,
// permitiendo falsificar la IP vía el header X-Forwarded-For).
app.set("trust proxy", 1);

// NUEVO (10/09/2026): headers de seguridad HTTP básicos, agregados en la
// auditoría tras el ataque de registro masivo (ver
// ARQUITECTURA_BACKEND.md). contentSecurityPolicy desactivado a propósito
// — es una API JSON pura, no sirve HTML, así que esa parte de helmet no
// aplica y solo agrega ruido. crossOriginResourcePolicy en "cross-origin"
// para no romper las llamadas fetch() del frontend (que ya están
// controladas por la configuración de CORS de arriba, con lista fija de
// orígenes permitidos).
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Lista fija de orígenes permitidos — ya no depende de una sola
// variable de entorno, para no perder acceso desde ningún dominio
// activo (ver ARQUITECTURA_BACKEND.md, sección Infraestructura).
const origenesPermitidos = [
  "http://localhost:3000",
  "https://www.muvordvial.com",
  "https://muvordvial.com",
  "https://muvo-rd.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origenesPermitidos.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("No permitido por CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());

// Ruta de salud, para verificar rápido que el servidor está vivo
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API de Mujeres al Volante RD funcionando ✅",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/configuracion", configuracionRoutes);
app.use("/api/inscripciones", inscripcionRoutes);
app.use("/api/sesiones", sesionRoutes);
app.use("/api/examenes", examenRoutes);
app.use("/api/intentos-examen", intentoExamenRoutes);
app.use("/api/progreso", progresoRoutes);
app.use("/api/diplomas", diplomaRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/noticias", noticiaRoutes);
app.use("/api/testimonios", testimonioRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/contabilidad", contabilidadRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/planes", planRoutes);
app.use("/api/contenido", contenidoRoutes);
app.use("/api/contenido-sesion", contenidoSesionRoutes);
app.use("/api/destinatarios", destinatarioRoutes);
app.use("/api/destinatarios-practica", destinatarioPracticaRoutes);
app.use("/api/instructores", instructorRoutes);
app.use("/api/practica", practicaRoutes);
app.use("/api/empresas", empresasRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/interno", resumenRoutes);
app.use("/api/test-psicologico", testPsicologicoRoutes);
app.use("/api/cuestionario-escolar", cuestionarioEscolarRoutes);
app.use("/api/grupos", grupoRoutes);

// Cualquier ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Ruta no encontrada." });
});

app.use(errorHandler);

module.exports = app;
