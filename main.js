document.addEventListener('DOMContentLoaded', () => {

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

  const p1 = document.getElementById('phrase1');
  const p2 = document.getElementById('phrase2');
  const p3 = document.getElementById('phrase3');
  const preloaderLogo = document.getElementById('preloaderLogo');

  gsap.set([p1, p2, p3], { y: 15, opacity: 0 });

  if (preloaderLogo) {
    tlLoader.to(preloaderLogo, { opacity: 0.8, duration: 2, ease: "power2.out" }, 0);
  }

  tlLoader
    .to(p1, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" })
    .to(p1, { opacity: 0, y: -15, duration: 0.5, ease: "power3.in" }, "+=0.6")
    .to(p2, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" })
    .to(p2, { opacity: 0, y: -15, duration: 0.5, ease: "power3.in" }, "+=0.6")
    .to(p3, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" })
    .to(p3, { opacity: 0, y: -15, duration: 0.5, ease: "power3.in" }, "+=0.6")
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

    // Cinematic gravity animation: blur → sharp, word by word
    const brandWords = document.querySelectorAll('.brand-word');
    if (brandWords.length) {
      tlHero.to(brandWords, {
        opacity: 1,
        filter: 'blur(0px)',
        y: 0,
        duration: 1.8,
        stagger: 0.35,
        ease: "power4.out",
        onStart: function() {
          gsap.set(brandWords, { y: 24 });
        }
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

  // 5. Dynamic Announcement Panel Logic — Conectado a Google Sheets
  const SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTkmDyxyWLYdonFBidesVWPA2wkHiWGvyd2Qra-uZWGLJP06_5wWwMRgmAq55nDmCnvB3Xwd7Zbp1KG/pub?gid=0&single=true&output=csv';

  function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return null;
    const headers = lines[0].split(',').map(h => h.trim().replace(/\r/g, ''));
    const values = [];
    let current = '';
    let inQuotes = false;
    // Parse CSV respecting quoted fields (descriptions may contain commas)
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

  async function fetchLiveAnnouncement() {
    const annPanel = document.getElementById('heroAnnouncement');
    if (!annPanel) return;
    
    const panelContent = annPanel.querySelector('.panel-content');
    const elLabel = document.getElementById('annLabel');
    const elTitle = document.getElementById('annTitle');
    const elDesc = document.getElementById('annDesc');
    const elMeta = document.getElementById('annMeta');
    const elCtaUrl = document.getElementById('annCtaUrl');
    const elCtaText = document.getElementById('annCtaText');

    try {
      // Fetch real data from Google Sheets (published CSV)
      const response = await fetch(SHEETS_CSV_URL);
      if (!response.ok) throw new Error('Network response was not ok');
      const csvText = await response.text();
      const data = parseCSV(csvText);
      if (!data) throw new Error('No data found in CSV');

      // Fade out current content
      panelContent.style.opacity = 0;
      
      setTimeout(() => {
        // Update DOM with live data from Google Sheets
        if (elLabel) elLabel.textContent = data.label || 'ANUNCIO';
        if (elTitle) elTitle.textContent = data.title || '';
        if (elDesc) elDesc.textContent = data.description || '';
        if (elMeta) elMeta.innerHTML = `<span class="meta-item">${data.meta1 || ''}</span><span class="meta-item">•</span><span class="meta-item">${data.meta2 || ''}</span>`;
        if (elCtaText) elCtaText.textContent = data.ctaText || 'VER MÁS';
        if (elCtaUrl) elCtaUrl.href = data.ctaUrl || '#';
        
        // Fade in new content
        panelContent.style.opacity = 1;
      }, 600);

    } catch (error) {
      console.error('Error fetching announcement from Google Sheets:', error);
      // Fallback: mantener el contenido que ya está en el HTML
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
    gsap.fromTo(items, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.15, ease: "power2.out", scrollTrigger: { trigger: container, start: "top 85%" } });
  });

  const loopSection = document.querySelector('.loop-section');
  if(loopSection) {
    const loopLine = loopSection.querySelector('.loop-line');
    const loopNodes = loopSection.querySelectorAll('.loop-dot');
    let tlLoop = gsap.timeline({ scrollTrigger: { trigger: loopSection, start: "top 70%" } });
    if(loopLine) tlLoop.to(loopLine, { scaleX: 1, duration: 1.5, ease: "power3.inOut" }, 0);
    tlLoop.fromTo(loopNodes, { scale: 0.5, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.8, stagger: 0.3, ease: "back.out(1.5)" }, "-=1");
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

  // Counters
  document.querySelectorAll('.counter').forEach(counter => {
    const target = parseInt(counter.getAttribute('data-target'));
    const isThousands = target > 1000;
    gsap.to(counter, {
      innerHTML: target, duration: 2.5, snap: { innerHTML: 1 }, ease: "power2.out",
      onUpdate: function() {
        if(isThousands) counter.innerHTML = "+" + Number(Math.floor(this.targets()[0].innerHTML)).toLocaleString('es-AR');
        else counter.innerHTML = "+" + Math.floor(this.targets()[0].innerHTML);
      },
      scrollTrigger: { trigger: counter, start: "top 85%" }
    });
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if(id.length > 1){
        e.preventDefault();
        const target = document.querySelector(id);
        if(target) lenis.scrollTo(target, { offset: -60 });
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

});
