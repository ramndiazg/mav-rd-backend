const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const configuracionRoutes = require("./routes/configuracionRoutes");
const inscripcionRoutes = require("./routes/inscripcionRoutes");
const sesionRoutes = require("./routes/sesionRoutes");
const examenRoutes = require("./routes/examenRoutes");
const intentoExamenRoutes = require("./routes/intentoExamenRoutes");
const progresoRoutes = require("./routes/progresoRoutes");
const diplomaRoutes = require("./routes/diplomaRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const noticiaRoutes = require("./routes/noticiaRoutes");
const testimonioRoutes = require("./routes/testimonioRoutes");
const faqRoutes = require("./routes/faqRoutes");
const contabilidadRoutes = require("./routes/contabilidadRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

const origenesPermitidos = [
  "http://localhost:3000",
  process.env.FRONTEND_URL, // la URL de Vercel en producción
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

// Cualquier ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Ruta no encontrada." });
});

app.use(errorHandler);

module.exports = app;
