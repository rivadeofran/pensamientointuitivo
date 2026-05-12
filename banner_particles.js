(function() {
  const canvas = document.getElementById('bannerParticles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const section = canvas.parentElement;

  const settings = {
    particleCount: 380,
    color: '230, 194, 122',
    minSize: 0.4,
    maxSize: 1.6,
    minAlpha: 0.35,
    maxAlpha: 0.95,
    homeReturnSpeed: 0.014,
    shapeLerpSpeed: 0.028,
    damping: 0.86,
    driftAmplitude: 8,
    driftSpeed: 0.0003,
    shapeBreathAmplitude: 1.2,
    shapeBreathSpeed: 0.0009
  };

  let particles = [];
  let mouse = { active: false };
  let isInView = false;
  let animationId = null;
  let dpr = Math.max(window.devicePixelRatio || 1, 1);
  let shapeProgress = 0; // 0 = scattered, 1 = silhouette

  function resize() {
    const rect = section.getBoundingClientRect();
    dpr = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  // Genera posiciones objetivo: círculo + triángulo equilátero + ojo en el centro
  // (composición esotérica tipo "ojo de la providencia")
  function buildSilhouetteTargets(width, height, count) {
    const targets = [];
    const cx = width / 2;
    const cy = height * 0.50;
    const R = Math.min(height * 0.36, width * 0.22); // Radio exterior

    function pushLine(p1, p2, n) {
      for (let i = 0; i < n; i++) {
        const t = i / n;
        targets.push({
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t
        });
      }
    }

    function pushCircle(cx0, cy0, r, n) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        targets.push({ x: cx0 + Math.cos(a) * r, y: cy0 + Math.sin(a) * r });
      }
    }

    // 1) CÍRCULO EXTERIOR
    pushCircle(cx, cy, R, 130);

    // 2) TRIÁNGULO EQUILÁTERO inscrito (punta arriba)
    const v1 = { x: cx, y: cy - R };
    const v2 = { x: cx - R * Math.cos(Math.PI / 6), y: cy + R * Math.sin(Math.PI / 6) };
    const v3 = { x: cx + R * Math.cos(Math.PI / 6), y: cy + R * Math.sin(Math.PI / 6) };
    pushLine(v1, v2, 36);
    pushLine(v2, v3, 36);
    pushLine(v3, v1, 36);

    // 3) OJO ALMENDRA
    const eyeCx = cx;
    const eyeCy = cy + R * 0.08;
    const eyeRX = R * 0.42;
    const eyeRY = R * 0.18;
    const nEye = 70;
    for (let i = 0; i < nEye; i++) {
      const a = (i / nEye) * Math.PI * 2;
      // Curva tipo almendra (ojo): top más curvado que abajo
      const yFactor = Math.sin(a) < 0 ? 1.1 : 0.9;
      targets.push({
        x: eyeCx + Math.cos(a) * eyeRX,
        y: eyeCy + Math.sin(a) * eyeRY * yFactor
      });
    }

    // 4) IRIS — circulo intermedio
    const irisR = R * 0.15;
    pushCircle(eyeCx, eyeCy, irisR, 40);

    // 5) PUPILA — disco lleno pequeño
    const pupilR = R * 0.05;
    const nPupil = 22;
    for (let i = 0; i < nPupil; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * pupilR;
      targets.push({ x: eyeCx + Math.cos(a) * rr, y: eyeCy + Math.sin(a) * rr });
    }

    // Si faltan partículas (por redondeo), agrego más al círculo exterior
    while (targets.length < count) {
      const a = Math.random() * Math.PI * 2;
      targets.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R });
    }

    // Shuffle para que la asignación a partículas sea aleatoria
    for (let i = targets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [targets[i], targets[j]] = [targets[j], targets[i]];
    }

    return targets.slice(0, count);
  }

  function init() {
    particles = [];
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const targets = buildSilhouetteTargets(w, h, settings.particleCount);

    for (let i = 0; i < settings.particleCount; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      particles.push({
        x, y,
        homeX: x,
        homeY: y,
        targetX: targets[i].x,
        targetY: targets[i].y,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: settings.minSize + Math.random() * (settings.maxSize - settings.minSize),
        alpha: settings.minAlpha + Math.random() * (settings.maxAlpha - settings.minAlpha),
        seed: Math.random() * Math.PI * 2
      });
    }
  }

  function animate(time) {
    if (!isInView) { animationId = null; return; }
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.clearRect(0, 0, w, h);

    // Smooth shape progress hacia 1 si mouse activo, hacia 0 si no
    const targetProgress = mouse.active ? 1 : 0;
    shapeProgress += (targetProgress - shapeProgress) * 0.025;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Drift en home (mente dispersa)
      const driftX = Math.sin(time * settings.driftSpeed + p.seed) * settings.driftAmplitude;
      const driftY = Math.cos(time * settings.driftSpeed + p.seed * 1.3) * settings.driftAmplitude;
      const homeTargetX = p.homeX + driftX;
      const homeTargetY = p.homeY + driftY;

      // Breathing dentro de la silueta (sutil, no rompe la figura)
      const breathX = Math.sin(time * settings.shapeBreathSpeed + p.seed) * settings.shapeBreathAmplitude;
      const breathY = Math.cos(time * settings.shapeBreathSpeed + p.seed * 1.5) * settings.shapeBreathAmplitude;
      const shapeTargetX = p.targetX + breathX;
      const shapeTargetY = p.targetY + breathY;

      // Mezcla entre home (mente dispersa) y silueta (mente intuitiva)
      const targetX = homeTargetX + (shapeTargetX - homeTargetX) * shapeProgress;
      const targetY = homeTargetY + (shapeTargetY - homeTargetY) * shapeProgress;

      const lerp = shapeProgress > 0.1 ? settings.shapeLerpSpeed : settings.homeReturnSpeed;
      p.vx += (targetX - p.x) * lerp;
      p.vy += (targetY - p.y) * lerp;

      p.vx *= settings.damping;
      p.vy *= settings.damping;
      p.x += p.vx;
      p.y += p.vy;

      // El alpha sube ligeramente cuando está en silueta (más visible)
      const visibleAlpha = p.alpha * (0.85 + 0.15 * shapeProgress);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + settings.color + ',' + visibleAlpha + ')';
      ctx.fill();
    }

    animationId = requestAnimationFrame(animate);
  }

  resize();
  init();

  window.addEventListener('resize', () => {
    resize();
    init();
  });

  section.addEventListener('mouseenter', () => { mouse.active = true; });
  section.addEventListener('mouseleave', () => { mouse.active = false; });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      isInView = entry.isIntersecting;
      if (isInView && !animationId) {
        animationId = requestAnimationFrame(animate);
      }
    });
  }, { threshold: 0 });
  observer.observe(section);
})();
