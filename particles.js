document.addEventListener('DOMContentLoaded', () => {
  // Cap device pixel ratio for performance
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  // ==========================================
  // 1. PRELOADER PARTICLES
  // ==========================================
  const preloadCanvas = document.getElementById('preloaderCanvas');
  if(preloadCanvas) {
    const ctx = preloadCanvas.getContext('2d');
    let w, h;
    let preParticles = [];
    let isExploding = false;
    
    function resizePreload() {
      w = preloadCanvas.width = window.innerWidth * dpr;
      h = preloadCanvas.height = window.innerHeight * dpr;
    }
    window.addEventListener('resize', resizePreload);
    resizePreload();
    
    for(let i=0; i<100; i++) {
      preParticles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2 * dpr,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        alpha: Math.random() * 0.5 + 0.1
      });
    }
    
    window.addEventListener('explodePreloader', () => {
      isExploding = true;
      preParticles.forEach(p => {
        const dx = p.x - w/2;
        const dy = p.y - h/2;
        const dist = Math.hypot(dx, dy);
        const force = (Math.random() * 20 + 10) * dpr;
        p.vx = (dx / dist) * force;
        p.vy = (dy / dist) * force;
      });
    });
    
    function animatePreload() {
      ctx.clearRect(0, 0, w, h);
      preParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if(!isExploding) {
          if(p.x < 0) p.x = w; if(p.x > w) p.x = 0;
          if(p.y < 0) p.y = h; if(p.y > h) p.y = 0;
        } else {
          p.alpha -= 0.02;
        }
        if(p.alpha > 0) {
          ctx.fillStyle = `rgba(230, 194, 122, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      if(isExploding && preParticles[0].alpha <= 0) return;
      requestAnimationFrame(animatePreload);
    }
    animatePreload();
  }

  
  // ==========================================
  // 3. Simple CTA Particles
  // ==========================================
  const ctaCanvas = document.getElementById('ctaParticles');
  if(ctaCanvas) {
    const ctx = ctaCanvas.getContext('2d');
    let w,h;
    const ctaParts = [];
    let isVisible = true;
    let reqIdCta;
    
    function resizeCta(){
      const r = ctaCanvas.parentElement.getBoundingClientRect();
      w = ctaCanvas.width = r.width * dpr;
      h = ctaCanvas.height = r.height * dpr;
    }
    resizeCta();
    window.addEventListener('resize', resizeCta);
    
    for(let i=0;i<40;i++){
      ctaParts.push({
        x: Math.random()*w,
        y: Math.random()*h,
        r: (.5 + Math.random()*1.5) * dpr,
        vx: (Math.random()-.5)*.2,
        vy: (Math.random()-.5)*.2,
        ph: Math.random()*Math.PI*2
      });
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!isVisible) {
            isVisible = true;
            reqIdCta = requestAnimationFrame(tickCta);
          }
        } else {
          isVisible = false;
          if (reqIdCta) cancelAnimationFrame(reqIdCta);
        }
      });
    }, { threshold: 0 });
    observer.observe(ctaCanvas.parentElement);
    
    function tickCta(){
      if (!isVisible) return;
      ctx.clearRect(0,0,w,h);
      ctaParts.forEach(p=>{
        p.x += p.vx; p.y += p.vy; p.ph += 0.015;
        if(p.x<0) p.x = w; if(p.x>w) p.x=0;
        if(p.y<0) p.y = h; if(p.y>h) p.y=0;
        const a = 0.2 + 0.3*Math.sin(p.ph);
        ctx.fillStyle = `rgba(230,194,122, ${a})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
      });
      reqIdCta = requestAnimationFrame(tickCta);
    }
    tickCta();
  }
});
