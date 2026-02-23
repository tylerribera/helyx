/* ═══════════════════════════════════════════════════════════════
   HELYX — Home Page JavaScript
   Helix canvas animation + particles
   ═══════════════════════════════════════════════════════════════ */

// ── Helix Canvas Animation ────────────────────────────────────
function initHelixCanvas() {
    const canvas = document.getElementById('helix-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animId;
    let time = 0;

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    resize();
    window.addEventListener('resize', resize);

    function draw() {
        const w = canvas.width / window.devicePixelRatio;
        const h = canvas.height / window.devicePixelRatio;
        
        ctx.clearRect(0, 0, w, h);

        const points1 = [];
        const points2 = [];
        const numPoints = 60;
        const amplitude = w * 0.15;
        const centerX = w * 0.5;
        const spacing = h / numPoints;

        for (let i = 0; i < numPoints; i++) {
            const y = i * spacing;
            const phase = (i * 0.15) + time * 0.02;
            const x1 = centerX + Math.sin(phase) * amplitude;
            const x2 = centerX + Math.sin(phase + Math.PI) * amplitude;
            const z1 = Math.cos(phase);
            const z2 = Math.cos(phase + Math.PI);
            
            points1.push({ x: x1, y, z: z1 });
            points2.push({ x: x2, y, z: z2 });
        }

        // Draw connecting lines (rungs)
        for (let i = 0; i < numPoints; i += 4) {
            const p1 = points1[i];
            const p2 = points2[i];
            const alpha = 0.06 + Math.abs(p1.z) * 0.08;
            
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        // Draw strand 1
        ctx.beginPath();
        for (let i = 0; i < points1.length; i++) {
            const p = points1[i];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw strand 2
        ctx.beginPath();
        for (let i = 0; i < points2.length; i++) {
            const p = points2[i];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw nodes
        [...points1, ...points2].forEach((p, idx) => {
            if (idx % 3 !== 0) return;
            const size = 2 + Math.abs(p.z) * 2;
            const alpha = 0.2 + Math.abs(p.z) * 0.4;
            const color = idx < points1.length ? '255, 255, 255' : '160, 160, 160';
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color}, ${alpha})`;
            ctx.fill();
        });

        time++;
        animId = requestAnimationFrame(draw);
    }

    draw();

    // Cleanup
    return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', resize);
    };
}

// ── Floating Particles ────────────────────────────────────────
function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    const colors = ['255, 255, 255', '180, 180, 180', '120, 120, 120', '200, 200, 200'];
    
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        const size = Math.random() * 3 + 1;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const left = Math.random() * 100;
        const delay = Math.random() * 15;
        const duration = Math.random() * 10 + 15;

        Object.assign(particle.style, {
            position: 'absolute',
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            background: `rgba(${color}, 0.4)`,
            left: `${left}%`,
            bottom: '-10px',
            animation: `particle-float ${duration}s linear ${delay}s infinite`,
            pointerEvents: 'none'
        });

        container.appendChild(particle);
    }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initHelixCanvas();
    initParticles();
});
