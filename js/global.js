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

    // Document viewer overlay
    const docContent = {
        tos: {
            title: 'Terms of Service',
            html: `
                <h3>1. Eligibility</h3>
                <p>You must be at least <strong>21 years of age</strong> to access this Site or purchase any products.</p>
                <h3>2. Products & Intended Use</h3>
                <p>All products are <strong>synthetic research peptides for laboratory and in-vitro use only</strong>.</p>
                <ul>
                    <li>NOT for human or animal consumption</li>
                    <li>NOT dietary supplements, food, drugs, or medicines</li>
                    <li>NOT intended to diagnose, treat, cure, or prevent any disease</li>
                    <li>NOT evaluated or approved by the FDA</li>
                    <li>NOT for resale to the general public</li>
                </ul>
                <h3>3. Account Registration</h3>
                <p>You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.</p>
                <h3>4. Orders & Pricing</h3>
                <p>All prices are in USD and subject to change. We reserve the right to refuse or cancel any order at our sole discretion.</p>
                <h3>5. Payment</h3>
                <p>Payments are processed through secure third-party processors. Helyx does not store your full credit card information.</p>
                <h3>6. Shipping & Delivery</h3>
                <p>We ship within the United States. Shipping times are estimates only. Risk of loss passes to you upon delivery to the carrier.</p>
                <h3>7. Returns & Refunds</h3>
                <p><strong>All sales are final.</strong> Refunds may be issued at our discretion for damaged, incorrect, or impure products. Contact support@helyx.us within 7 days of delivery.</p>
                <h3>8. Disclaimer of Warranties</h3>
                <p>The Site and all products are provided "AS IS" without warranties of any kind, express or implied.</p>
                <h3>9. Limitation of Liability</h3>
                <p>Helyx shall not be liable for any indirect, incidental, special, or consequential damages. Total liability shall not exceed the amount paid for the product giving rise to the claim.</p>
                <h3>10. Indemnification</h3>
                <p>You agree to indemnify and hold harmless Helyx LLC from any claims arising from your use of the Site or misuse of products.</p>
                <h3>11. Governing Law</h3>
                <p>Governed by the laws of the State of California. Disputes resolved exclusively in San Diego County courts.</p>
                <h3>12. Changes</h3>
                <p>We may update these Terms at any time. Continued use constitutes acceptance. Contact: support@helyx.us</p>
            `
        },
        privacy: {
            title: 'Privacy Policy',
            html: `
                <h3>1. Information We Collect</h3>
                <p><strong>You provide:</strong> name, email, shipping address, institution name, account credentials, order details.</p>
                <p><strong>Payment:</strong> processed by secure third-party processors — we never store your full card number.</p>
                <p><strong>Automatic:</strong> browser type, IP address, pages visited, referral source.</p>
                <h3>2. Cookies & Tracking</h3>
                <p>We use cookies to keep you signed in, remember your cart, analyze traffic, and serve ads via Meta Pixel. You can control cookies in your browser settings.</p>
                <h3>3. How We Use Your Information</h3>
                <ul>
                    <li>Process and fulfill orders</li>
                    <li>Manage your account</li>
                    <li>Send order updates and shipping notifications</li>
                    <li>Improve the Site</li>
                    <li>Prevent fraud</li>
                    <li>Comply with legal obligations</li>
                </ul>
                <h3>4. How We Share Your Information</h3>
                <p>We do <strong>not sell your data</strong>. We share only with payment processors, shipping carriers, email service providers, and analytics tools — or when required by law.</p>
                <h3>5. Data Security</h3>
                <p>SSL/TLS encryption, bcrypt password hashing, PCI-compliant payment tokenization, and access controls. No method is 100% secure.</p>
                <h3>6. Your Rights</h3>
                <ul>
                    <li>Access, correct, or delete your personal data</li>
                    <li>Opt out of marketing emails anytime</li>
                    <li>Control cookies via browser settings</li>
                </ul>
                <p>California residents have additional rights under the CCPA.</p>
                <h3>7. Data Retention</h3>
                <p>We retain data as long as needed for your account, legal obligations, and dispute resolution. Request deletion at support@helyx.us.</p>
                <h3>8. Children's Privacy</h3>
                <p>Not intended for anyone under 21. We do not knowingly collect data from anyone under 21.</p>
                <h3>9. Changes</h3>
                <p>We may update this policy at any time. Continued use constitutes acceptance. Contact: support@helyx.us</p>
            `
        }
    };

    const viewer = document.getElementById('age-gate-doc-viewer');
    const viewerTitle = document.getElementById('age-gate-doc-title');
    const viewerBody = document.getElementById('age-gate-doc-body');
    const viewerClose = document.getElementById('age-gate-doc-close');

    gate.querySelectorAll('.age-gate__doc-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const doc = docContent[link.getAttribute('data-doc')];
            if (doc && viewer) {
                viewerTitle.textContent = doc.title;
                viewerBody.innerHTML = doc.html;
                viewer.classList.add('active');
            }
        });
    });

    if (viewerClose) {
        viewerClose.addEventListener('click', () => {
            viewer.classList.remove('active');
        });
    }

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
