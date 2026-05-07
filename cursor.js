/**
 * Premium Minimal Neural Cursor
 * A cinematic, procedural particle plexus system for the cursor.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Disable on touch devices
  if (window.matchMedia("(any-pointer: coarse)").matches) return;

  const canvas = document.getElementById('neuralCursor');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  let w = window.innerWidth;
  let h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;

  window.addEventListener('resize', () => {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
  });

  const mouse = { x: w / 2, y: h / 2, tx: w / 2, ty: h / 2 };
  let isHovering = false;
  let hoverEl = null;

  // Track mouse position
  window.addEventListener('mousemove', (e) => {
    mouse.tx = e.clientX;
    mouse.ty = e.clientY;
  });

  // Global event delegation for interactive elements
  const checkHover = (target) => {
    return target.closest('a, button, .magnetic-btn, .scroll-cue, .m-item, .info-node, .pillar, .prog-card, .m-sep');
  };

  document.addEventListener('mouseover', (e) => {
    const el = checkHover(e.target);
    if (el) {
      isHovering = true;
      hoverEl = el;
    }
  });

  document.addEventListener('mouseout', (e) => {
    const el = checkHover(e.target);
    if (el) {
      isHovering = false;
      hoverEl = null;
    }
  });

  // Particle Class for the neural trail
  class Node {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 1.5;
      this.vy = (Math.random() - 0.5) * 1.5;
      this.life = 1.0;
      this.decay = Math.random() * 0.015 + 0.005; // dissolve speed
      this.size = Math.random() * 1.5 + 0.5;
    }

    update() {
      // Add slight organic noise to movement
      this.vx += (Math.random() - 0.5) * 0.1;
      this.vy += (Math.random() - 0.5) * 0.1;

      // Friction
      this.vx *= 0.95;
      this.vy *= 0.95;

      this.x += this.vx;
      this.y += this.vy;
      this.life -= this.decay;

      // If hovering, softly pull particles towards the center of the element
      if (isHovering && hoverEl) {
        const rect = hoverEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        
        const dx = cx - this.x;
        const dy = cy - this.y;
        
        // Gentle gravitational pull
        this.vx += dx * 0.001;
        this.vy += dy * 0.001;
      }
    }

    draw(ctx) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(230, 194, 122, ${this.life * 0.6})`; // Gold/warm tone
      ctx.fill();
    }
  }

  const nodes = [];
  const maxNodes = 60; // Keep it refined and minimal

  function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
  }

  function animate() {
    ctx.clearRect(0, 0, w, h);

    // Easing for the core cursor
    const ease = isHovering ? 0.12 : 0.2;
    let targetX = mouse.tx;
    let targetY = mouse.ty;

    if (isHovering && hoverEl) {
      // Very subtle magnetic pull on the cursor core towards hover element center
      const rect = hoverEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      targetX = lerp(mouse.tx, cx, 0.2);
      targetY = lerp(mouse.ty, cy, 0.2);
    }

    mouse.x = lerp(mouse.x, targetX, ease);
    mouse.y = lerp(mouse.y, targetY, ease);

    // Spawn new nodes organically while moving
    const speed = Math.hypot(mouse.x - mouse.tx, mouse.y - mouse.ty);
    if (speed > 1 || isHovering) {
      if (nodes.length < maxNodes && Math.random() > 0.4) {
        // Spawn slightly offset from center
        const offsetX = (Math.random() - 0.5) * 10;
        const offsetY = (Math.random() - 0.5) * 10;
        nodes.push(new Node(mouse.x + offsetX, mouse.y + offsetY));
      }
    }

    // Update and draw nodes
    for (let i = nodes.length - 1; i >= 0; i--) {
      nodes[i].update();
      if (nodes[i].life <= 0) {
        nodes.splice(i, 1);
      }
    }

    // Draw neural plexus lines
    ctx.globalCompositeOperation = 'screen';
    ctx.lineWidth = 0.6;

    for (let i = 0; i < nodes.length; i++) {
      // Connect nodes to mouse core
      const coreDx = nodes[i].x - mouse.x;
      const coreDy = nodes[i].y - mouse.y;
      const coreDist = Math.hypot(coreDx, coreDy);
      const maxCoreDist = isHovering ? 100 : 60;

      if (coreDist < maxCoreDist) {
        const alpha = (1 - coreDist / maxCoreDist) * nodes[i].life;
        // Cyan / Electric Blue tint when connecting to core
        ctx.strokeStyle = isHovering 
          ? `rgba(200, 100, 180, ${alpha * 0.8})`  // Magenta accent on hover
          : `rgba(140, 170, 220, ${alpha * 0.5})`; // Blueish normally
        
        ctx.beginPath();
        ctx.moveTo(mouse.x, mouse.y);
        ctx.lineTo(nodes[i].x, nodes[i].y);
        ctx.stroke();
      }

      // Connect nodes to each other
      for (let j = i + 1; j < nodes.length; j++) {
        const p1 = nodes[i];
        const p2 = nodes[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.hypot(dx, dy);
        const maxDist = isHovering ? 80 : 45;
        
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * Math.min(p1.life, p2.life);
          // Gold / Warm tone for inter-node synapses
          ctx.strokeStyle = `rgba(230, 194, 122, ${alpha * 0.4})`;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
      
      // Draw individual node
      nodes[i].draw(ctx);
    }

    // Draw Main Cursor Core
    const coreSize = isHovering ? 5 : 2.5;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, coreSize, 0, Math.PI * 2);
    ctx.fillStyle = isHovering ? 'rgba(230, 194, 122, 1)' : 'rgba(245, 243, 238, 0.9)';
    ctx.fill();

    // Soft outer bloom
    const bloomSize = isHovering ? coreSize * 6 : coreSize * 4;
    const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, bloomSize);
    
    if (isHovering) {
      gradient.addColorStop(0, 'rgba(230, 194, 122, 0.3)'); // Gold bloom
      gradient.addColorStop(0.5, 'rgba(200, 100, 180, 0.1)'); // Magenta hint
    } else {
      gradient.addColorStop(0, 'rgba(140, 170, 220, 0.3)'); // Cyan/Blue bloom
    }
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, bloomSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';

    requestAnimationFrame(animate);
  }

  // Hide default cursor early
  document.documentElement.style.cursor = 'none';

  animate();
});
