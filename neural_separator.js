/**
 * Neural Separator — Cinematic Procedural Canvas Engine
 * Renders flowing golden neural particles, plexus connections,
 * and atmospheric dust with ultra-soft parallax on scroll.
 * Now targets the prog-band section (after the 4 program cards).
 */
(function () {
  'use strict';

  const canvas = document.getElementById('neuralCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const section = canvas.parentElement; // Works regardless of which section it's placed in

  // ---------- Config ----------
  const CFG = {
    // Particle count scales with screen — fewer on mobile for performance
    count: () => window.innerWidth < 640 ? 45 : 90,
    connectionDist: () => window.innerWidth < 640 ? 110 : 160,
    speed: 0.18,          // base drift speed (very slow)
    nodeSize: { min: 0.8, max: 2.2 },
    lineAlphaMax: 0.14,   // max opacity for plexus lines
    nodeAlphaMax: 0.7,
    parallaxFactor: 0.06, // how much canvas drifts on scroll (very subtle)
    dustCount: () => window.innerWidth < 640 ? 20 : 40,
  };

  // ---------- State ----------
  let W, H, particles = [], dustParticles = [];
  let scrollY = 0, targetScrollY = 0;
  let canvasOffsetY = 0; // parallax offset applied to ctx transform
  let animFrame;
  let isVisible = false;

  // ---------- Resize ----------
  function resize() {
    W = canvas.width = section.clientWidth;
    H = canvas.height = section.clientHeight;
    init();
  }

  // ---------- Particle class ----------
  class Particle {
    constructor() { this.reset(true); }

    reset(initial = false) {
      this.x = Math.random() * W;
      this.y = initial ? Math.random() * H : (Math.random() > 0.5 ? -4 : H + 4);
      // Unique noise offsets for organic movement
      this.nx = Math.random() * 1000;
      this.ny = Math.random() * 1000;
      this.nzX = Math.random() * 0.003 + 0.001; // noise speed X
      this.nzY = Math.random() * 0.002 + 0.001; // noise speed Y
      this.vx = (Math.random() - 0.5) * CFG.speed;
      this.vy = (Math.random() - 0.5) * CFG.speed * 0.5 - 0.04; // slight upward bias
      this.size = CFG.nodeSize.min + Math.random() * (CFG.nodeSize.max - CFG.nodeSize.min);
      this.alpha = 0;
      this.targetAlpha = 0.2 + Math.random() * 0.5;
      this.life = Math.random(); // 0–1 lifecycle
      this.lifeSpeed = 0.0008 + Math.random() * 0.0012;
      // Gold-to-emerald palette
      const palette = [
        [214, 176, 106], // gold
        [214, 176, 106], // gold (weighted)
        [190, 155,  90], // dark gold
        [120, 180, 140], // soft emerald
        [245, 225, 170], // pale champagne
      ];
      this.color = palette[Math.floor(Math.random() * palette.length)];
    }

    update() {
      // Organic Perlin-like drift via simple sin/cos noise
      this.nx += this.nzX;
      this.ny += this.nzY;
      this.x += this.vx + Math.sin(this.nx) * 0.3;
      this.y += this.vy + Math.cos(this.ny) * 0.2;

      // Lifecycle fade
      this.life += this.lifeSpeed;
      // Alpha bell curve: fade in → peak → fade out
      const t = Math.sin(this.life * Math.PI);
      this.alpha = t * this.targetAlpha * CFG.nodeAlphaMax;

      // Respawn when off-screen or lifecycle complete
      if (this.life >= 1 || this.x < -10 || this.x > W + 10 || this.y < -10 || this.y > H + 10) {
        this.reset(false);
      }
    }

    draw() {
      if (this.alpha <= 0.01) return;
      const [r, g, b] = this.color;
      // Draw node with inner glow
      const grd = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3);
      grd.addColorStop(0, `rgba(${r},${g},${b},${this.alpha})`);
      grd.addColorStop(0.5, `rgba(${r},${g},${b},${this.alpha * 0.4})`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Solid core dot
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${this.alpha * 1.5})`;
      ctx.fill();
    }
  }

  // ---------- Dust class (micro floating specks) ----------
  class Dust {
    constructor() { this.reset(true); }

    reset(initial = false) {
      this.x = Math.random() * W;
      this.y = initial ? Math.random() * H : H + 2;
      this.size = 0.5 + Math.random() * 0.8;
      this.vy = -(0.05 + Math.random() * 0.12);
      this.vx = (Math.random() - 0.5) * 0.08;
      this.alpha = 0;
      this.maxAlpha = 0.08 + Math.random() * 0.14;
      this.life = Math.random();
      this.lifeSpeed = 0.0004 + Math.random() * 0.0006;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life += this.lifeSpeed;
      this.alpha = Math.sin(this.life * Math.PI) * this.maxAlpha;
      if (this.life >= 1 || this.y < -5) this.reset(false);
    }

    draw() {
      if (this.alpha <= 0.01) return;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(214,176,106,${this.alpha})`;
      ctx.fill();
    }
  }

  // ---------- Draw plexus connections ----------
  function drawConnections() {
    const n = particles.length;
    const maxDist = CFG.connectionDist();
    const maxDistSq = maxDist * maxDist;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distSq = dx * dx + dy * dy;
        if (distSq > maxDistSq) continue;

        const dist = Math.sqrt(distSq);
        const proximity = 1 - dist / maxDist;
        const combinedAlpha = particles[i].alpha * particles[j].alpha;
        const lineAlpha = proximity * proximity * CFG.lineAlphaMax * Math.sqrt(combinedAlpha / (CFG.nodeAlphaMax * CFG.nodeAlphaMax));

        if (lineAlpha < 0.005) continue;

        // Gradient line fading at endpoints
        const grad = ctx.createLinearGradient(particles[i].x, particles[i].y, particles[j].x, particles[j].y);
        grad.addColorStop(0, `rgba(214,176,106,${lineAlpha * particles[i].alpha / CFG.nodeAlphaMax})`);
        grad.addColorStop(0.5, `rgba(214,176,106,${lineAlpha})`);
        grad.addColorStop(1, `rgba(214,176,106,${lineAlpha * particles[j].alpha / CFG.nodeAlphaMax})`);

        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  // ---------- Init ----------
  function init() {
    particles = [];
    dustParticles = [];
    const count = CFG.count();
    const dustCount = CFG.dustCount();
    for (let i = 0; i < count; i++) particles.push(new Particle());
    for (let i = 0; i < dustCount; i++) dustParticles.push(new Dust());
  }

  // ---------- Scroll parallax ----------
  function onScroll() {
    targetScrollY = window.scrollY;
  }

  // ---------- Intersection Observer — pause when off screen ----------
  const observer = new IntersectionObserver((entries) => {
    isVisible = entries[0].isIntersecting;
    if (isVisible) loop();
  }, { threshold: 0.01 });
  observer.observe(section);

  // ---------- Main loop ----------
  function loop() {
    if (!isVisible) return;
    animFrame = requestAnimationFrame(loop);

    // Smooth scroll inertia
    scrollY += (targetScrollY - scrollY) * 0.06;
    const sectionTop = section.getBoundingClientRect().top + window.scrollY;
    const relativeScroll = scrollY - sectionTop;
    canvasOffsetY = relativeScroll * CFG.parallaxFactor;

    ctx.clearRect(0, 0, W, H);

    // Apply subtle parallax transform
    ctx.save();
    ctx.translate(0, canvasOffsetY);

    // Update & draw dust first (background layer)
    dustParticles.forEach(d => { d.update(); d.draw(); });

    // Draw plexus connections
    drawConnections();

    // Draw nodes on top
    particles.forEach(p => { p.update(); p.draw(); });

    ctx.restore();
  }

  // ---------- Bootstrap ----------
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', onScroll, { passive: true });

  // Initial setup with slight delay so layout settles
  setTimeout(() => {
    resize();
    // Start loop if already visible
    if (section.getBoundingClientRect().top < window.innerHeight) {
      isVisible = true;
      loop();
    }
  }, 100);
})();
