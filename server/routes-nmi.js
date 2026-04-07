/* ═══════════════════════════════════════════════════════════════
   HELYX — NMI Gateway Integration
   Direct card payments, Apple Pay, Google Pay via NMI
   ═══════════════════════════════════════════════════════════════ */

const express = require('express');
const crypto = require('crypto');
const db = require('./db');
const { optionalAuth } = require('./middleware');

const router = express.Router();

// NMI credentials (set these once you have your merchant account)
const NMI_SECURITY_KEY = process.env.NMI_SECURITY_KEY;       // API Security Key from NMI
const NMI_API_URL = 'https://secure.nmi.com/api/transact.php';
const NMI_COLLECT_JS_KEY = process.env.NMI_TOKENIZATION_KEY;  // Collect.js tokenization key

// ── GET /api/nmi/config ────────────────────────────────────────
// Returns public NMI config for frontend (tokenization key only)
router.get('/config', (req, res) => {
    if (!NMI_COLLECT_JS_KEY) {
        return res.status(503).json({ error: 'Payment gateway not configured yet' });
    }
    res.json({
        tokenizationKey: NMI_COLLECT_JS_KEY,
        applePay: !!process.env.NMI_APPLE_PAY_ENABLED,
        googlePay: !!process.env.NMI_GOOGLE_PAY_ENABLED
    });
});

// ── POST /api/nmi/charge ───────────────────────────────────────
// Process a card payment via NMI using a payment token from Collect.js
router.post('/charge', optionalAuth, async (req, res) => {
    try {
        const {
            paymentToken,          // From Collect.js tokenization
            email,
            firstName,
            lastName,
            institution,
            address,
            city,
            state,
            zip,
            country,
            cartItems              // [{ name, price, qty }]
        } = req.body;

        // ── Validation ────────────────────────────────────────
        if (!paymentToken) {
            return res.status(400).json({ error: 'Payment token is required' });
        }
        if (!email || !firstName || !lastName || !address || !city || !state || !zip) {
            return res.status(400).json({ error: 'All shipping fields are required' });
        }
        if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }
        if (!NMI_SECURITY_KEY) {
            return res.status(503).json({ error: 'Payment gateway not configured. Please try crypto payment.' });
        }

        // ── Calculate totals (server-side, authoritative) ─────
        let subtotal = 0;
        for (const item of cartItems) {
            const price = parseFloat(item.price);
            const qty = parseInt(item.qty, 10);
            if (isNaN(price) || isNaN(qty) || price <= 0 || qty <= 0) {
                return res.status(400).json({ error: 'Invalid cart item' });
            }
            subtotal += price * qty;
        }
        subtotal = Math.round(subtotal * 100) / 100;

        const shippingCost = subtotal >= 200 ? 0 : 12.99;
        const totalUSD = Math.round((subtotal + shippingCost) * 100) / 100;

        // ── Generate reference ID ─────────────────────────────
        const referenceId = `nmi_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const userId = req.user ? req.user.id : null;

        // ── Build NMI request ─────────────────────────────────
        // NMI uses URL-encoded form data for their Direct Post API
        const nmiParams = new URLSearchParams({
            security_key: NMI_SECURITY_KEY,
            type: 'sale',
            amount: totalUSD.toFixed(2),
            payment_token: paymentToken,

            // Order info
            orderid: referenceId,
            order_description: `Helyx Research — ${cartItems.length} item(s)`,

            // Billing info (required for AVS matching)
            first_name: firstName,
            last_name: lastName,
            address1: address,
            city: city,
            state: state,
            zip: zip,
            country: country || 'US',
            email: email,
            company: institution || '',

            // Shipping info (same as billing for now)
            shipping_firstname: firstName,
            shipping_lastname: lastName,
            shipping_address1: address,
            shipping_city: city,
            shipping_state: state,
            shipping_zip: zip,
            shipping_country: country || 'US',
            shipping_email: email,

            // Processing flags
            currency: 'USD',
            ip_address: req.ip || req.headers['x-forwarded-for'] || ''
        });

        // ── Send to NMI ───────────────────────────────────────
        console.log(`[NMI] Charging $${totalUSD} for order ${referenceId}`);

        const nmiRes = await fetch(NMI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: nmiParams.toString()
        });

        const nmiText = await nmiRes.text();
        const nmiData = Object.fromEntries(new URLSearchParams(nmiText));

        console.log(`[NMI] Response: response=${nmiData.response} responsetext=${nmiData.responsetext} transactionid=${nmiData.transactionid}`);

        // NMI response codes: 1 = Approved, 2 = Declined, 3 = Error
        if (nmiData.response !== '1') {
            // Store failed order for tracking
            const stmt = db.prepare(`
                INSERT INTO orders (
                    user_id, email, reference_id, payment_method,
                    amount_usd, shipping_cost, status, cart_items,
                    first_name, last_name, institution,
                    address, city, state, zip, country, tx_hash
                ) VALUES (?, ?, ?, ?, ?, ?, 'failed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(
                userId, email, referenceId, 'card',
                totalUSD, shippingCost, JSON.stringify(cartItems),
                firstName, lastName, institution || '',
                address, city, state, zip, country || 'United States',
                nmiData.transactionid || null
            );

            const userMessage = nmiData.response === '2'
                ? 'Your card was declined. Please check your details or try a different card.'
                : 'Payment processing error. Please try again or use crypto payment.';

            return res.status(402).json({
                error: userMessage,
                code: nmiData.response_code || 'unknown'
            });
        }

        // ── Payment approved — store order ────────────────────
        const stmt = db.prepare(`
            INSERT INTO orders (
                user_id, email, reference_id, payment_method,
                amount_usd, shipping_cost, status, cart_items,
                first_name, last_name, institution,
                address, city, state, zip, country,
                tx_hash, paid_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `);

        const result = stmt.run(
            userId, email, referenceId, 'card',
            totalUSD, shippingCost, JSON.stringify(cartItems),
            firstName, lastName, institution || '',
            address, city, state, zip, country || 'United States',
            nmiData.transactionid || null
        );

        console.log(`[NMI] ✅ Order #${result.lastInsertRowid} PAID — $${totalUSD} — tx: ${nmiData.transactionid}`);

        res.json({
            success: true,
            orderId: result.lastInsertRowid,
            referenceId: referenceId,
            amount: totalUSD,
            transactionId: nmiData.transactionid
        });

    } catch (err) {
        console.error('[NMI] Charge error:', err);
        res.status(500).json({ error: 'Payment processing failed. Please try again.' });
    }
});

