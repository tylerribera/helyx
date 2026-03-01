/* ═══════════════════════════════════════════════════════════════
   HELYX — Global JavaScript
   Shared functionality: nav, cart, animations, age gate
   ═══════════════════════════════════════════════════════════════ */

// ── HTTPS Enforcement ────────────────────────────────────────
if (location.protocol === 'http:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    location.replace('https://' + location.host + location.pathname + location.search + location.hash);
}

// ── Input Sanitization ───────────────────────────────────────
function sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ── Cart State ────────────────────────────────────────────────
const Cart = {
    items: (() => {
        try {
            const data = JSON.parse(localStorage.getItem('helyx_cart') || '[]');
            return Array.isArray(data) ? data.filter(i => i.name && typeof i.price === 'number' && typeof i.qty === 'number') : [];
        } catch { return []; }
    })(),

    add(name, price) {
        // Sanitize inputs
        name = String(name).replace(/[<>"'&]/g, '');
        price = parseFloat(price);
        if (!name || isNaN(price) || price <= 0) return;

        const existing = this.items.find(i => i.name === name);
        if (existing) {
            existing.qty += 1;
        } else {
            this.items.push({ name, price, qty: 1 });
        }
        this.save();
        this.updateUI();
        this.animateBadge();
    },

    remove(name) {
        this.items = this.items.filter(i => i.name !== name);
        this.save();
        this.updateUI();
    },

    updateQty(name, qty) {
        const item = this.items.find(i => i.name === name);
        if (item) {
            item.qty = Math.max(1, qty);
        }
        this.save();
        this.updateUI();
    },

    getTotal() {
        return this.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    },

    getCount() {
        return this.items.reduce((sum, i) => sum + i.qty, 0);
    },

    save() {
        localStorage.setItem('helyx_cart', JSON.stringify(this.items));
    },

    updateUI() {
        const countEl = document.getElementById('cart-count');
        if (countEl) {
            countEl.textContent = this.getCount();
        }
        // Dispatch event for checkout page
        window.dispatchEvent(new CustomEvent('cart-updated'));
    },

    animateBadge() {
        const countEl = document.getElementById('cart-count');
        if (countEl) {
            countEl.classList.add('bump');
            setTimeout(() => countEl.classList.remove('bump'), 300);
        }
    }
};

// Init cart count on load
document.addEventListener('DOMContentLoaded', () => {
    Cart.updateUI();
});

// ── Age Gate ──────────────────────────────────────────────────
function initAgeGate() {
    const gate = document.getElementById('age-gate');
    if (!gate) return;

    if (sessionStorage.getItem('helyx_age_verified')) {
        gate.classList.add('hidden');
        return;
    }

    const checks = gate.querySelectorAll('input[type="checkbox"]');
    const btn = document.getElementById('age-gate-enter');

    function updateBtn() {
        const allChecked = Array.from(checks).every(c => c.checked);
        btn.disabled = !allChecked;
    }

    checks.forEach(c => c.addEventListener('change', updateBtn));

    btn.addEventListener('click', () => {
        sessionStorage.setItem('helyx_age_verified', 'true');
        gate.style.opacity = '0';
        gate.style.transition = 'opacity 0.5s';
        setTimeout(() => gate.classList.add('hidden'), 500);
    });

    // Exit button (redirects away)
    const exitBtn = document.getElementById('age-gate-exit');
    if (exitBtn) {
        exitBtn.addEventListener('click', () => {
            window.location.href = 'https://google.com';
        });
    }
}

// ── Navigation ────────────────────────────────────────────────
function initNav() {
    const nav = document.getElementById('nav');
    const toggle = document.getElementById('mobile-toggle');
    const links = document.getElementById('nav-links');

    if (!nav) return;

    // Scroll effect
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        if (scrollY > 50) {
            nav.classList.add('nav--scrolled');
        } else {
            nav.classList.remove('nav--scrolled');
        }
        lastScroll = scrollY;
    }, { passive: true });

    // Mobile toggle
    if (toggle && links) {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            links.classList.toggle('open');
        });

        // Close on link click
        links.querySelectorAll('.nav__link').forEach(link => {
            link.addEventListener('click', () => {
                toggle.classList.remove('active');
                links.classList.remove('open');
            });
        });
    }
}

// ── Scroll Animations (Intersection Observer) ─────────────────
function initScrollAnimations() {
    const animElements = document.querySelectorAll('.anim-fade-up, .anim-fade-in, .anim-scale-up, .anim-slide-left, .anim-slide-right, .stagger-children');

    if (!animElements.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = parseInt(entry.target.dataset.delay || 0);
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, delay);
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
    });

    animElements.forEach(el => observer.observe(el));
}

// ── Add to Cart Buttons ───────────────────────────────────────
function initAddToCartButtons() {
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const name = btn.dataset.name;
            const price = btn.dataset.price;
            Cart.add(name, price);

            // Visual feedback
            const orig = btn.textContent;
            btn.textContent = '✓ Added';
            btn.style.background = 'var(--accent-green)';
            setTimeout(() => {
                btn.textContent = orig;
                btn.style.background = '';
            }, 1200);
        });
    });
}

// ── Smooth Scroll ─────────────────────────────────────────────
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (!href || href === '#' || !/^#[\w-]+$/.test(href)) return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// ── Counter Animation ─────────────────────────────────────────
function initCounters() {
    const counters = document.querySelectorAll('.stats__number[data-target]');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.dataset.target);
                animateCounter(el, target);
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));
}

function animateCounter(el, target) {
    const duration = 2000;
    const start = performance.now();

    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target);

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// ── Cursor Glow Effect ────────────────────────────────────────
function initCursorGlow() {
    const cards = document.querySelectorAll('.product-card, .why__card, .blog-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
            card.style.background = `radial-gradient(600px circle at ${x}px ${y}px, rgba(255,255,255,0.02), var(--bg-card))`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.background = '';
        });
    });
}

// ── Init All ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initAgeGate();
    initNav();
    initScrollAnimations();
    initAddToCartButtons();
    initSmoothScroll();
    initCounters();
    initCursorGlow();
});
