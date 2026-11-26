// Worker de Cloudflare «tunedgrowth-contacto»: recibe los formularios de tunedgrowth.com
// y los envía a Gmail con Email Routing. Ruta: tunedgrowth.com/api/contacto
// Configuración en wrangler.toml (binding send_email «CORREO»).
import { EmailMessage } from "cloudflare:email";

const DESTINO = "tunedgrowth@gmail.com";
const REMITENTE = "formulario@tunedgrowth.com";
const CAMPOS = { nombre: "Nombre", negocio: "Negocio", email: "Email", telefono: "Teléfono", web: "Web / interés" };

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8" } });
const limpio = (v, max = 500) => String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);

// Texto UTF-8 → base64 (para el cuerpo y el asunto del correo)
function b64(texto) {
  let bin = "";
  for (const b of new TextEncoder().encode(texto)) bin += String.fromCharCode(b);
  return btoa(bin);
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") return json({ success: false, message: "Método no permitido" }, 405);

    let datos = {};
    try {
      const tipo = request.headers.get("content-type") || "";
      datos = tipo.includes("application/json") ? await request.json() : Object.fromEntries(await request.formData());
    } catch {
      return json({ success: false, message: "Datos no válidos" }, 400);
    }

    // Trampa para bots: el campo oculto _honey debe venir vacío
    if (limpio(datos._honey)) return json({ success: true });

    const email = limpio(datos.email, 200);
    const nombre = limpio(datos.nombre, 200);
    if (!nombre || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ success: false, message: "Faltan el nombre o un email válido" }, 400);
    }

    const asunto = (limpio(datos._subject, 160) || "Nuevo contacto — tunedgrowth.com") + ` · ${nombre}`;
    const texto =
      Object.entries(CAMPOS).map(([k, t]) => `${t}: ${limpio(datos[k], 2000) || "—"}`).join("\n") +
      `\n\nPágina: ${limpio(request.headers.get("referer"), 300) || "—"}` +
      `\nPaís: ${request.cf?.country || "—"}` +
      `\nFecha: ${new Date().toISOString()}\n`;

    const mime = [
      `From: Web Tuned Growth <${REMITENTE}>`,
      `To: ${DESTINO}`,
      `Reply-To: ${email}`,
      `Subject: =?UTF-8?B?${b64(asunto)}?=`,
      `Message-ID: <${crypto.randomUUID()}@tunedgrowth.com>`,
      `Date: ${new Date().toUTCString()}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      b64(texto).replace(/.{1,76}/g, (l) => l + "\r\n"),
    ].join("\r\n");

    try {
      await env.CORREO.send(new EmailMessage(REMITENTE, DESTINO, mime));
      return json({ success: true });
    } catch (e) {
      console.error("Error al enviar", e && e.message);
      return json({ success: false, message: "No se pudo enviar" }, 502);
    }
  },
};
