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
          const numEls = card.querySelectorAll('.prog-num');
          numEls.forEach(el => el.textContent = p.num);
          card.querySelectorAll('.prog-name').forEach(el => el.innerHTML = p.nombre.replace(/ /, '<br>'));
          const mod = card.querySelector('.prog-modality');
          if (mod && p.modalidad) {
            mod.lastChild.textContent = ' ' + p.modalidad;
            mod.className = 'prog-modality prog-modality--' + (p.modalidad_tipo || 'online');
          }
          const back = card.querySelector('.prog-back-text');
          if (back && p.descripcion) back.textContent = p.descripcion;
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
            if (cta) {
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
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  });
  
  lenis.stop(); // Stop scroll while loading

  gsap.registerPlugin(ScrollTrigger);
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  // 2. Prepare Split Text for Hero Reveal
  const splitTitles = new SplitType('.split-title', { types: 'words, chars' });
  const splitLines = new SplitType('.split-line', { types: 'lines, words' });
  
  // Wrap lines in an overflow hidden container so they can slide up from invisible bounds
  document.querySelectorAll('.split-line .line').forEach(line => {
    const wrapper = document.createElement('div');
    wrapper.style.overflow = 'hidden';
    line.parentNode.insertBefore(wrapper, line);
    wrapper.appendChild(line);
  });
  
  gsap.set('.split-title .char', { y: 110, opacity: 0 });
  gsap.set('.split-line .word', { y: 110, opacity: 0 });
  gsap.set('.hero-divider', { width: 0 });

  // 3. Preloader Sequence Timeline
  const tlLoader = gsap.timeline({
    onComplete: () => {
      document.getElementById('preloader').style.display = 'none';
      lenis.start(); // Enable scroll
      triggerHeroReveal();
    }
  });

  const matrixTextEl = document.getElementById('matrixText');
  const fullText = "Reconfigurando percepción";
  const preloaderLogo = document.getElementById('preloaderLogo');

  if (preloaderLogo) {
    tlLoader.to(preloaderLogo, { opacity: 0.8, duration: 2, ease: "power2.out" }, 0);
  }

  // Matrix-style typing effect
  tlLoader.to({}, {
    duration: 2.2,
    ease: "none",
    onUpdate: function() {
      const progress = this.progress();
      const currentLength = Math.floor(progress * fullText.length);
      if (matrixTextEl) {
        matrixTextEl.textContent = fullText.substring(0, currentLength);
      }
    }
  }, 0.5) // Start typing after 0.5s
  .to(matrixTextEl, { opacity: 0, duration: 0.8, ease: "power3.in" }, "+=1.2") // Hold and then fade out
    // Trigger the custom event to tell particles.js to explode the preloader
    .call(() => { window.dispatchEvent(new Event('explodePreloader')); })
    // Fade out the preloader background faster
    .to('#preloader', { autoAlpha: 0, duration: 1.2, ease: "power3.inOut" }, "+=0.1");

  // 4. Hero Reveal Sequence (Awwwards Style Stagger)
  function triggerHeroReveal() {
    const tlHero = gsap.timeline();
    // Fade in the header corner logo video
    const headerLogo = document.getElementById('headerLogoVideo');
    if (headerLogo) {
      tlHero.to(headerLogo, { opacity: 1, duration: 2, ease: "power2.inOut" }, 0.5);
    }

    // Brand stamp reveal — sutil fade + slide
    const brandStamp = document.getElementById('heroBrandStamp');
    if (brandStamp) {
      gsap.set(brandStamp, { y: 12, opacity: 0 });
      tlHero.to(brandStamp, {
        opacity: 1,
        y: 0,
        duration: 1.2,
        ease: "power3.out"
      }, 0.2);
    }
    
    tlHero.to('.split-title .char', {
      y: 0, opacity: 1,
      duration: 1.2,
      stagger: 0.02,
      ease: "power4.out"
    }, 0)
    .to('.hero-divider', {
      width: 60,
      duration: 1.2,
      ease: "power3.inOut"
    }, 0.4)
    .to('.split-line .word', {
      y: 0, opacity: 1,
      duration: 1,
      stagger: 0.015,
      ease: "power3.out"
    }, 0.6)
    .fromTo('.scroll-cue', 
      { autoAlpha: 0, y: 20 },
      { autoAlpha: 1, y: 0, duration: 1.5, ease: "power2.out" }, 
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

    try {
      const response = await fetch(SHEETS_CSV_URL);
      if (!response.ok) throw new Error('Network response was not ok');
      const csvText = await response.text();
      const data = parseCSV(csvText);
      if (!data) throw new Error('No data found in CSV');

      const tipo = (data.tipo || 'anuncio').toLowerCase().trim();

      // Fade out
      panelContent.style.opacity = 0;
      
      setTimeout(() => {
        // Hide all modes
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

    } catch (error) {
      console.error('Error fetching bulletin from Google Sheets:', error);
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
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" });
    });
  });

  // 7. General GSAP Reveals (Scroll Storytelling)
  gsap.utils.toArray('.gs_reveal:not(.gs_left):not(.gs_right):not(.gs_up)').forEach((el) => {
    gsap.fromTo(el, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%" } });
  });
  gsap.utils.toArray('.gs_left').forEach((el) => {
    gsap.fromTo(el, { autoAlpha: 0, x: -60 }, { autoAlpha: 1, x: 0, duration: 1.4, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%" } });
  });
  gsap.utils.toArray('.gs_right').forEach((el) => {
    gsap.fromTo(el, { autoAlpha: 0, x: 60 }, { autoAlpha: 1, x: 0, duration: 1.4, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%" } });
  });
  gsap.utils.toArray('.gs_up').forEach((el) => {
    gsap.fromTo(el, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%" } });
  });

  document.querySelectorAll('.pillars, .footer-grid').forEach(container => {
    const items = container.querySelectorAll('.gs_stagger');
    gsap.fromTo(items, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.15, ease: "power2.out", scrollTrigger: { trigger: container, start: "top 85%", onEnter: () => {
      container.querySelectorAll('.pillar').forEach(p => p.classList.add('is-drawn'));
    } } });
  });

  const loopSection = document.querySelector('.loop-section');
  if(loopSection) {
    const loopNodes = loopSection.querySelectorAll('.loop-dot');
    let tlLoop = gsap.timeline({ scrollTrigger: { trigger: loopSection, start: "top 70%" } });
    tlLoop.fromTo(loopNodes, { scale: 0.5, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.8, stagger: 0.3, ease: "back.out(1.5)" }, 0);

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
        ease: "power2.out",
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
      rotation: -10,
      duration: 0.95,
      ease: "back.out(1.5)",
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
  lenis.on('scroll', () => {
    const y = window.scrollY;
    const vh = window.innerHeight;
    if(fabs.length > 0) {
      if(y > vh * 0.6) {
        fabs.forEach(fab => fab.classList.add('show'));
      } else {
        fabs.forEach(fab => fab.classList.remove('show'));
      }
    }
  });

  // 9. Flip card (tarjetas de programas con efecto carta dándose vuelta)
  // Click en cualquier parte de la card dispara el flip
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.prog-card--flippable');
    if (!card || card.classList.contains('is-transitioning')) return;
    e.preventDefault();

    const front = card.querySelector('.prog-card-face--front');
    const back = card.querySelector('.prog-card-face--back');
    const inner = card.querySelector('.prog-card-inner');

    front.style.pointerEvents = 'none';
    back.style.pointerEvents = 'none';

    card.classList.add('is-transitioning');
    card.classList.toggle('is-flipped');

    setTimeout(() => {
      card.classList.remove('is-transitioning');
      if (card.classList.contains('is-flipped')) {
        back.style.pointerEvents = 'auto';
        front.style.pointerEvents = 'none';
      } else {
        front.style.pointerEvents = 'auto';
        back.style.pointerEvents = 'none';
      }
      front.getBoundingClientRect();
      back.getBoundingClientRect();
      inner.style.willChange = 'auto';
      requestAnimationFrame(() => { inner.style.willChange = 'transform'; });
    }, 700);
  });

});