// ── POST /api/nmi/webhook ──────────────────────────────────────
// NMI webhook for async notifications (chargebacks, refunds, etc.)
router.post('/webhook', express.raw({ type: '*/*' }), (req, res) => {
    try {
        let payload;
        if (Buffer.isBuffer(req.body)) {
            payload = Object.fromEntries(new URLSearchParams(req.body.toString()));
        } else if (typeof req.body === 'string') {
            payload = Object.fromEntries(new URLSearchParams(req.body));
        } else {
            payload = req.body;
        }

        console.log('[NMI Webhook] Received:', JSON.stringify(payload));

        const orderId = payload.orderid || payload.order_id;
        const action = payload.action || payload.type;

        if (!orderId) {
            return res.status(400).json({ error: 'Missing order ID' });
        }

        const order = db.prepare('SELECT id, status FROM orders WHERE reference_id = ?').get(orderId);
        if (!order) {
            console.warn(`[NMI Webhook] Order not found: ${orderId}`);
            return res.status(404).json({ error: 'Order not found' });
        }

        // Handle different webhook events
        if (action === 'refund' || payload.condition === 'refund') {
            db.prepare(`UPDATE orders SET status = 'refunded', updated_at = datetime('now') WHERE reference_id = ?`).run(orderId);
            console.log(`[NMI Webhook] Order ${orderId} refunded`);
        } else if (action === 'chargeback' || payload.condition === 'chargeback') {
            db.prepare(`UPDATE orders SET status = 'chargeback', updated_at = datetime('now') WHERE reference_id = ?`).run(orderId);
            console.log(`[NMI Webhook] Order ${orderId} chargeback`);
        }

        res.json({ received: true });
    } catch (err) {
        console.error('[NMI Webhook] Error:', err);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

module.exports = router;
