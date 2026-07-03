const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const configuracionRoutes = require("./routes/configuracionRoutes");
const inscripcionRoutes = require("./routes/inscripcionRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
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

// Cualquier ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Ruta no encontrada." });
});

app.use(errorHandler);

module.exports = app;
