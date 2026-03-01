/* ═══════════════════════════════════════════════════════════════
   HELYX — Email Service (Resend)
   Transactional emails: password reset, welcome, etc.
   ═══════════════════════════════════════════════════════════════ */

const { Resend } = require('resend');

const FROM_ADDRESS = process.env.EMAIL_FROM || 'Helyx <noreply@helyx.us>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://helyx.us';

let resend;

function getClient() {
    if (resend) return resend;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.log('⚠ RESEND_API_KEY not set — emails will be logged to console');
        return null;
    }

    resend = new Resend(apiKey);
    return resend;
}

// ── Email Templates ───────────────────────────────────────────

function baseTemplate(content) {
    return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #000000;">
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; background: #0a0a0a; color: #e0e0e0; padding: 48px 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 36px;">
            <h1 style="font-size: 22px; font-weight: 500; color: #ffffff; letter-spacing: 0.14em; margin: 0;">HELYX</h1>
        </div>
        ${content}
        <hr style="border: none; border-top: 1px solid #1a1a1a; margin: 36px 0 16px;">
        <p style="font-size: 11px; color: #444; text-align: center; margin: 0;">
            &copy; ${new Date().getFullYear()} Helyx LLC &middot; All rights reserved.
        </p>
    </div>
</body>
</html>`;
}

function buttonBlock(href, label) {
    return `
        <div style="text-align: center; margin: 32px 0;">
            <a href="${href}" style="display: inline-block; padding: 13px 36px; background: #ffffff; color: #000000; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; letter-spacing: 0.02em;">
                ${label}
            </a>
        </div>`;
}

// ── Send Helper ───────────────────────────────────────────────

async function send({ to, subject, html }) {
    const client = getClient();

    if (!client) {
        console.log('─────────────────────────────────────────');
        console.log(`📧  ${subject}`);
        console.log(`    To: ${to}`);
        console.log('─────────────────────────────────────────');
        return { id: 'console-preview' };
    }

    const { data, error } = await client.emails.send({
        from: FROM_ADDRESS,
        to: [to],
        subject,
        html
    });

    if (error) {
        console.error('Resend error:', error);
        throw new Error(error.message);
    }

    console.log(`📧 Email sent: ${subject} → ${to} (id: ${data.id})`);
    return data;
}

// ── Password Reset ────────────────────────────────────────────

async function sendPasswordResetEmail(to, resetToken) {
    const resetLink = `${FRONTEND_URL}/reset-password.html?token=${resetToken}`;

    const html = baseTemplate(`
        <h2 style="font-size: 18px; font-weight: 500; color: #ffffff; margin: 0 0 16px;">Password Reset Request</h2>
        <p style="font-size: 14px; line-height: 1.7; color: #a0a0a0; margin: 0 0 8px;">
            We received a request to reset the password for your Helyx account.
            Click the button below to choose a new password.
        </p>
        <p style="font-size: 13px; color: #666; margin: 0 0 4px;">This link expires in 1 hour.</p>
        ${buttonBlock(resetLink, 'Reset Password')}
        <p style="font-size: 12px; line-height: 1.6; color: #555; margin: 0;">
            If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
        </p>
    `);

    return send({ to, subject: 'Reset your Helyx password', html });
}

// ── Welcome Email ─────────────────────────────────────────────

async function sendWelcomeEmail(to, firstName) {
    const html = baseTemplate(`
        <h2 style="font-size: 18px; font-weight: 500; color: #ffffff; margin: 0 0 16px;">
            Welcome${firstName ? ', ' + firstName : ''}!
        </h2>
        <p style="font-size: 14px; line-height: 1.7; color: #a0a0a0; margin: 0 0 24px;">
            Your Helyx account has been created successfully. You now have access to our
            full catalog of research-grade peptides, order tracking, and account management.
        </p>
        ${buttonBlock(FRONTEND_URL + '/products.html', 'Browse Peptides')}
    `);

    return send({ to, subject: 'Welcome to Helyx', html });
}

module.exports = { sendPasswordResetEmail, sendWelcomeEmail };
