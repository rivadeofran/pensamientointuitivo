/* =========================================================================
   MODO EDICIÓN IN-PAGE — InspirAcción Nivel 1
   Activación: ?edit=1 en la URL
   Todos los cambios son CLIENT-SIDE. No tocan el servidor ni archivos.
   ========================================================================= */
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  if (params.get('edit') !== '1') return;

  const STORAGE_KEY = 'nv1-edits-v1';
  const PAGE_TITLE = 'InspirAcción Nivel 1';

  /* ---------- Estilos inyectados ---------- */
  const style = document.createElement('style');
  style.textContent = `
    [data-edit-key] {
      outline: 1px dashed transparent;
      outline-offset: 4px;
      border-radius: 3px;
      transition: outline-color .2s ease, background-color .2s ease;
      cursor: text;
    }
    [data-edit-key]:hover {
      outline-color: rgba(214, 176, 106, 0.55);
      background-color: rgba(214, 176, 106, 0.06);
    }
    [data-edit-key]:focus {
      outline: 2px solid #D6B06A;
      outline-offset: 4px;
      background-color: rgba(214, 176, 106, 0.10);
    }
    [data-edit-key].nv1-edit-changed {
      background-color: rgba(214, 176, 106, 0.14);
    }

    .nv1-edit-banner {
      position: fixed; top: 0; left: 0; right: 0;
      background: #0A140F; color: #F5F3EE;
      font-family: 'Schibsted Grotesk', -apple-system, sans-serif;
      font-size: 13px; letter-spacing: 0.04em;
      padding: 12px 24px; text-align: center;
      z-index: 999998; box-shadow: 0 2px 16px rgba(0,0,0,0.18);
    }
    .nv1-edit-banner b { color: #D6B06A; font-weight: 600; letter-spacing: 0.08em; }

    .nv1-edit-toolbar {
      position: fixed; bottom: 24px; right: 24px;
      background: #F5F3EE; color: #0A140F;
      border: 1px solid #0A140F;
      border-radius: 14px;
      padding: 14px 18px;
      font-family: 'Schibsted Grotesk', -apple-system, sans-serif;
      font-size: 13px;
      box-shadow: 0 12px 40px rgba(10, 20, 15, 0.18);
      z-index: 999999;
      display: flex; flex-direction: column; gap: 10px;
      min-width: 220px;
    }
    .nv1-edit-toolbar .nv1-edit-header {
      display: flex; justify-content: space-between; align-items: center;
      gap: 12px;
    }
    .nv1-edit-toolbar .nv1-edit-counter {
      font-weight: 600; letter-spacing: 0.04em;
    }
    .nv1-edit-toolbar .nv1-edit-counter b { color: #B8893E; }
    .nv1-edit-toolbar button {
      font-family: inherit; font-size: 12px; letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 9px 14px; border-radius: 999px; cursor: pointer;
      border: 1px solid #0A140F; background: transparent; color: #0A140F;
      transition: background .2s ease, color .2s ease;
    }
    .nv1-edit-toolbar button:hover { background: #0A140F; color: #F5F3EE; }
    .nv1-edit-toolbar button.primary {
      background: #0A140F; color: #F5F3EE;
    }
    .nv1-edit-toolbar button.primary:hover { background: #1a2a1f; }
    .nv1-edit-toolbar button.ghost {
      border-color: rgba(10, 20, 15, 0.35);
      color: rgba(10, 20, 15, 0.7);
    }
    .nv1-edit-toolbar button.ghost:hover {
      background: rgba(10, 20, 15, 0.08); color: #0A140F;
    }
    .nv1-edit-toolbar .row { display: flex; gap: 8px; flex-wrap: wrap; }

    @media (max-width: 600px) {
      .nv1-edit-toolbar {
        right: 12px; bottom: 12px; left: 12px;
        min-width: 0;
      }
    }

    /* Ocultar cursor custom y restaurar cursor del sistema en TODOS los elementos */
    body.nv1-edit-mode #invertCursor,
    body.nv1-edit-mode [id*="cursor" i],
    body.nv1-edit-mode .cursor,
    body.nv1-edit-mode .custom-cursor { display: none !important; }
    body.nv1-edit-mode,
    body.nv1-edit-mode * { cursor: auto !important; }
    body.nv1-edit-mode a,
    body.nv1-edit-mode button,
    body.nv1-edit-mode [role="button"] { cursor: pointer !important; }
    body.nv1-edit-mode [data-edit-key] { cursor: text !important; }

    /* Reservar espacio arriba para el banner */
    body.nv1-edit-mode { padding-top: 44px; }
    body.nv1-edit-mode .nv1-header { top: 44px !important; }
  `;
  document.head.appendChild(style);

  /* ---------- Detección automática de "hojas de texto" ----------
     En vez de listar selectores específicos, recorremos las zonas editables
     y marcamos cualquier elemento que sea hoja de texto: tag de texto,
     con contenido no vacío, cuyos hijos sean solo texto o inline-text. */

  // Tags candidatos a tener copy editable
  const TEXT_TAGS = new Set([
    'P','H1','H2','H3','H4','H5','H6','LI','SUMMARY',
    'BLOCKQUOTE','CITE','STRONG','EM','SPAN','A','BUTTON','LABEL','DIV','FIGCAPTION'
  ]);
  // Tags inline permitidos como hijos (NO descalifican al padre)
  const INLINE_TAGS = new Set(['EM','STRONG','I','B','BR','U','SMALL','MARK','SUB','SUP','SPAN','A']);
  // Selectores raíz desde donde buscar
  const ROOT_SELECTORS = '.nv1-cover, .nv1-section, .nv1-header, .nv1-footer';

  function isLeafText(el) {
    if (!TEXT_TAGS.has(el.tagName)) return false;
    // Saltar si está dentro de un img/svg/canvas/video
    if (el.closest('img, svg, canvas, video, picture, source, script, style, noscript')) return false;
    // Debe tener texto visible
    const txt = (el.textContent || '').trim();
    if (!txt) return false;
    // Sus hijos elemento solo pueden ser inline-text
    for (const ch of el.children) {
      if (!INLINE_TAGS.has(ch.tagName)) return false;
    }
    return true;
  }

  /* ---------- Detectar sección de un elemento ---------- */
  function sectionOf(el) {
    let n = el;
    while (n && n !== document.body) {
      if (n.classList) {
        for (const c of n.classList) {
          if (c.startsWith('nv1-') && c !== 'nv1-section' && c !== 'nv1-body') {
            // ej: nv1-cover, nv1-pitch, nv1-promesa
            return c.replace(/^nv1-/, '');
          }
        }
      }
      n = n.parentNode;
    }
    return 'general';
  }

  const SECTION_LABELS = {
    'cover': '01 — Portada',
    'pitch': '02 — El programa',
    'promesa': '03 — Promesa',
    'para-vos': '04 — ¿Es para mí?',
    'instructor': '05 — Instructor',
    'programa': '06 — Programa paso a paso',
    'bonos': '07 — Bonos',
    'capacidades': '08 — Capacidades',
    'fundamentos': '09 — Fundamentos',
    'faq': '10 — Preguntas frecuentes',
    'testimonios': '11 — Testimonios',
    'encuesta': '12 — Encuesta · datos',
    'cta-final': '13 — CTA final',
  };

  function labelFor(sec) {
    return SECTION_LABELS[sec] || sec;
  }

  /* ---------- Estado ---------- */
  const originals = new Map();       // key → original text
  const edits = new Map();           // key → current edited text (solo si != original)
  const elements = new Map();        // key → DOM element

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch { return {}; }
  }

  function save() {
    const obj = {};
    edits.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }

  /* ---------- Marcar elementos editables ---------- */
  function init() {
    document.body.classList.add('nv1-edit-mode');

    const stored = load();
    let i = 0;
    // Recorremos todos los descendants de las zonas editables y elegimos hojas de texto
    const candidates = [];
    document.querySelectorAll(ROOT_SELECTORS).forEach((root) => {
      root.querySelectorAll('*').forEach((el) => {
        if (isLeafText(el)) candidates.push(el);
      });
    });

    candidates.forEach((el) => {
      // Saltar si ya está dentro de otro editable
      if (el.closest('[data-edit-key]')) return;

      const sec = sectionOf(el);
      const key = `${sec}-${i++}`;
      const original = el.textContent;
      originals.set(key, original);
      elements.set(key, el);
      el.setAttribute('data-edit-key', key);
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'false');

      // Restaurar edición previa del localStorage
      if (stored[key] && stored[key] !== original) {
        el.textContent = stored[key];
        edits.set(key, stored[key]);
        el.classList.add('nv1-edit-changed');
      }

      el.addEventListener('input', () => {
        const cur = el.textContent;
        if (cur === original) {
          edits.delete(key);
          el.classList.remove('nv1-edit-changed');
        } else {
          edits.set(key, cur);
          el.classList.add('nv1-edit-changed');
        }
        save();
        updateCounter();
      });

      // Prevenir saltos de línea con Enter (mantiene single-line en titulares)
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          // Permite Enter en párrafos largos, bloquea en eyebrow/titulares
          const tag = el.tagName.toLowerCase();
          const isHeading = tag.startsWith('h') ||
            el.classList.contains('nv1-eyebrow') ||
            el.classList.contains('nv1-cover-meta');
          if (isHeading) e.preventDefault();
        }
      });
    });

    buildUI();
    disableAnimations();
    updateCounter();
  }

  /* ---------- Desactivar animaciones/cursor para no molestar ---------- */
  function disableAnimations() {
    // Destruir Lenis completamente (stop solo pausa, destroy libera el scroll nativo)
    if (window.lenis) {
      try {
        if (typeof window.lenis.destroy === 'function') window.lenis.destroy();
        else if (typeof window.lenis.stop === 'function') window.lenis.stop();
      } catch {}
      window.lenis = null;
    }
    // Limpiar estilos que Lenis pudo dejar en html/body
    document.documentElement.classList.remove('lenis', 'lenis-smooth', 'lenis-stopped');
    document.documentElement.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('height');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('height');
    document.body.style.overflowY = 'auto';
    // Detener GSAP ScrollTrigger
    if (window.ScrollTrigger && typeof ScrollTrigger.getAll === 'function') {
      try {
        ScrollTrigger.getAll().forEach((t) => t.kill());
      } catch {}
    }
    // Forzar visibilidad de elementos que GSAP dejó en opacity:0
    if (window.gsap) {
      try {
        gsap.set('.nv1-section, .nv1-section *, .nv1-cover, .nv1-cover *', {
          opacity: 1, y: 0, clearProps: 'all'
        });
      } catch {}
    }
  }

  /* ---------- UI: banner + toolbar ---------- */
  let counterEl;
  function buildUI() {
    const banner = document.createElement('div');
    banner.className = 'nv1-edit-banner';
    banner.innerHTML = `<b>MODO REVISIÓN</b> &nbsp;·&nbsp; Hacé click sobre cualquier texto para editarlo. Cuando termines, tocá <b>Descargar cambios</b>.`;
    document.body.appendChild(banner);

    const bar = document.createElement('div');
    bar.className = 'nv1-edit-toolbar';
    bar.innerHTML = `
      <div class="nv1-edit-header">
        <div class="nv1-edit-counter"><b id="nv1-edit-count">0</b> cambios</div>
      </div>
      <div class="row">
        <button class="primary" id="nv1-edit-download">Descargar cambios</button>
      </div>
      <div class="row">
        <button class="ghost" id="nv1-edit-reset">Limpiar todo</button>
        <button class="ghost" id="nv1-edit-exit">Salir</button>
      </div>
    `;
    document.body.appendChild(bar);
    counterEl = document.getElementById('nv1-edit-count');

    document.getElementById('nv1-edit-download').addEventListener('click', download);
    document.getElementById('nv1-edit-reset').addEventListener('click', resetAll);
    document.getElementById('nv1-edit-exit').addEventListener('click', exitMode);
  }

  function updateCounter() {
    if (counterEl) counterEl.textContent = edits.size;
  }

  /* ---------- Reset ---------- */
  function resetAll() {
    if (edits.size === 0) return;
    if (!confirm('¿Borrar todos los cambios y volver al texto original?')) return;
    edits.clear();
    originals.forEach((orig, key) => {
      const el = elements.get(key);
      if (el) {
        el.textContent = orig;
        el.classList.remove('nv1-edit-changed');
      }
    });
    save();
    updateCounter();
  }

  /* ---------- Salir ---------- */
  function exitMode() {
    if (edits.size > 0) {
      if (!confirm('Tenés cambios sin descargar. ¿Salir igualmente?')) return;
    }
    const url = new URL(location.href);
    url.searchParams.delete('edit');
    location.href = url.toString();
  }

  /* ---------- Descarga ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function timestamp() {
    const d = new Date();
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  function download() {
    if (edits.size === 0) {
      alert('Todavía no hiciste cambios para descargar.');
      return;
    }

    // Agrupar por sección
    const bySection = {};
    edits.forEach((edited, key) => {
      const sec = key.replace(/-\d+$/, '');
      if (!bySection[sec]) bySection[sec] = [];
      bySection[sec].push({ key, original: originals.get(key), edited });
    });

    // Archivo TXT legible
    const now = new Date();
    const fechaTxt = now.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
    let txt = `${PAGE_TITLE} — Revisión de copy\n`;
    txt += `Cliente: Agustín Trowell · Fecha: ${fechaTxt}\n`;
    txt += `Total de cambios: ${edits.size}\n`;
    txt += `\n`;

    const orderedSections = [
      'cover','pitch','promesa','para-vos','instructor','programa',
      'bonos','capacidades','fundamentos','faq','testimonios','encuesta','cta-final'
    ];
    orderedSections.forEach((sec) => {
      if (!bySection[sec]) return;
      txt += `═══════════════════════════════════════════════════════\n`;
      txt += `SECCIÓN: ${labelFor(sec)}\n`;
      txt += `═══════════════════════════════════════════════════════\n\n`;
      bySection[sec].forEach((e) => {
        txt += `[ANTES]\n${e.original.trim()}\n\n`;
        txt += `[DESPUÉS]\n${e.edited.trim()}\n\n`;
        txt += `───────────────────────────────────────────────────────\n\n`;
      });
    });

    // Archivo JSON estructurado
    const jsonData = [];
    orderedSections.forEach((sec) => {
      (bySection[sec] || []).forEach((e) => {
        jsonData.push({
          section: sec,
          section_label: labelFor(sec),
          key: e.key,
          original: e.original,
          edited: e.edited,
        });
      });
    });
    const json = JSON.stringify(jsonData, null, 2);

    const ts = timestamp();
    triggerDownload(`inspiraccion-nivel-1-cambios-${ts}.txt`, txt, 'text/plain;charset=utf-8');
    setTimeout(() => {
      triggerDownload(`inspiraccion-nivel-1-cambios-${ts}.json`, json, 'application/json');
    }, 300);
  }

  function triggerDownload(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------- Boot ---------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 800));
  } else {
    setTimeout(init, 800);
  }
})();
