/* ═══════════════════════════════════════════════════════════════
   HELYX — Global JS
   Nav scroll state, mobile toggle, fade-in animations.
   ═══════════════════════════════════════════════════════════════ */

// ── Nav scroll state ──────────────────────────────────────
(function initNavScroll() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const update = () => nav.classList.toggle('nav--scrolled', window.scrollY > 8);
    update();
    window.addEventListener('scroll', update, { passive: true });
})();

// ── Mobile menu ───────────────────────────────────────────
(function initMobileMenu() {
    const toggle = document.getElementById('mobile-toggle');
    const links = document.getElementById('nav-links');
    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        links.classList.toggle('open');
        document.body.style.overflow = links.classList.contains('open') ? 'hidden' : '';
    });

    links.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
            toggle.classList.remove('active');
            links.classList.remove('open');
            document.body.style.overflow = '';
        });
    });
})();

// ── Fade-in on scroll ─────────────────────────────────────
(function initFadeIn() {
    const els = document.querySelectorAll('.anim-fade-up');
    if (!els.length) return;

    if (!('IntersectionObserver' in window)) {
        els.forEach(el => el.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = parseInt(entry.target.dataset.delay || '0', 10);
                setTimeout(() => entry.target.classList.add('is-visible'), delay);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

    els.forEach(el => observer.observe(el));
})();

// ── Smooth anchor scroll (offset for fixed nav) ───────────
(function initAnchorScroll() {
    document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const href = a.getAttribute('href');
        if (href === '#' || href.length < 2) return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - 64;
        window.scrollTo({ top, behavior: 'smooth' });
    });
})();
