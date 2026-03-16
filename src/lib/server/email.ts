import nodemailer from 'nodemailer';

/**
 * Abstracted email sending logic.
 * Defaults to SMTP but can be extended for Resend/SendGrid etc.
 */
export async function sendMagicLinkEmail(email: string, url: string) {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const mailOptions = {
        from: `"DocReady" <${process.env.EMAIL_FROM || 'noreply@docready.co.za'}>`,
        to: email,
        subject: 'Activate Your DocReady Pro Access',
        text: `Hello,\n\nClick the link below to activate your DocReady Pro access. This link will expire in 15 minutes.\n\n${url}\n\nIf you didn't request this, you can safely ignore this email.`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
                <h2 style="color: #154734;">Activate DocReady Pro</h2>
                <p>Hello,</p>
                <p>Click the button below to activate your DocReady Pro access. This link is valid for 15 minutes.</p>
                <div style="margin: 30px 0;">
                    <a href="${url}" style="background-color: #154734; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Activate Access</a>
                </div>
                <p style="font-size: 12px; color: #666;">If the button doesn't work, copy and paste this URL into your browser:</p>
                <p style="font-size: 12px; color: #666;">${url}</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 11px; color: #999;">If you didn't request this email, no further action is required.</p>
            </div>
        `,
    };

    return transporter.sendMail(mailOptions);
}
