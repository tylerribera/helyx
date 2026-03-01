/* ═══════════════════════════════════════════════════════════════
   HELYX — Email Service (Nodemailer)
   Password reset emails & notifications
   ═══════════════════════════════════════════════════════════════ */

const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
    if (transporter) return transporter;

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    // If SMTP not configured, use a preview-only console logger
    if (!host || !user || !pass) {
        console.log('⚠ SMTP not configured — emails will be logged to console');
        return null;
    }

    transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: { user, pass }
    });

    return transporter;
}

/**
 * Send a password reset email
 */
async function sendPasswordResetEmail(to, resetToken) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const resetLink = `${frontendUrl}/reset-password.html?token=${resetToken}`;

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; max-width: 520px; margin: 0 auto; background: #0a0a0a; color: #e0e0e0; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 500; color: #ffffff; letter-spacing: 0.12em;">HELYX</h1>
        </div>
        <h2 style="font-size: 18px; font-weight: 500; color: #ffffff; margin-bottom: 16px;">Password Reset Request</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #a0a0a0; margin-bottom: 24px;">
            We received a request to reset the password for your Helyx account. Click the button below to choose a new password. This link expires in 1 hour.
        </p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" style="display: inline-block; padding: 12px 32px; background: #ffffff; color: #000000; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; letter-spacing: 0.02em;">
                Reset Password
            </a>
        </div>
        <p style="font-size: 12px; line-height: 1.6; color: #666666; margin-top: 32px;">
            If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
        </p>
        <hr style="border: none; border-top: 1px solid #222; margin: 32px 0 16px;">
        <p style="font-size: 11px; color: #444;">© 2026 Helyx LLC. All rights reserved.</p>
    </div>`;

    const transport = getTransporter();
    if (!transport) {
        console.log('─────────────────────────────────────────');
        console.log('📧 PASSWORD RESET EMAIL (console preview)');
        console.log(`   To: ${to}`);
        console.log(`   Reset Link: ${resetLink}`);
        console.log('─────────────────────────────────────────');
        return;
    }

    await transport.sendMail({
        from: `"Helyx" <${process.env.SMTP_FROM || 'noreply@helyx.us'}>`,
        to,
        subject: 'Reset your Helyx password',
        html
    });
}

/**
 * Send a welcome email after registration
 */
async function sendWelcomeEmail(to, firstName) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; max-width: 520px; margin: 0 auto; background: #0a0a0a; color: #e0e0e0; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 500; color: #ffffff; letter-spacing: 0.12em;">HELYX</h1>
        </div>
        <h2 style="font-size: 18px; font-weight: 500; color: #ffffff; margin-bottom: 16px;">Welcome${firstName ? ', ' + firstName : ''}!</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #a0a0a0; margin-bottom: 24px;">
            Your Helyx account has been created successfully. You now have access to our full catalog of research-grade peptides, order tracking, and account management.
        </p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="${frontendUrl}/products.html" style="display: inline-block; padding: 12px 32px; background: #ffffff; color: #000000; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
                Browse Peptides
            </a>
        </div>
        <hr style="border: none; border-top: 1px solid #222; margin: 32px 0 16px;">
        <p style="font-size: 11px; color: #444;">© 2026 Helyx LLC. All rights reserved.</p>
    </div>`;

    const transport = getTransporter();
    if (!transport) {
        console.log('📧 WELCOME EMAIL sent to:', to);
        return;
    }

    await transport.sendMail({
        from: `"Helyx" <${process.env.SMTP_FROM || 'noreply@helyx.us'}>`,
        to,
        subject: 'Welcome to Helyx',
        html
    });
}

module.exports = { sendPasswordResetEmail, sendWelcomeEmail };
