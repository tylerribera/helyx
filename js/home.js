/* ═══════════════════════════════════════════════════════════════
   HELYX — Home JS
   Waitlist form submit.
   ═══════════════════════════════════════════════════════════════ */

(function initWaitlist() {
    const form = document.getElementById('waitlist-form');
    const status = document.getElementById('waitlist-status');
    if (!form || !status) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = form.querySelector('input[name="email"]');
        const email = (input.value || '').trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            status.textContent = 'Please enter a valid email.';
            return;
        }
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Sending…';

        try {
            await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            }).catch(() => {});
        } finally {
            form.reset();
            btn.disabled = false;
            btn.textContent = 'Request invite';
            status.textContent = "You're on the list. We'll be in touch.";
        }
    });
})();
