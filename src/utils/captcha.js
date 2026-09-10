// NUEVO (10/09/2026): Cloudflare Turnstile — la capa que de verdad frena
// el registro masivo de bots, porque a diferencia del rate limiting no
// depende de la IP (un atacante con muchas IPs distintas igual tiene que
// resolver el challenge en cada una). Gratis, sin cuenta de Google
// necesaria del lado del usuario. Ver ARQUITECTURA_BACKEND.md para cómo
// obtener las llaves (site key + secret key) desde el dashboard de
// Cloudflare.
//
// Requiere la variable de entorno TURNSTILE_SECRET_KEY. Si no está
// configurada, se asume ambiente de desarrollo local (no tiene sentido
// que cada quien tenga que crear una cuenta de Cloudflare solo para
// correr el proyecto en su máquina) y se deja pasar con una advertencia
// en consola — en producción (Render) esta variable SIEMPRE debe estar
// puesta, o el registro queda tan expuesto como antes.
async function verificarCaptcha(token, ipRemota) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.warn(
      "TURNSTILE_SECRET_KEY no está configurada — verificación de CAPTCHA omitida. " +
        "Esto es aceptable en desarrollo local, pero NUNCA en producción.",
    );
    return true;
  }

  if (!token) return false;

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
          ...(ipRemota ? { remoteip: ipRemota } : {}),
        }),
      },
    );
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    // Si Cloudflare está caído, no tiene sentido bloquear TODO el
    // registro por eso — se deja pasar, mismo criterio que el resto del
    // proyecto para dependencias externas no críticas (ver
    // enviarEmailResend, que tampoco tumba el flujo principal si falla).
    console.error("Error verificando CAPTCHA con Cloudflare —", err.message);
    return true;
  }
}

module.exports = { verificarCaptcha };
