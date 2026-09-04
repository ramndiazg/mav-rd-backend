const {
  DECLARACIONES_HERRAMIENTAS,
  ejecutarHerramienta,
} = require("../utils/geminiHerramientas");

// Modelo configurable por env var para poder cambiarlo sin redeploy si
// Google renombra/retira uno — con default a Gemini 3.6 Flash (capa
// gratuita vigente confirmada el 28/08/2026; reemplazó a la familia
// 2.5 Flash, que Google dejó de ofrecer a cuentas nuevas).
const MODELO_GEMINI = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const INSTRUCCION_SISTEMA = `Eres el asistente interno de María Díaz, fundadora de Muvo RD Vial
(escuela de educación vial en Santo Domingo, República Dominicana).

Reglas estrictas:
- SOLO puedes responder preguntas usando los datos reales que obtengas
  llamando a las herramientas disponibles. NUNCA inventes cifras.
- Si una pregunta no se puede responder con las herramientas
  disponibles, dilo claramente en vez de adivinar.
- Responde siempre en español, de forma breve y directa — María tiene
  poco tiempo.
- Los montos son en pesos dominicanos (RD$).
- No tienes forma de modificar ni borrar nada — solo puedes leer datos.`;

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gemini (sobre todo en capa gratuita) devuelve 503 "alta demanda" con
// cierta frecuencia — es temporal, así que reintentamos un par de veces
// con una pequeña espera antes de rendirnos, en vez de fallarle a la
// fundadora en el primer tropiezo.
async function llamarGemini(contents) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_GEMINI}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const MAX_INTENTOS = 3;

  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: INSTRUCCION_SISTEMA }] },
        contents,
        tools: [{ functionDeclarations: DECLARACIONES_HERRAMIENTAS }],
      }),
    });

    if (res.ok) {
      return res.json();
    }

    const detalle = await res.text();
    const esReintentable = res.status === 503 || res.status === 429;

    if (!esReintentable || intento === MAX_INTENTOS) {
      throw new Error(`Gemini respondió ${res.status}: ${detalle}`);
    }

    await esperar(1000 * intento); // 1s, luego 2s
  }
}

// POST /api/chatbot/preguntar — { pregunta: string }
// Protegido: solo admin (ver routes/chatbotRoutes.js).
async function preguntar(req, res, next) {
  try {
    const { pregunta } = req.body;
    if (!pregunta || typeof pregunta !== "string" || !pregunta.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Falta la pregunta." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        success: false,
        error: "El chatbot no está configurado (falta GEMINI_API_KEY).",
      });
    }

    const contents = [{ role: "user", parts: [{ text: pregunta }] }];
    const MAX_PASOS = 5; // evita loops infinitos si el modelo se queda pidiendo herramientas
    let ultimaRespuesta = null;

    for (let paso = 0; paso < MAX_PASOS; paso++) {
      ultimaRespuesta = await llamarGemini(contents);
      const candidato = ultimaRespuesta.candidates?.[0];
      const partes = candidato?.content?.parts || [];

      const llamadasFuncion = partes.filter((p) => p.functionCall);

      if (llamadasFuncion.length === 0) {
        // No pidió ninguna herramienta más — esto es la respuesta final.
        const textoFinal = partes
          .filter((p) => p.text)
          .map((p) => p.text)
          .join("\n")
          .trim();

        return res.json({
          success: true,
          respuesta: textoFinal || "No obtuve una respuesta del modelo.",
        });
      }

      // El modelo pidió una o más herramientas — las ejecutamos todas y
      // le devolvemos los resultados en el mismo turno. IMPORTANTE
      // (Gemini 3.x, confirmado 28/08/2026): el rol de la respuesta de
      // función es "user", NO "function" como en versiones anteriores
      // de la API — y cada functionResponse debe incluir el mismo `id`
      // que trajo la llamada correspondiente, o Gemini la rechaza con
      // un error de "strict matching".
      contents.push({ role: "model", parts: partes });

      const resultados = await Promise.all(
        llamadasFuncion.map(async (p) => {
          const resultado = await ejecutarHerramienta(
            p.functionCall.name,
            p.functionCall.args,
          );
          return {
            functionResponse: {
              id: p.functionCall.id,
              name: p.functionCall.name,
              response: resultado,
            },
          };
        }),
      );

      contents.push({ role: "user", parts: resultados });
    }

    // Se acabaron los pasos permitidos sin llegar a una respuesta final.
    res.json({
      success: true,
      respuesta:
        "La pregunta requirió demasiados pasos para responderla con confianza. Intenta ser más específica.",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { preguntar };
