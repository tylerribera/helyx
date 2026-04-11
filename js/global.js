/* ═══════════════════════════════════════════════════════════════
   HELYX — Global JavaScript
   Shared functionality: nav, cart, animations, age gate
   ═══════════════════════════════════════════════════════════════ */

// ── Cart State ────────────────────────────────────────────────
const Cart = {
    items: JSON.parse(localStorage.getItem('helyx_cart') || '[]'),

    add(name, price) {
        const existing = this.items.find(i => i.name === name);
        if (existing) {
            existing.qty += 1;
        } else {
            this.items.push({ name, price: parseFloat(price), qty: 1 });
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

    // ── Doc popup (TOS / Privacy) ──
    const docView = gate.querySelector('.age-gate__doc-view');
    if (docView) {
        const modal    = gate.querySelector('.age-gate__modal');
        const docTitle = docView.querySelector('.age-gate__doc-title');
        const docBody  = docView.querySelector('.age-gate__doc-body');
        const docBack  = docView.querySelector('.age-gate__doc-back');

        const docs = {
            tos: {
                title: 'Terms of Service',
                body: `
<p><strong>Last Updated:</strong> April 6, 2026</p>

<h3>1. Acceptance of Terms</h3>
<p>By accessing or using the Helyx website ("helyx.us") and purchasing any products, you agree to be bound by these Terms of Service. If you do not agree, do not use this site.</p>

<h3>2. Eligibility</h3>
<p>You must be at least 21 years of age to use this website or purchase products. By placing an order, you represent and warrant that you meet this age requirement.</p>

<h3>3. Product Use Disclaimer</h3>
<p>All products sold by Helyx are intended <strong>strictly for in-vitro laboratory research purposes only</strong>. Products are <strong>not for human or animal consumption</strong>, not for therapeutic use, and not intended to diagnose, treat, cure, or prevent any disease or condition. By purchasing, you confirm that you will use products solely for legitimate scientific research.</p>

<h3>4. No Medical Claims</h3>
<p>Helyx makes no medical or health claims regarding any product. Nothing on this website should be interpreted as medical advice. Consult a qualified professional for any health-related decisions.</p>

<h3>5. Purchasing & Payment</h3>
<p>All prices are listed in USD. We reserve the right to modify prices at any time without notice. Payment must be completed at the time of purchase. Orders are subject to acceptance and availability.</p>

<h3>6. Shipping & Delivery</h3>
<p>We ship to addresses within the United States. Shipping times are estimates and not guaranteed. Helyx is not responsible for delays caused by carriers, customs, or events beyond our control.</p>

<h3>7. Returns & Refunds</h3>
<p>Due to the nature of our products, all sales are final. We do not accept returns. If you receive a damaged or incorrect item, contact us within 7 days of delivery at <strong>support@helyx.us</strong> for resolution.</p>

<h3>8. Intellectual Property</h3>
<p>All content on this website — including text, images, logos, and design — is the property of Helyx and protected by copyright law. You may not reproduce, distribute, or create derivative works without our written permission.</p>

<h3>9. Limitation of Liability</h3>
<p>Helyx shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the website or products. Our total liability shall not exceed the amount you paid for the product in question.</p>

<h3>10. Indemnification</h3>
<p>You agree to indemnify and hold harmless Helyx, its owners, employees, and affiliates from any claims, damages, or expenses arising from your misuse of products or violation of these terms.</p>

<h3>11. Governing Law</h3>
<p>These Terms are governed by the laws of the State of California. Any disputes shall be resolved in the courts of San Diego County, California.</p>

<h3>12. Changes to Terms</h3>
<p>We may update these Terms at any time. Continued use of the site after changes constitutes acceptance of the new terms.</p>

<h3>13. Contact</h3>
<p>For questions regarding these Terms, contact us at <strong>support@helyx.us</strong>.</p>
`
            },
            privacy: {
                title: 'Privacy Policy',
                body: `
<p><strong>Last Updated:</strong> April 6, 2026</p>

<h3>1. Information We Collect</h3>
<p>We collect information you provide directly when placing an order: name, email address, shipping address, and payment information. We also collect basic analytics data (pages visited, browser type) to improve our site.</p>

<h3>2. How We Use Your Information</h3>
<ul>
<li>Process and fulfill your orders</li>
<li>Send order confirmations and shipping updates</li>
<li>Respond to customer support inquiries</li>
<li>Improve our website and services</li>
<li>Comply with legal obligations</li>
</ul>

<h3>3. Payment Security</h3>
<p>Payment processing is handled by PCI-compliant third-party processors. Helyx does not store your full credit card number, CVV, or other sensitive payment details on our servers.</p>

<h3>4. Information Sharing</h3>
<p>We do not sell, trade, or rent your personal information to third parties. We may share information only with:</p>
<ul>
<li>Payment processors (to complete transactions)</li>
<li>Shipping carriers (to deliver orders)</li>
<li>Law enforcement (if required by law)</li>
</ul>

<h3>5. Cookies</h3>
<p>We use essential cookies to maintain your session (cart, age verification). We may use analytics cookies to understand site usage. You can disable cookies in your browser settings, but some features may not work properly.</p>

<h3>6. Data Retention</h3>
<p>We retain order information for as long as necessary to fulfill our legal and business obligations. You may request deletion of your personal data by contacting us at <strong>support@helyx.us</strong>.</p>

<h3>7. Your Rights</h3>
<p>Depending on your jurisdiction, you may have the right to access, correct, or delete your personal information. California residents have additional rights under the CCPA. Contact us to exercise these rights.</p>

<h3>8. Third-Party Links</h3>
<p>Our site may contain links to third-party websites. We are not responsible for their privacy practices. We encourage you to review their policies.</p>

<h3>9. Children's Privacy</h3>
<p>Our website is not intended for individuals under 21. We do not knowingly collect information from minors.</p>

<h3>10. Security</h3>
<p>We implement reasonable security measures to protect your information, including SSL encryption, secure servers, and access controls. However, no method of transmission over the internet is 100% secure.</p>

<h3>11. Changes to This Policy</h3>
<p>We may update this Privacy Policy at any time. Changes will be posted on this page with an updated date.</p>

<h3>12. Contact</h3>
<p>For privacy-related inquiries, contact us at <strong>support@helyx.us</strong>.</p>
`
            }
        };

        gate.querySelectorAll('[data-doc]').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                const doc = docs[link.dataset.doc];
                if (!doc) return;
                docTitle.textContent = doc.title;
                docBody.innerHTML = doc.body;
                modal.classList.add('showing-doc');
                docBody.scrollTop = 0;
            });
        });

        docBack.addEventListener('click', () => modal.classList.remove('showing-doc'));
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
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = toggle.classList.toggle('active');
            links.classList.toggle('open');
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });

        // Close on link click
        links.querySelectorAll('.nav__link').forEach(link => {
            link.addEventListener('click', () => {
                toggle.classList.remove('active');
                links.classList.remove('open');
                document.body.style.overflow = '';
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
                const delay = parseInt(entry.target.dataset.delay || 0) * 4;
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
            const target = document.querySelector(this.getAttribute('href'));
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
