"""Regenera los datos estructurados (JSON-LD) de cada página a partir de su HTML.

Organización + servicio de cada página + FAQPage sacado de los <details> de
preguntas frecuentes, para que las respuestas de Google y de la IA coincidan
siempre con lo que se ve en la web. Es idempotente: reemplaza el bloque
<script id="ld-tg"> si ya existe.

Uso (desde la raíz del repo):  python3 tools/schema.py
"""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
WEB = "https://tunedgrowth.com"

ORG = {
    "@type": ["Organization", "ProfessionalService"],
    "@id": f"{WEB}/#org",
    "name": "Tuned Growth",
    "url": f"{WEB}/",
    "logo": f"{WEB}/favicon.png",
    "email": "hola@tunedgrowth.com",
    "description": ("Hacemos que ChatGPT, Gemini y Google recomienden a negocios locales y automatizamos "
                    "la atención, las citas y el seguimiento para que ninguna consulta se pierda."),
    "address": {"@type": "PostalAddress", "addressLocality": "Madrid", "addressCountry": "ES"},
    "areaServed": {"@type": "Country", "name": "España"},
    "knowsLanguage": "es",
}

SERVICIOS = {
    "visibilidad": {
        "@type": "Service", "@id": f"{WEB}/visibilidad-ia/#servicio",
        "name": "Visibilidad en IA",
        "serviceType": "Auditoría y mejora de visibilidad en asistentes de IA (ChatGPT, Gemini, Perplexity)",
        "description": ("Medimos si los asistentes de IA recomiendan tu negocio con 30 preguntas reales de clientes, "
                        "quién sale en tu lugar y qué cambiar. Informe con plan de 3 meses y medición mensual. "
                        "Diagnóstico inicial gratuito."),
        "url": f"{WEB}/visibilidad-ia/",
    },
    "atencion": {
        "@type": "Service", "@id": f"{WEB}/#servicio-atencion",
        "name": "Captación y atención automática",
        "serviceType": "Automatización de atención al cliente, citas y seguimiento",
        "description": ("Sistema que responde al instante por WhatsApp, web y teléfono, agenda citas, envía "
                        "recordatorios y hace seguimiento, también fuera de horario. Demo con tu negocio antes de decidir."),
        "url": f"{WEB}/#sistema",
    },
    "dental": {
        "@type": "Service", "@id": f"{WEB}/clinicas-dentales/#servicio",
        "name": "Visibilidad en IA y atención automática para clínicas dentales",
        "serviceType": "Captación de pacientes para clínicas dentales",
        "description": ("Que ChatGPT, Gemini y Google recomienden tu clínica dental para implantes, ortodoncia "
                        "invisible y carillas, y que cada consulta acabe en primera visita."),
        "audience": {"@type": "BusinessAudience", "name": "Clínicas dentales"},
        "url": f"{WEB}/clinicas-dentales/",
    },
    "clinicas": {
        "@type": "Service", "@id": f"{WEB}/clinicas/#servicio",
        "name": "Atención y reserva automática de pacientes para clínicas privadas",
        "serviceType": "Automatización de captación y reserva de pacientes",
        "description": ("Respuesta, seguimiento y reserva de pacientes por WhatsApp, web y teléfono para clínicas "
                        "dentales, estéticas, dermatología, fisioterapia, medicina privada y psicología."),
        "audience": {"@type": "BusinessAudience", "name": "Clínicas privadas"},
        "url": f"{WEB}/clinicas/",
    },
}

PAGINAS = {
    "index.html": ("/", ["visibilidad", "atencion"]),
    "visibilidad-ia/index.html": ("/visibilidad-ia/", ["visibilidad"]),
    "clinicas-dentales/index.html": ("/clinicas-dentales/", ["dental"]),
    "clinicas/index.html": ("/clinicas/", ["clinicas"]),
}


def texto(fragmento: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragmento))).strip()


def faq(doc: str) -> list[dict]:
    pares = re.findall(r"<details>\s*<summary>(.*?)</summary>\s*<div class=\"a\">(.*?)</div>\s*</details>", doc, re.S)
    return [{"@type": "Question", "name": texto(q),
             "acceptedAnswer": {"@type": "Answer", "text": texto(a).replace(" →", "")}} for q, a in pares]


def main() -> None:
    for rel, (ruta, servicios) in PAGINAS.items():
        f = RAIZ / rel
        doc = f.read_text(encoding="utf-8")
        titulo = texto(re.search(r"<title>(.*?)</title>", doc, re.S).group(1))
        grafo = [ORG]
        if ruta == "/":
            grafo.append({"@type": "WebSite", "@id": f"{WEB}/#web", "url": f"{WEB}/", "name": "Tuned Growth",
                          "inLanguage": "es", "publisher": {"@id": f"{WEB}/#org"}})
        for s in servicios:
            grafo.append({**SERVICIOS[s], "provider": {"@id": f"{WEB}/#org"},
                          "areaServed": {"@type": "Country", "name": "España"}})
        grafo.append({"@type": "WebPage", "@id": f"{WEB}{ruta}#pagina", "url": f"{WEB}{ruta}", "name": titulo,
                      "inLanguage": "es", "isPartOf": {"@id": f"{WEB}/#web"},
                      "about": [{"@id": SERVICIOS[s]["@id"]} for s in servicios]})
        preguntas = faq(doc)
        if preguntas:
            grafo.append({"@type": "FAQPage", "@id": f"{WEB}{ruta}#faq", "mainEntity": preguntas})
        bloque = ('<script type="application/ld+json" id="ld-tg">\n'
                  + json.dumps({"@context": "https://schema.org", "@graph": grafo}, ensure_ascii=False, indent=1)
                  + "\n</script>")
        if 'id="ld-tg"' in doc:
            doc = re.sub(r'<script type="application/ld\+json" id="ld-tg">.*?</script>', lambda _: bloque, doc, flags=re.S)
        else:
            doc = doc.replace("</head>", bloque + "\n</head>", 1)
        f.write_text(doc, encoding="utf-8")
        print(f"{rel}: {len(grafo)} entidades, {len(preguntas)} preguntas")


if __name__ == "__main__":
    main()
