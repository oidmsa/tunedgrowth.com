// Analítica de tunedgrowth.com con PostHog (EU) y aviso de cookies.
// - Sin decisión o si se rechaza: medición anónima SIN cookies (origen, país, páginas), sin grabaciones.
// - Si se acepta: cookies, grabación de sesión y mapas de calor.
// Cambiar de proyecto de PostHog = cambiar TOKEN.
import posthog from "https://cdn.jsdelivr.net/npm/posthog-js@1/+esm";

const TOKEN = "phc_yfgwThxUkoRWU3V7pwACuXFw6AUJvvYqhKtTzSWcUK93";
const CLAVE = "tg_cookies"; // "si" | "no"

posthog.init(TOKEN, {
  api_host: "https://eu.i.posthog.com",
  ui_host: "https://eu.posthog.com",
  defaults: "2026-08-30",
  cookieless_mode: "on_reject",
  session_recording: { maskAllInputs: true },
});
window.posthog = posthog;

const decision = () => { try { return localStorage.getItem(CLAVE); } catch { return null; } };
const guardar = (v) => { try { localStorage.setItem(CLAVE, v); } catch { /* sin almacenamiento */ } };

function aplicar(v) {
  if (v === "si") posthog.opt_in_capturing();
  else posthog.opt_out_capturing(); // en modo on_reject sigue midiendo sin cookies
}

function aviso() {
  if (document.getElementById("tg-cookies")) return;
  const css = document.createElement("style");
  css.textContent = `
  #tg-cookies{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;
    background:#171310;color:#f3f0e9;border-radius:4px;padding:18px 20px;box-shadow:0 10px 30px rgba(0,0,0,.25);
    font:14px/1.5 Inter,-apple-system,"Segoe UI",sans-serif}
  #tg-cookies p{margin:0 0 12px}#tg-cookies a{color:#f3f0e9}
  #tg-cookies .b{display:flex;gap:10px;flex-wrap:wrap}
  #tg-cookies button{font:500 12px/1 "Space Grotesk",Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;
    padding:12px 18px;border-radius:4px;cursor:pointer;border:1px solid #f3f0e9}
  #tg-cookies .si{background:#e0420a;border-color:#e0420a;color:#fff}
  #tg-cookies .no{background:transparent;color:#f3f0e9}`;
  document.head.appendChild(css);
  const d = document.createElement("div");
  d.id = "tg-cookies";
  d.setAttribute("role", "dialog");
  d.setAttribute("aria-label", "Preferencias de cookies");
  d.innerHTML = `<p>Usamos cookies de analítica para entender cómo se usa la web y mejorarla, incluida la grabación anónima de la navegación. Sin tu permiso solo medimos visitas de forma anónima, sin cookies. <a href="/cookies.html">Más información</a></p>
    <div class="b"><button class="si" type="button">Aceptar</button><button class="no" type="button">Rechazar</button></div>`;
  d.querySelector(".si").onclick = () => { guardar("si"); aplicar("si"); d.remove(); };
  d.querySelector(".no").onclick = () => { guardar("no"); aplicar("no"); d.remove(); };
  document.body.appendChild(d);
}

const actual = decision();
if (actual) aplicar(actual);
else { aplicar("no"); aviso(); } // hasta decidir: medición anónima sin cookies

// Para reabrir el aviso desde un enlace: <a href="#" onclick="tgCookies();return false">
window.tgCookies = () => { try { localStorage.removeItem(CLAVE); } catch {} aviso(); };
