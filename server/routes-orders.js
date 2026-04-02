/* ═══════════════════════════════════════════════════════════════
   HELYX — Order & Payment Routes
   PayRam payment integration (crypto + card-to-crypto)
   ═══════════════════════════════════════════════════════════════ */

const express = require('express');
const crypto = require('crypto');
const db = require('./db');
const { optionalAuth } = require('./middleware');

const router = express.Router();

const PAYRAM_API_URL = process.env.PAYRAM_API_URL;   // https://pay.helyx.us:8443
const PAYRAM_API_KEY = process.env.PAYRAM_API_KEY;
const PAYRAM_WEBHOOK_SECRET = process.env.PAYRAM_WEBHOOK_SECRET;

// ── POST /api/orders/create-payment ────────────────────────────
// Creates an order in DB, calls PayRam to get a payment URL
router.post('/create-payment', optionalAuth, async (req, res) => {
    try {
        const {
            email,
            firstName,
            lastName,
            institution,
            address,
            city,
            state,
            zip,
            country,
            cartItems // [{ name, price, qty }]
        } = req.body;

        // ── Validation ────────────────────────────────────────
        if (!email || !firstName || !lastName || !address || !city || !state || !zip) {
            return res.status(400).json({ error: 'All shipping fields are required' });
        }
        if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
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

        // ── Determine customer ID ─────────────────────────────
        const userId = req.user ? req.user.id : null;
        const customerID = userId ? `user_${userId}` : `guest_${Date.now()}`;

        // ── Call PayRam API to create payment ─────────────────
        const payramRes = await fetch(`${PAYRAM_API_URL}/api/v1/payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'API-Key': PAYRAM_API_KEY
            },
            body: JSON.stringify({
                customerID,
                customerEmail: email,
                amountInUSD: totalUSD
            })
        });

        if (!payramRes.ok) {
            const errText = await payramRes.text();
            console.error('PayRam API error:', payramRes.status, errText);
            return res.status(502).json({ error: 'Payment service unavailable. Please try again.' });
        }

        const payramData = await payramRes.json();
        // payramData: { host, reference_id, url }

        if (!payramData.reference_id || !payramData.url) {
            console.error('PayRam unexpected response:', payramData);
            return res.status(502).json({ error: 'Payment service returned an invalid response' });
        }

        // ── Store order in DB ─────────────────────────────────
        const stmt = db.prepare(`
            INSERT INTO orders (
                user_id, email, reference_id, payment_method,
                amount_usd, shipping_cost, status, cart_items,
                first_name, last_name, institution,
                address, city, state, zip, country, payment_url
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            userId,
            email,
            payramData.reference_id,
            'payram',
            totalUSD,
            shippingCost,
            JSON.stringify(cartItems),
            firstName,
            lastName,
            institution || '',
            address,
            city,
            state,
            zip,
            country || 'United States',
            payramData.url
        );

        console.log(`[Order #${result.lastInsertRowid}] Created — $${totalUSD} — ref: ${payramData.reference_id}`);

        // ── Return payment URL to frontend ────────────────────
        res.json({
            orderId: result.lastInsertRowid,
            referenceId: payramData.reference_id,
            paymentUrl: payramData.url,
            amount: totalUSD
        });

    } catch (err) {
        console.error('Create payment error:', err);
        res.status(500).json({ error: 'Failed to create payment' });
    }
});

// ── GET /api/orders/:referenceId/status ────────────────────────
// Check order status (for polling after payment)
router.get('/:referenceId/status', (req, res) => {
    try {
        const { referenceId } = req.params;
        const order = db.prepare(
            'SELECT id, status, amount_usd, paid_at, currency, network FROM orders WHERE reference_id = ?'
        ).get(referenceId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json({
            orderId: order.id,
            status: order.status,
            amount: order.amount_usd,
            paidAt: order.paid_at,
            currency: order.currency,
            network: order.network
        });
    } catch (err) {
        console.error('Order status error:', err);
        res.status(500).json({ error: 'Failed to check order status' });
    }
});

// ═══════════════════════════════════════════════════════════════
// Webhook Router (separate — mounted at /api/webhooks)
// ═══════════════════════════════════════════════════════════════
const webhookRouter = express.Router();

// ── POST /api/webhooks/payram ──────────────────────────────────
// Called by PayRam when payment status changes
webhookRouter.post('/payram', express.raw({ type: 'application/json' }), (req, res) => {
    try {
        // Parse body (may arrive as raw buffer or already parsed)
        let payload;
        if (Buffer.isBuffer(req.body)) {
            payload = JSON.parse(req.body.toString());
        } else {
            payload = req.body;
        }

        console.log('[Webhook] PayRam callback received:', JSON.stringify(payload));

        // Validate webhook secret if provided in header
        const headerSecret = req.headers['x-webhook-secret'] || req.headers['webhook-secret'];
        if (PAYRAM_WEBHOOK_SECRET && headerSecret && headerSecret !== PAYRAM_WEBHOOK_SECRET) {
            console.warn('[Webhook] Invalid secret');
            return res.status(403).json({ error: 'Invalid webhook secret' });
        }

        // Extract fields from PayRam webhook payload
        // PayRam sends: reference_id, status, tx_hash, currency, network, amount, etc.
        const referenceId = payload.reference_id || payload.referenceId;
        const status = payload.status;

        if (!referenceId) {
            console.warn('[Webhook] Missing reference_id in payload');
            return res.status(400).json({ error: 'Missing reference_id' });
        }

        // Find the order
        const order = db.prepare('SELECT id, status FROM orders WHERE reference_id = ?').get(referenceId);
        if (!order) {
            console.warn(`[Webhook] Order not found for reference_id: ${referenceId}`);
            return res.status(404).json({ error: 'Order not found' });
        }

        // Map PayRam status to our status
        let newStatus = order.status;
        if (status === 'completed' || status === 'paid' || status === 'confirmed' || status === 'success') {
            newStatus = 'paid';
        } else if (status === 'expired') {
            newStatus = 'expired';
        } else if (status === 'failed' || status === 'cancelled') {
            newStatus = 'failed';
        } else if (status === 'pending' || status === 'waiting') {
            newStatus = 'pending';
        }

        // Update the order
        const updateStmt = db.prepare(`
            UPDATE orders SET
                status = ?,
                tx_hash = COALESCE(?, tx_hash),
                currency = COALESCE(?, currency),
                network = COALESCE(?, network),
                paid_at = CASE WHEN ? = 'paid' THEN datetime('now') ELSE paid_at END,
                updated_at = datetime('now')
            WHERE reference_id = ?
        `);

        updateStmt.run(
            newStatus,
            payload.tx_hash || payload.txHash || null,
            payload.currency || null,
            payload.network || null,
            newStatus,
            referenceId
        );

        console.log(`[Webhook] Order #${order.id} updated: ${order.status} → ${newStatus}`);

        res.json({ received: true, orderId: order.id, status: newStatus });

    } catch (err) {
        console.error('[Webhook] Error processing PayRam webhook:', err);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

module.exports = router;
module.exports.webhookRouter = webhookRouter;
