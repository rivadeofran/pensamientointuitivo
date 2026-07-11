document.addEventListener('DOMContentLoaded', () => {

  // 0. CMS content loader — si existen content/*.json, sobreescribe el HTML hardcoded.
  // Si falla el fetch (ej. local sin server, o JSON malformado), el HTML hardcoded queda como fallback.
  (async function loadCMSContent() {
    try {
      const [programasRes, portadasRes, statsRes] = await Promise.allSettled([
        fetch('content/programas.json', { cache: 'no-store' }),
        fetch('content/portadas.json', { cache: 'no-store' }),
        fetch('content/stats.json', { cache: 'no-store' })
      ]);

      if (programasRes.status === 'fulfilled' && programasRes.value.ok) {
        const data = await programasRes.value.json();
        const cards = document.querySelectorAll('.prog-card-wrapper');
        (data.items || []).forEach((p, i) => {
          const card = cards[i]; if (!card) return;
          card.querySelectorAll('.prog-name').forEach(el => {
            const nombre = p.nombre || '';
            const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
            const m = nombre.match(/^(.*?)\s+(Nivel\s+\d+)\s*$/i);
            const sep = nombre.match(/^(.+?)\s+[-–]\s+(.+)$/); // "Nombre - subtítulo"
            if (m) {
              const lvl = m[2].trim();
              const lvlClass = /2/.test(lvl) ? 'prog-name-level--n2' : 'prog-name-level--n1';
              el.innerHTML = esc(m[1]) + ' <span class="prog-name-level ' + lvlClass + '">' + esc(lvl) + '</span>';
            } else if (sep) {
              el.innerHTML = esc(sep[1].trim()) + '<span class="prog-name-sub">' + esc(sep[2].trim()) + '</span>';
            } else {
              el.textContent = nombre;
            }
          });
          const mod = card.querySelector('.prog-modality');
          if (mod && p.modalidad) {
            mod.lastChild.textContent = ' ' + p.modalidad;
            mod.className = 'prog-modality prog-modality--' + (p.modalidad_tipo || 'online');
          }
          const desc = card.querySelector('.prog-desc-front');
          if (desc && p.descripcion) desc.textContent = p.descripcion;
          const sub = card.querySelector('.prog-subtitle');
          if (sub && p.subtitulo) sub.textContent = p.subtitulo;
          const badge = card.querySelector('.prog-badge');
          if (badge && p.badge !== undefined) {
            if (p.badge) badge.textContent = p.badge;
            else badge.remove();
          }
          const metaNote = card.querySelector('.prog-meta-note');
          if (metaNote && p.metaNote !== undefined) {
            if (p.metaNote) metaNote.textContent = p.metaNote;
            else metaNote.remove();
          }
          if (p.media) {
            const imgEl = card.querySelector('.prog-card-img img');
            const vidEl = card.querySelector('.prog-card-img video');
            const wrap = card.querySelector('.prog-card-img');
            const isVideo = /\.(mp4|webm|mov)$/i.test(p.media);
            if (isVideo) {
              if (imgEl) imgEl.remove();
              if (!vidEl) {
                const v = document.createElement('video');
                v.autoplay = v.loop = v.muted = v.playsInline = true;
                v.preload = 'metadata';
                v.innerHTML = `<source src="${p.media}" type="video/mp4">`;
                wrap.prepend(v);
              } else {
                const src = vidEl.querySelector('source');
                if (src) { src.src = p.media; vidEl.load(); }
              }
            } else {
              if (vidEl) vidEl.remove();
              if (!imgEl) {
                const img = document.createElement('img');
                img.src = p.media; img.alt = '';
                wrap.prepend(img);
              } else {
                imgEl.src = p.media;
              }
            }
          }
          if (p.whatsapp_text) {
            const cta = card.querySelector('.prog-cta');
            // Solo sobrescribimos el href si actualmente apunta a WhatsApp.
            // Si el HTML ya definió un destino que no es WhatsApp (ej. una sub-página),
            // se respeta tal cual.
            if (cta && cta.getAttribute('href').startsWith('https://wa.me/')) {
              cta.href = 'https://wa.me/5584981811901?text=' + encodeURIComponent(p.whatsapp_text);
            }
          }
        });
      }

      if (portadasRes.status === 'fulfilled' && portadasRes.value.ok) {
        const data = await portadasRes.value.json();
        const banner = document.getElementById('bannerImg');
        if (banner && data.banner) banner.src = data.banner;
      }

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const data = await statsRes.value.json();
        const statNums = document.querySelectorAll('.stat-num');
        const statLabels = document.querySelectorAll('.stat-label');
        (data.items || []).forEach((s, i) => {
          if (statNums[i]) { statNums[i].removeAttribute('data-target'); statNums[i].textContent = s.value; }
          if (statLabels[i]) statLabels[i].textContent = s.label;
        });
      }
    } catch (e) {
      console.warn('CMS content no cargado (usando HTML hardcoded):', e);
    }
  })();

  // 1. Initialize Lenis (Smooth Scroll) - Paused initially for preloader
  // Modo "lerp" (deslizamiento flotante, estilo Voldog): scroll continuo con inercia suave.
  const lenis = new Lenis({
    lerp: 0.06,
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    wheelMultiplier: 1.05,
    mouseMultiplier: 1.05,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  });
  
  lenis.stop(); // Stop scroll while loading

  gsap.registerPlugin(ScrollTrigger);
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  // Curva de marca (cubic-bezier 0.32, 0.72, 0, 1) como ease reutilizable de GSAP.
  // Una sola curva pausada para todo el sitio: frena suave, sin rebote.
  const brandEase = (function () {
    const bx = (t) => 3 * Math.pow(1 - t, 2) * t * 0.32 + t * t * t;
    const by = (t) => 3 * Math.pow(1 - t, 2) * t * 0.72 + 3 * (1 - t) * t * t + t * t * t;
    return (x) => {
      let lo = 0, hi = 1, u = 0.5;
      for (let i = 0; i < 20; i++) { u = (lo + hi) / 2; (bx(u) < x) ? (lo = u) : (hi = u); }
      return by(u);
    };
  })();

  // 2. Prepare Split Text for Hero Reveal
  // Solo 'words' (sin 'lines'): las palabras fluyen y envuelven naturalmente según la tipografía
  // real, evitando el bug de líneas mal medidas antes de que carguen las webfonts (palabras huérfanas).
  const splitLines = new SplitType('.split-line', { types: 'words' });

  gsap.set('.split-line .word', { y: 40, opacity: 0 });
  gsap.set('.hero-divider', { width: 0 });

  // 3. Preloader Sequence — versión corta (~1.5s), saltable, y solo en la primera visita de la sesión
  const preloaderEl = document.getElementById('preloader');
  const matrixTextEl = document.getElementById('matrixText');
  const preloaderLogo = document.getElementById('preloaderLogo');

  let tlLoader;
  let preloaderDone = false;

  function toggleSkipListeners(add) {
    const fn = add ? window.addEventListener : window.removeEventListener;
    fn('wheel', onSkip, { passive: true });
    fn('touchmove', onSkip, { passive: true });
    fn('keydown', onSkip);
    fn('click', onSkip);
  }
  function finishPreloader() {
    if (preloaderDone) return;
    preloaderDone = true;
    toggleSkipListeners(false);
    if (preloaderEl) preloaderEl.style.display = 'none';
    lenis.start(); // Habilitar scroll
    triggerHeroReveal();
  }
  function onSkip() {
    if (preloaderDone) return;
    if (tlLoader) tlLoader.kill();
    gsap.to('#preloader', { autoAlpha: 0, duration: 0.35, ease: 'power3.inOut', onComplete: finishPreloader });
  }

  if (sessionStorage.getItem('epiPreloaderSeen')) {
    // Ya se vio en esta sesión: entrar directo, sin preloader
    finishPreloader();
  } else {
    sessionStorage.setItem('epiPreloaderSeen', '1');
    if (matrixTextEl) matrixTextEl.textContent = 'Reconfigurando percepción';

    tlLoader = gsap.timeline({ onComplete: finishPreloader });
    if (preloaderLogo) {
      tlLoader.to(preloaderLogo, { opacity: 0.85, duration: 0.6, ease: 'power2.out' }, 0);
    }
    // Texto entra y se sostiene ~1s para poder leerlo (solo en la primera visita de la sesión)
    tlLoader.fromTo(matrixTextEl, { opacity: 0 }, { opacity: 1, duration: 0.55, ease: 'power2.out' }, 0.3);
    tlLoader.call(() => { window.dispatchEvent(new Event('explodePreloader')); }, null, 1.85);
    tlLoader.to('#preloader', { autoAlpha: 0, duration: 0.55, ease: 'power3.inOut' }, 1.85);

    toggleSkipListeners(true); // Saltar con scroll, toque, click o tecla
  }

  // 4. Hero Reveal Sequence (Awwwards Style Stagger)
  function triggerHeroReveal() {
    const tlHero = gsap.timeline();
    // Fade in the header corner logo video
    const headerLogo = document.getElementById('headerLogoVideo');
    if (headerLogo) {
      tlHero.to(headerLogo, { opacity: 1, duration: 2, ease: "power2.inOut" }, 0.5);
    }

    // Brand stamp reveal — sutil fade + slide (legacy, sólo si existe en la página)
    const brandStamp = document.getElementById('heroBrandStamp');
    if (brandStamp) {
      gsap.set(brandStamp, { y: 12, opacity: 0 });
      tlHero.to(brandStamp, {
        opacity: 1,
        y: 0,
        duration: 1.2,
        ease: brandEase
      }, 0.2);
    }

    // Hero title reveal — stagger de las 3 líneas (Escuela del / Pensamiento / Intuitivo.)
    const titleParts = document.querySelectorAll('.hero-title > span');
    if (titleParts.length) {
      gsap.set(titleParts, { y: 30, opacity: 0 });
      tlHero.to(titleParts, {
        opacity: 1,
        y: 0,
        duration: 1.1,
        stagger: 0.14,
        ease: brandEase
      }, 0);
    }

    tlHero.to('.hero-divider', {
      width: 60,
      duration: 1.2,
      ease: brandEase
    }, 0.4)
    .to('.split-line .word', {
      y: 0, opacity: 1,
      duration: 1,
      stagger: 0.015,
      ease: brandEase
    }, 0.6)
    .fromTo('.scroll-cue', 
      { autoAlpha: 0, y: 20 },
      { autoAlpha: 1, y: 0, duration: 1.5, ease: brandEase },
      1.5
    );
  }

  // 5. Dynamic Bulletin Panel Logic — Conectado a Google Sheets (Multi-Modo)
  const SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTkmDyxyWLYdonFBidesVWPA2wkHiWGvyd2Qra-uZWGLJP06_5wWwMRgmAq55nDmCnvB3Xwd7Zbp1KG/pub?gid=0&single=true&output=csv';

  function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return null;
    const headers = lines[0].split(',').map(h => h.trim().replace(/\r/g, ''));
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < lines[1].length; i++) {
      const char = lines[1][i];
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { values.push(current.trim().replace(/\r/g, '')); current = ''; continue; }
      current += char;
    }
    values.push(current.trim().replace(/\r/g, ''));
    const result = {};
    headers.forEach((h, i) => { result[h] = values[i] || ''; });
    return result;
  }

  // Extract YouTube video ID from various URL formats
  function getYouTubeId(url) {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  }

  // Extract Spotify episode/show URI from URL
  function getSpotifyEmbedUrl(url) {
    if (!url) return null;
    // Supports: open.spotify.com/episode/ID, open.spotify.com/show/ID
    const match = url.match(/open\.spotify\.com\/(episode|show)\/([a-zA-Z0-9]+)/);
    if (match) return `https://open.spotify.com/embed/${match[1]}/${match[2]}?theme=0`;
    return null;
  }

  // Helper: aplica un href al botón CTA. Si es URL externa (http/https), abre en pestaña nueva.
  function applyCtaUrl(anchorEl, url) {
    if (!anchorEl) return;
    const final = url || '#';
    anchorEl.href = final;
    if (/^https?:\/\//i.test(final)) {
      anchorEl.target = '_blank';
      anchorEl.rel = 'noopener noreferrer';
    } else {
      anchorEl.removeAttribute('target');
      anchorEl.removeAttribute('rel');
    }
  }

  async function fetchLiveAnnouncement() {
    const annPanel = document.getElementById('heroAnnouncement');
    if (!annPanel) return;

    const panelContent = document.getElementById('panelContent');
    const modeAnuncio = document.getElementById('modeAnuncio');
    const modeVideo = document.getElementById('modeVideo');
    const modePodcast = document.getElementById('modePodcast');

    // Aplica datos al panel (data viene de Sheets o de content/panel_hero.json)
    const applyPanelData = (data) => {
      const tipo = (data.tipo || 'anuncio').toLowerCase().trim();
      panelContent.style.opacity = 0;
      setTimeout(() => {
        if (modeAnuncio) modeAnuncio.style.display = 'none';
        if (modeVideo) modeVideo.style.display = 'none';
        if (modePodcast) modePodcast.style.display = 'none';
        if (tipo === 'video') {
          // === MODO VIDEO (YouTube) ===
          if (modeVideo) {
            modeVideo.style.display = 'flex';
            const vidLabel = document.getElementById('vidLabel');
            const vidTitle = document.getElementById('vidTitle');
            const vidEmbed = document.getElementById('vidEmbed');
            const vidCtaUrl = document.getElementById('vidCtaUrl');
            const vidCtaText = document.getElementById('vidCtaText');

            if (vidLabel) vidLabel.textContent = data.label || 'VIDEO';
            if (vidTitle) vidTitle.textContent = data.title || '';
            
            const ytId = getYouTubeId(data.videoUrl);
            if (vidEmbed && ytId) {
              vidEmbed.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
            }
            applyCtaUrl(vidCtaUrl, data.ctaUrl || data.videoUrl);
            if (vidCtaText) vidCtaText.textContent = data.ctaText || 'VER EN YOUTUBE';
          }

        } else if (tipo === 'podcast') {
          // === MODO PODCAST (Spotify) ===
          if (modePodcast) {
            modePodcast.style.display = 'flex';
            const podLabel = document.getElementById('podLabel');
            const podTitle = document.getElementById('podTitle');
            const podDesc = document.getElementById('podDesc');
            const podEmbed = document.getElementById('podEmbed');
            const podCtaUrl = document.getElementById('podCtaUrl');
            const podCtaText = document.getElementById('podCtaText');

            if (podLabel) podLabel.textContent = data.label || 'PODCAST';
            if (podTitle) podTitle.textContent = data.title || '';
            if (podDesc) podDesc.textContent = data.description || '';

            const spotifyUrl = getSpotifyEmbedUrl(data.spotifyUrl);
            if (podEmbed && spotifyUrl) {
              podEmbed.innerHTML = `<iframe src="${spotifyUrl}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
            }
            applyCtaUrl(podCtaUrl, data.ctaUrl || data.spotifyUrl);
            if (podCtaText) podCtaText.textContent = data.ctaText || 'ESCUCHAR EN SPOTIFY';
          }

        } else {
          // === MODO ANUNCIO (default) ===
          if (modeAnuncio) {
            modeAnuncio.style.display = 'flex';
            const elLabel = document.getElementById('annLabel');
            const elTitle = document.getElementById('annTitle');
            const elDesc = document.getElementById('annDesc');
            const elMeta = document.getElementById('annMeta');
            const elCtaUrl = document.getElementById('annCtaUrl');
            const elCtaText = document.getElementById('annCtaText');

            if (elLabel) elLabel.textContent = data.label || 'ANUNCIO';
            if (elTitle) elTitle.textContent = data.title || '';
            if (elDesc) elDesc.textContent = data.description || '';
            if (elMeta) elMeta.innerHTML = `<span class="meta-item">${data.meta1 || ''}</span><span class="meta-item">•</span><span class="meta-item">${data.meta2 || ''}</span>`;
            if (elCtaText) elCtaText.textContent = data.ctaText || 'VER MÁS';
            applyCtaUrl(elCtaUrl, data.ctaUrl || '#programas');
          }
        }

        // Fade in
        panelContent.style.opacity = 1;
      }, 600);
    };

    // 1) Sheets primero (fuente primaria, live)
    try {
      const response = await fetch(SHEETS_CSV_URL);
      if (!response.ok) throw new Error('Sheets network response was not ok');
      const csvText = await response.text();
      const data = parseCSV(csvText);
      if (!data || !data.title) throw new Error('Sheets devolvió data vacía');
      applyPanelData(data);
      return;
    } catch (error) {
      console.warn('Sheets no disponible, intentando fallback Decap:', error);
    }

    // 2) Fallback: Decap JSON
    try {
      const r = await fetch('content/panel_hero.json', { cache: 'no-store' });
      if (!r.ok) throw new Error('panel_hero.json no encontrado');
      const data = await r.json();
      if (data && data.title) applyPanelData(data);
    } catch (e) {
      console.warn('Fallback Decap también falló — usando HTML hardcoded:', e);
    }
  }

  fetchLiveAnnouncement();

  // 5. Header Scroll Logic
  const header = document.getElementById('header');
  lenis.on('scroll', (e) => {
    if(!header) return;
    const y = e.scroll;
    const dir = e.direction;
    
    if (y < 60) {
      // At the top
      header.classList.remove('is-hidden', 'is-compact');
    } else {
      if (dir === 1) {
        // Scrolling down
        header.classList.add('is-hidden');
        header.classList.remove('is-compact');
      } else if (dir === -1) {
        // Scrolling up
        header.classList.remove('is-hidden');
        header.classList.add('is-compact');
      }
    }
  });

  // 6. Magnetic Buttons
  const magneticEls = document.querySelectorAll('.magnetic-btn');
  magneticEls.forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(el, { x: x * 0.3, y: y * 0.3, duration: 0.4, ease: "power2.out" });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: brandEase });
    });
  });

  // 7. General GSAP Reveals (Scroll Storytelling)
  gsap.utils.toArray('.gs_reveal:not(.gs_left):not(.gs_right):not(.gs_up)').forEach((el) => {
    gsap.fromTo(el, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: brandEase, scrollTrigger: { trigger: el, start: "top 85%" } });
  });
  gsap.utils.toArray('.gs_left').forEach((el) => {
    gsap.fromTo(el, { autoAlpha: 0, x: -60 }, { autoAlpha: 1, x: 0, duration: 1.4, ease: brandEase, scrollTrigger: { trigger: el, start: "top 85%" } });
  });
  gsap.utils.toArray('.gs_right').forEach((el) => {
    gsap.fromTo(el, { autoAlpha: 0, x: 60 }, { autoAlpha: 1, x: 0, duration: 1.4, ease: brandEase, scrollTrigger: { trigger: el, start: "top 85%" } });
  });
  gsap.utils.toArray('.gs_up').forEach((el) => {
    gsap.fromTo(el, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: brandEase, scrollTrigger: { trigger: el, start: "top 85%" } });
  });

  document.querySelectorAll('.pillars, .footer-grid').forEach(container => {
    const items = container.querySelectorAll('.gs_stagger');
    gsap.fromTo(items, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.15, ease: brandEase, scrollTrigger: { trigger: container, start: "top 85%", onEnter: () => {
      container.querySelectorAll('.pillar').forEach(p => p.classList.add('is-drawn'));
    } } });
  });

  const loopSection = document.querySelector('.loop-section');
  if(loopSection) {
    const loopNodes = loopSection.querySelectorAll('.loop-dot');
    let tlLoop = gsap.timeline({ scrollTrigger: { trigger: loopSection, start: "top 70%" } });
    tlLoop.fromTo(loopNodes, { scale: 0.5, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.8, stagger: 0.3, ease: brandEase }, 0);

  }

  // Header theme switcher (sección "leída" desde el top del viewport)
  (function() {
    const sections = document.querySelectorAll('[data-section-theme]');
    if (!sections.length) return;
    const probeY = 80; // px debajo del top del viewport (debajo del header)
    let currentTheme = '';
    let rafId = null;
    function update() {
      rafId = null;
      let found = '';
      for (const s of sections) {
        const r = s.getBoundingClientRect();
        if (r.top <= probeY && r.bottom > probeY) {
          found = s.getAttribute('data-section-theme') || '';
          break;
        }
      }
      if (found && found !== currentTheme) {
        currentTheme = found;
        document.documentElement.setAttribute('data-header-theme', found);
      }
    }
    function onScroll() { if (rafId === null) rafId = requestAnimationFrame(update); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  })();

  // Zoom-in del hero al scrollear (estilo Voldog): el video se acerca suave mientras
  // la sección Programas sube por encima. Atado al scroll (scrub) para máxima suavidad.
  const heroVideo = document.querySelector('.hero-video');
  if (heroVideo) {
    gsap.fromTo(heroVideo, { scale: 1 }, {
      scale: 1.16,
      ease: "none",
      scrollTrigger: { trigger: '.hero', start: "top top", end: "+=90%", scrub: true }
    });
  }

  // Intro de Programas: entra deslizándose hacia la derecha, al costado de la pregunta.
  // Atado al scroll (scrub) para que el desplazamiento sea fluido y lo controle el usuario.
  const progIntro = document.querySelector('.prog-intro');
  if (progIntro && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.fromTo(progIntro, { x: -70, opacity: 0 }, {
      x: 0,
      opacity: 1,
      ease: 'none', // en un scrub la curva la da el scroll
      scrollTrigger: { trigger: '.programas-head', start: 'top 78%', end: 'top 42%', scrub: true }
    });
  }

  // Parallax
  gsap.utils.toArray('.gs_parallax').forEach(img => {
    gsap.to(img, { yPercent: 15, ease: "none", scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
  });
  gsap.utils.toArray('.parallax-bg').forEach(bg => {
    gsap.to(bg, { yPercent: 20, ease: "none", scrollTrigger: { trigger: bg.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
  });
  gsap.utils.toArray('.gs_card').forEach(card => {
    const speed = card.getAttribute('data-speed') || 1;
    gsap.to(card, { y: () => -50 * speed, ease: "none", scrollTrigger: { trigger: '.programas', start: "top bottom", end: "bottom top", scrub: 1 } });
  });
  gsap.utils.toArray('.gs_exp').forEach(card => {
    const speed = card.getAttribute('data-speed') || 1;
    gsap.fromTo(card, { y: 50 }, { y: () => -80 * speed, ease: "none", scrollTrigger: { trigger: '.experiencia', start: "top bottom", end: "bottom top", scrub: 1 } });
  });
  const scrollCue = document.querySelector('.scroll-cue');
  if (scrollCue) {
    gsap.to(scrollCue, {
      opacity: 0,
      y: 20,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: '40% top', scrub: true }
    });
  }
  gsap.utils.toArray('.qb-dropcap').forEach(dc => {
    const section = dc.closest('section');
    gsap.fromTo(dc,
      { y: -520, opacity: 0, rotation: -6 },
      {
        y: 0,
        opacity: 1,
        rotation: 0,
        ease: brandEase,
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "top 35%",
          scrub: 1.2
        }
      }
    );
  });

  // Stats — dígitos cayendo con peso (uno por uno, stagger)
  document.querySelectorAll('.stat-num').forEach(num => {
    const targetAttr = num.getAttribute('data-target');
    let finalStr;
    if (targetAttr) {
      const n = parseInt(targetAttr);
      finalStr = "+" + (n > 1000 ? n.toLocaleString('es-AR') : n);
    } else {
      finalStr = num.textContent.trim();
    }
    num.innerHTML = '';
    [...finalStr].forEach(ch => {
      const span = document.createElement('span');
      span.className = 'stat-digit';
      span.textContent = ch;
      num.appendChild(span);
    });
    gsap.from(num.querySelectorAll('.stat-digit'), {
      y: -70,
      opacity: 0,
      duration: 0.95,
      ease: brandEase,
      stagger: 0.085,
      scrollTrigger: { trigger: num, start: "top 85%" }
    });
  });

  // Smooth scroll for anchor links — solo intercepta si el href EN ESE MOMENTO sigue siendo un anchor interno (#algo).
  // Esto evita bloquear navegación cuando el href se cambia dinámicamente a una URL externa (ej: panel hero).
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if(id && id.startsWith('#') && id.length > 1){
        e.preventDefault();
        try {
          const target = document.querySelector(id);
          if(target) lenis.scrollTo(target, { offset: -60 });
        } catch(_) { /* selector inválido, dejamos pasar */ }
      }
    });
  });

  // 8. Floating Action Buttons Logic
  const fabs = document.querySelectorAll('.fab-btn');
  const persistCta = document.getElementById('persistCta');
  const progsSection = document.getElementById('programas');
  const inlineProgCta = document.querySelector('.btn-gold'); // "VER PROGRAMAS" de la sección Escuela
  // WhatsApp + Comunidad siempre visibles (también en el hero): los mostramos de entrada.
  fabs.forEach(fab => fab.classList.add('show'));
  lenis.on('scroll', () => {
    const y = window.scrollY;
    const vh = window.innerHeight;
    // CTA persistente: aparece cuando ya pasaste Programas, pero se oculta si el CTA inline
    // de Escuela está a la vista (para no duplicar "VER PROGRAMAS").
    if (persistCta && progsSection) {
      const passed = progsSection.getBoundingClientRect().bottom < vh * 0.4;
      let inlineVisible = false;
      if (inlineProgCta) {
        const r = inlineProgCta.getBoundingClientRect();
        inlineVisible = r.top < vh && r.bottom > 0;
      }
      persistCta.classList.toggle('show', passed && !inlineVisible);
    }
  });

  // 8b. Globito promocional de Comunidad: aparece al scrollear y hace un ciclo
  //     visible/oculto continuo con la carita de Agustín. Se puede cerrar con la ✕.
  (() => {
    const promo = document.getElementById('fabPromo');
    const fab = document.querySelector('.fab-comunidad');
    if (!promo || !fab) return;
    const closeBtn = document.getElementById('fabPromoClose');
    const link = promo.querySelector('.fab-promo-link');

    // En móvil el globo aparece en versión compacta y con ritmo más espaciado (no hay hover).
    const isMobile = window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 640px)').matches;
    const FIRST_MS   = isMobile ? 6000 : 3200;
    const VISIBLE_MS = isMobile ? 8000 : 10000;
    const HIDDEN_MS  = isMobile ? 16000 : 4000;

    let started = false, t = null;
    let dismissed = sessionStorage.getItem('epiPromoDismissed') === '1';

    function hide() { promo.classList.remove('show'); promo.setAttribute('aria-hidden', 'true'); }
    function cycleShow() {
      if (dismissed) return;
      // si la pestaña está en segundo plano, esperamos sin gastar la aparición
      if (document.hidden) { t = setTimeout(cycleShow, HIDDEN_MS); return; }
      promo.classList.add('show'); promo.setAttribute('aria-hidden', 'false');
      t = setTimeout(cycleHide, VISIBLE_MS);
    }
    function cycleHide() { hide(); t = setTimeout(cycleShow, HIDDEN_MS); }
    function stop() { dismissed = true; hide(); clearTimeout(t); }

    // Arranca el ciclo tras un breve retraso inicial (deja pasar el preloader).
    // Los botones ya están siempre visibles, así que el globito no depende del scroll.
    setTimeout(() => { if (!started && !dismissed) { started = true; cycleShow(); } }, FIRST_MS);

    // Hover sobre el botón de comunidad → muestra el globo (en vez de la leyenda del cursor).
    // Mientras el mouse está encima (del botón o del propio globo) queda fijo; al salir, retoma el ciclo.
    function holdOpen() { if (dismissed) return; clearTimeout(t); promo.classList.add('show'); promo.setAttribute('aria-hidden', 'false'); }
    function releaseOpen() { if (dismissed) return; clearTimeout(t); t = setTimeout(cycleHide, 500); }
    fab.addEventListener('mouseenter', holdOpen);
    fab.addEventListener('mouseleave', releaseOpen);
    promo.addEventListener('mouseenter', () => { clearTimeout(t); });
    promo.addEventListener('mouseleave', releaseOpen);

    if (closeBtn) closeBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      sessionStorage.setItem('epiPromoDismissed', '1'); stop();
    });
    if (link) link.addEventListener('click', () => {
      sessionStorage.setItem('epiPromoDismissed', '1'); stop();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
  })();

  // 8c. Menú móvil: hamburguesa → panel glass a pantalla completa
  (() => {
    const burger = document.getElementById('navBurger');
    const menu = document.getElementById('mobileMenu');
    if (!burger || !menu) return;
    const closeBtn = document.getElementById('mmClose');
    function open() {
      menu.classList.add('open'); document.body.classList.add('mm-open');
      menu.setAttribute('aria-hidden', 'false'); burger.setAttribute('aria-expanded', 'true');
      if (typeof lenis !== 'undefined' && lenis) lenis.stop();
    }
    function close() {
      menu.classList.remove('open'); document.body.classList.remove('mm-open');
      menu.setAttribute('aria-hidden', 'true'); burger.setAttribute('aria-expanded', 'false');
      if (typeof lenis !== 'undefined' && lenis) lenis.start();
    }
    burger.addEventListener('click', () => menu.classList.contains('open') ? close() : open());
    if (closeBtn) closeBtn.addEventListener('click', close);
    // tocar cualquier link cierra el panel; los anchors internos se re-disparan
    // DESPUÉS de reactivar Lenis (el handler global corre con Lenis aún parado)
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      close();
      const href = a.getAttribute('href');
      if (href && href.startsWith('#')) {
        const target = document.querySelector(href);
        if (target && typeof lenis !== 'undefined' && lenis) setTimeout(() => lenis.scrollTo(target, { offset: -60 }), 60);
      }
    }));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  })();

  // Loop circuit: auto-cycle 14s + click en nodo (pausa) + toggle pausa/play
  (() => {
    const circuit = document.querySelector('.loop-circuit');
    if (!circuit) return;
    const nodes = Array.from(circuit.querySelectorAll('.loop-node'));
    const center = circuit.querySelector('.loop-center');
    const nameEl = circuit.querySelector('.loop-active-name');
    const descEl = circuit.querySelector('.loop-center .loop-desc');
    const tpl = document.querySelector('#loop-data');
    const toggle = circuit.querySelector('.loop-toggle');
    const svg = circuit.querySelector('.loop-circuit-svg');
    if (!center || !descEl || !tpl) return;

    const data = Array.from(tpl.content.children).map(el => ({
      name: el.dataset.name,
      desc: el.dataset.desc,
    }));
    const PERIOD = 3500; // 4 nodos × 3.5s = 14s ciclo total
    let current = 0;
    let timer = null;
    let visible = true;
    let paused = false;

    const setActive = (idx) => {
      if (idx === current) return;
      current = idx;
      nodes.forEach((n, i) => n.classList.toggle('is-active', i === idx));
      circuit.dataset.active = String(idx + 1);
      center.classList.add('is-fading');
      setTimeout(() => {
        if (nameEl && data[idx].name) nameEl.textContent = data[idx].name;
        descEl.textContent = data[idx].desc;
        center.classList.remove('is-fading');
      }, 260);
    };

    const stopTimer = () => { if (timer) { clearInterval(timer); timer = null; } };
    const startTimer = () => {
      stopTimer();
      timer = setInterval(() => {
        if (visible && !paused) setActive((current + 1) % 4);
      }, PERIOD);
    };

    const pauseAll = () => {
      paused = true;
      if (svg && svg.pauseAnimations) {
        try { svg.pauseAnimations(); } catch (e) {}
      }
      if (toggle) {
        toggle.setAttribute('aria-pressed', 'true');
        toggle.setAttribute('aria-label', 'Reanudar ciclo');
      }
    };
    const playAll = () => {
      paused = false;
      if (svg && svg.unpauseAnimations) {
        try { svg.unpauseAnimations(); } catch (e) {}
      }
      if (toggle) {
        toggle.setAttribute('aria-pressed', 'false');
        toggle.setAttribute('aria-label', 'Pausar ciclo');
      }
      startTimer();
    };

    nodes.forEach((n, i) => n.addEventListener('click', () => {
      setActive(i);
      pauseAll();
    }));

    if (toggle) {
      toggle.addEventListener('click', () => { paused ? playAll() : pauseAll(); });
    }

    const section = document.querySelector('.loop-section');
    if (section && 'IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '0px' }).observe(section);
    }

    startTimer();
  })();

  // Spotlight glow en cards de Programas (dorado, sutil, sigue al cursor)
  // Optimizaciones: cache de rects, IntersectionObserver, sólo card activa, will-change
  (() => {
    const cards = Array.from(document.querySelectorAll('.prog-card'));
    if (!cards.length) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const section = document.querySelector('.programas');
    let sectionVisible = false;
    let rects = [];
    let activeIdx = -1;
    let ticking = false;
    let lastX = 0, lastY = 0;

    const recomputeRects = () => {
      rects = cards.map(c => c.getBoundingClientRect());
    };
    recomputeRects();

    // Recalcular rects en resize y scroll (throttle ~100ms)
    let resizeT = 0;
    const scheduleRecompute = () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(recomputeRects, 100);
    };
    window.addEventListener('resize', scheduleRecompute, { passive: true });
    window.addEventListener('scroll', scheduleRecompute, { passive: true });

    // Activar listener sólo cuando la sección Programas está en viewport
    if (section && 'IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        sectionVisible = entry.isIntersecting;
        if (!sectionVisible && activeIdx !== -1) {
          // Apagar la card activa al salir del viewport
          cards[activeIdx].style.setProperty('--glow-opacity', 0);
          activeIdx = -1;
        }
        // Recalcular rects al volver a entrar (por si el layout cambió)
        if (sectionVisible) recomputeRects();
      }, { rootMargin: '50px' }).observe(section);
    } else {
      sectionVisible = true; // fallback
    }

    document.addEventListener('pointermove', (e) => {
      lastX = e.clientX; lastY = e.clientY;
      if (!sectionVisible || ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        let foundIdx = -1;
        for (let i = 0; i < rects.length; i++) {
          const r = rects[i];
          if (lastX >= r.left && lastX <= r.right && lastY >= r.top && lastY <= r.bottom) {
            foundIdx = i; break;
          }
        }
        if (foundIdx !== -1) {
          const r = rects[foundIdx];
          const card = cards[foundIdx];
          card.style.setProperty('--glow-x', (lastX - r.left) + 'px');
          card.style.setProperty('--glow-y', (lastY - r.top) + 'px');
          card.style.setProperty('--glow-opacity', 1);
        }
        // Apagar la card que estaba activa si cambió o salió
        if (activeIdx !== -1 && activeIdx !== foundIdx) {
          cards[activeIdx].style.setProperty('--glow-opacity', 0);
        }
        activeIdx = foundIdx;
      });
    }, { passive: true });
  })();


});
