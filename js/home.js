/* ═══════════════════════════════════════════════════════════════
   HELYX — Home Page JavaScript
   ═══════════════════════════════════════════════════════════════ */

// ── Counter animation for data strip values ───────────────────
function initStripCounters() {
    const values = document.querySelectorAll('.hero__strip-value');
    if (!values.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateValue(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    values.forEach(v => observer.observe(v));
}

function animateValue(el) {
    const text = el.textContent;
    const match = text.match(/([\d.]+)/);
    if (!match) return;

    const target = parseFloat(match[1]);
    const prefix = text.slice(0, text.indexOf(match[1]));
    const suffix = text.slice(text.indexOf(match[1]) + match[1].length);
    const decimals = match[1].includes('.') ? match[1].split('.')[1].length : 0;
    const duration = 1200;
    const start = performance.now();

    function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = (target * eased).toFixed(decimals);
        el.textContent = prefix + current + suffix;
        if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initStripCounters();
});
