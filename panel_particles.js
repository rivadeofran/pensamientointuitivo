/**
 * Announcement Panel Particles
 * Draws subtle dark cosmic drifting particles and tiny gold flickers inside the panel.
 */

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('panelParticles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const panel = canvas.parentElement;

  let w, h;
  function resize() {
    w = canvas.width = panel.clientWidth;
    h = canvas.height = panel.clientHeight;
  }
  
  window.addEventListener('resize', resize);
  // Initial resize
  setTimeout(resize, 100);

  class PanelParticle {
    constructor() {
      this.reset();
    }
    
    reset() {
      this.x = Math.random() * w;
      this.y = Math.random() * h;
      this.size = Math.random() * 1.5 + 0.5;
      this.vx = (Math.random() - 0.5) * 0.2;
      this.vy = (Math.random() - 0.5) * 0.2 - 0.1; // Slight upward drift
      this.life = Math.random();
      this.decay = Math.random() * 0.005 + 0.002;
      this.isGold = Math.random() > 0.85; // 15% chance to be a gold flicker
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life -= this.decay;
      
      // Wrap around
      if(this.x < 0) this.x = w;
      if(this.x > w) this.x = 0;
      if(this.y < 0) this.y = h;
      if(this.y > h) this.y = 0;
      
      if(this.life <= 0) {
        this.life = 1;
        this.x = Math.random() * w;
        this.y = h + 10; // Spawn near bottom
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      
      const alpha = Math.sin(this.life * Math.PI) * 0.6; // Fade in and out
      if (this.isGold) {
        ctx.fillStyle = `rgba(214, 176, 106, ${alpha})`;
      } else {
        // Dark cosmic particle (subtle dark green/black)
        ctx.fillStyle = `rgba(10, 20, 15, ${alpha * 1.5})`;
      }
      ctx.fill();
    }
  }

  let particles = [];
  
  function initParticles() {
    particles = [];
    const numParticles = 40; // Dense enough but minimal
    for(let i=0; i<numParticles; i++) {
      particles.push(new PanelParticle());
    }
  }
  
  // Wait a bit for layout to settle
  setTimeout(initParticles, 200);

  function animate() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(animate);
  }

  animate();
});
