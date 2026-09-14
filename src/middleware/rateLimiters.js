const rateLimit = require("express-rate-limit");

// NUEVO (10/09/2026): protección contra el ataque de registro masivo de
// cuentas falsas (bots creando cuentas con nombre/cédula aleatorios,
// disparando un correo de verificación por Resend cada vez). Ver
// ARQUITECTURA_BACKEND.md, sección "Seguridad — ataque de registro
// masivo", para el diagnóstico completo.
//
// Todos estos limitan por IP (`req.ip`, que depende de que Render mande
// bien el header X-Forwarded-For — Express ya confía en el proxy si
// `app.set("trust proxy", ...)` está activo, ver app.js). Un atacante con
// muchas IPs distintas (botnet/proxies rotativos) puede evadir esto —
// por eso el rate limit es la primera capa, no la única: el CAPTCHA
// (utils/captcha.js) es la que de verdad frena un ataque distribuido.

// Registro: el endpoint que causó el incidente. 5 cuentas por IP cada
// hora es generoso para una persona real (nadie crea 5 cuentas en una
// hora) y muy restrictivo para un bot.
const limitadorRegistro = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error:
      "Demasiados intentos de registro desde esta conexión. Intenta de nuevo más tarde.",
  },
});

// Login: protección estándar contra fuerza bruta de contraseña.
const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Demasiados intentos. Espera unos minutos e intenta de nuevo.",
  },
});

// Recuperación de contraseña y reenvío de verificación: ambos disparan
// un correo por Resend, mismo riesgo que el registro aunque de menor
// escala (no crean cuentas nuevas, pero sí pueden usarse para bombardear
// una bandeja de entrada ajena).
const limitadorCorreoTransaccional = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Demasiadas solicitudes. Intenta de nuevo más tarde.",
  },
});

// Formulario de contacto de /empresas: mismo riesgo que el registro
// (público, dispara correo + Telegram, escribe en Mongo en cada hit) —
// segundo vector encontrado en la auditoría del 10/09/2026.
const limitadorContactoEmpresarial = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error:
      "Demasiadas solicitudes desde esta conexión. Intenta de nuevo más tarde.",
  },
});

// Formulario de contacto de /escolar: mismo riesgo y mismo límite que el
// de /empresas (público, dispara correo + Telegram, escribe en Mongo en
// cada hit).
const limitadorContactoEscolar = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error:
      "Demasiadas solicitudes desde esta conexión. Intenta de nuevo más tarde.",
  },
});

// Endpoints de cron (/api/interno/*) — protegidos por un secreto
// compartido (x-cron-secret), no por sesión. Sin límite de intentos,
// alguien podría intentar adivinar el secreto sin restricción; esto no
// reemplaza tener un secreto largo y aleatorio, solo agrega fricción.
const limitadorInterno = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Demasiadas solicitudes." },
});

module.exports = {
  limitadorRegistro,
  limitadorLogin,
  limitadorCorreoTransaccional,
  limitadorContactoEmpresarial,
  limitadorContactoEscolar,
  limitadorInterno,
};
