/* ═══════════════════════════════════════════════════════════════
   HELYX — Email Service (Resend)
   Transactional emails: password reset, welcome.
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

// ── Template ──────────────────────────────────────────────────
function baseTemplate(content) {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#000;">
  <div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Inter',system-ui,sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:rgba(255,255,255,0.7);padding:48px 40px;">
    <div style="text-align:center;margin-bottom:36px;">
      <h1 style="font-size:13px;font-weight:600;color:#fff;letter-spacing:0.18em;margin:0;">HELYX</h1>
    </div>
    ${content}
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:36px 0 16px;">
    <p style="font-size:11px;color:rgba(255,255,255,0.3);text-align:center;margin:0 0 4px;">
      &copy; ${new Date().getFullYear()} Helyx
    </p>
    <p style="font-size:11px;color:rgba(255,255,255,0.3);text-align:center;margin:0;">
      Not medical advice. Talk to a clinician before starting any protocol.
    </p>
  </div>
</body>
</html>`;
}

function buttonBlock(href, label) {
    return `<div style="text-align:center;margin:28px 0;">
        <a href="${href}" style="display:inline-block;padding:13px 32px;background:#fff;color:#000;text-decoration:none;border-radius:9999px;font-weight:600;font-size:14px;letter-spacing:0.01em;">${label}</a>
    </div>`;
}

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
        from: FROM_ADDRESS, to: [to], subject, html
    });
    if (error) {
        console.error('Resend error:', error);
        throw new Error(error.message);
    }
    console.log(`📧 Sent: ${subject} → ${to} (${data.id})`);
    return data;
}

// ── Password Reset ────────────────────────────────────────────
async function sendPasswordResetEmail(to, resetToken) {
    const resetLink = `${FRONTEND_URL}/reset-password.html?token=${resetToken}`;
    const html = baseTemplate(`
        <h2 style="font-size:18px;font-weight:600;color:#fff;margin:0 0 16px;">Reset your password</h2>
        <p style="font-size:14px;line-height:1.65;color:rgba(255,255,255,0.7);margin:0 0 8px;">
            We got a request to reset the password on your Helyx account. Use the button below to choose a new one.
        </p>
        <p style="font-size:12px;color:rgba(255,255,255,0.4);margin:0 0 4px;">This link expires in 1 hour.</p>
        ${buttonBlock(resetLink, 'Reset password')}
        <p style="font-size:12px;line-height:1.6;color:rgba(255,255,255,0.4);margin:0;">
            If you didn't request this, ignore this email and your password stays the same.
        </p>
    `);
    return send({ to, subject: 'Reset your Helyx password', html });
}

// ── Welcome ───────────────────────────────────────────────────
async function sendWelcomeEmail(to, firstName) {
    const html = baseTemplate(`
        <h2 style="font-size:18px;font-weight:600;color:#fff;margin:0 0 16px;">
            Welcome${firstName ? ', ' + firstName : ''}.
        </h2>
        <p style="font-size:14px;line-height:1.65;color:rgba(255,255,255,0.7);margin:0 0 16px;">
            Your Helyx account is ready. The app is the journal — this site is for managing your account and Premium subscription.
        </p>
        <p style="font-size:14px;line-height:1.65;color:rgba(255,255,255,0.7);margin:0 0 8px;">
            If you haven't installed it yet, you'll get a TestFlight link as soon as your beta seat opens.
        </p>
        ${buttonBlock(FRONTEND_URL, 'Visit helyx.us')}
    `);
    return send({ to, subject: 'Welcome to Helyx', html });
}

module.exports = {
    sendPasswordResetEmail,
    sendWelcomeEmail
};
