/**
 * Email Service — WinterWear
 * Provides transactional email sending via nodemailer.
 * In development, logs emails to console instead of sending if SMTP is not configured.
 */

let transporter = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  const nodemailer = await import('nodemailer');

  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    // In development, use ethereal email (auto-created test account)
    if (process.env.NODE_ENV !== 'production') {
      const testAccount = await nodemailer.default.createTestAccount();
      transporter = nodemailer.default.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('[EmailService] Using Ethereal test email account:', testAccount.user);
      return transporter;
    }
    throw new Error('SMTP configuration missing. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in environment.');
  }

  transporter = nodemailer.default.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: SMTP_SECURE === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
};

const FROM = process.env.SMTP_FROM || 'WinterWear <noreply@winterwear.pk>';

/**
 * Send a transactional email.
 * @param {Object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.html
 * @param {string} [options.text]
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mail = await getTransporter();
    const info = await mail.sendMail({
      from: FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });

    if (process.env.NODE_ENV !== 'production') {
      const nodemailer = await import('nodemailer');
      const previewUrl = nodemailer.default.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[EmailService] Preview URL: ${previewUrl}`);
      }
    }

    return info;
  } catch (err) {
    console.error(`[EmailService] Failed to send email to ${to}: ${err.message}`);
    // Don't throw — email failure should not break the request flow
    return null;
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const subject = 'Reset Your WinterWear Password';
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Georgia, serif; background: #F8F7F4; margin: 0; padding: 40px 20px;">
      <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 4px; overflow: hidden;">
        <div style="background: #17191C; padding: 32px 40px;">
          <h1 style="color: #F8F7F4; margin: 0; font-size: 24px; letter-spacing: 2px;">WINTERWEAR</h1>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #17191C; font-size: 20px; margin: 0 0 16px;">Password Reset Request</h2>
          <p style="color: #555; line-height: 1.6;">Hello ${name || 'there'},</p>
          <p style="color: #555; line-height: 1.6;">We received a request to reset the password for your WinterWear account. Click the button below to proceed. This link expires in 1 hour.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background: #762B3D; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 2px; font-size: 14px; letter-spacing: 1px; display: inline-block;">RESET PASSWORD</a>
          </div>
          <p style="color: #999; font-size: 13px; line-height: 1.6;">If you did not request a password reset, please ignore this email or contact support if you believe your account has been compromised.</p>
          <p style="color: #999; font-size: 12px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee;">This link will expire in 1 hour for security reasons.</p>
        </div>
        <div style="background: #17191C; padding: 20px 40px; text-align: center;">
          <p style="color: #A9ADB3; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} WinterWear. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  return sendEmail({ to, subject, html });
};

/**
 * Send order confirmation email
 */
export const sendOrderConfirmationEmail = async ({ to, name, orderNumber, totalAmount, items }) => {
  const subject = `Order Confirmed — ${orderNumber}`;
  const itemRows = (items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px 0; color: #333; border-bottom: 1px solid #eee;">${item.name} × ${item.quantity}</td>
        <td style="padding: 8px 0; color: #333; border-bottom: 1px solid #eee; text-align: right;">PKR ${(item.totalItemPrice || 0).toLocaleString()}</td>
      </tr>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Georgia, serif; background: #F8F7F4; margin: 0; padding: 40px 20px;">
      <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 4px; overflow: hidden;">
        <div style="background: #17191C; padding: 32px 40px;">
          <h1 style="color: #F8F7F4; margin: 0; font-size: 24px; letter-spacing: 2px;">WINTERWEAR</h1>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #17191C; font-size: 20px; margin: 0 0 8px;">Order Confirmed</h2>
          <p style="color: #762B3D; font-weight: bold; margin: 0 0 24px;">${orderNumber}</p>
          <p style="color: #555; line-height: 1.6;">Hello ${name || 'there'}, thank you for your order. We're preparing your pieces for dispatch.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
            ${itemRows}
            <tr>
              <td style="padding: 12px 0; font-weight: bold; color: #17191C;">Total</td>
              <td style="padding: 12px 0; font-weight: bold; color: #17191C; text-align: right;">PKR ${(totalAmount || 0).toLocaleString()}</td>
            </tr>
          </table>
          <p style="color: #555; font-size: 13px;">You'll receive a shipping notification once your order is dispatched. Track your order at any time from your account.</p>
        </div>
        <div style="background: #17191C; padding: 20px 40px; text-align: center;">
          <p style="color: #A9ADB3; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} WinterWear. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  return sendEmail({ to, subject, html });
};

/**
 * Send payment confirmed email
 */
export const sendPaymentConfirmedEmail = async ({ to, name, orderNumber, amount, transactionId }) => {
  const subject = `Payment Confirmed — Order ${orderNumber}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Georgia, serif; background: #F8F7F4; margin: 0; padding: 40px 20px;">
      <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 4px; overflow: hidden;">
        <div style="background: #17191C; padding: 32px 40px;">
          <h1 style="color: #F8F7F4; margin: 0; font-size: 24px; letter-spacing: 2px;">WINTERWEAR</h1>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #17191C; font-size: 20px; margin: 0 0 8px;">Payment Received</h2>
          <p style="color: #2E7D32; font-weight: bold; margin: 0 0 16px;">Verified Transaction: ${transactionId || 'Online Payment'}</p>
          <p style="color: #555; line-height: 1.6;">Hello ${name || 'there'}, your payment of <strong>PKR ${(amount || 0).toLocaleString()}</strong> for Order <strong>${orderNumber}</strong> has been successfully received.</p>
          <p style="color: #555; line-height: 1.6;">Your order is now being processed by our atelier logistics team.</p>
        </div>
        <div style="background: #17191C; padding: 20px 40px; text-align: center;">
          <p style="color: #A9ADB3; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} WinterWear. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  return sendEmail({ to, subject, html });
};

/**
 * Send payment failed email
 */
export const sendPaymentFailedEmail = async ({ to, name, orderNumber, reason }) => {
  const subject = `Payment Notice — Order ${orderNumber}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Georgia, serif; background: #F8F7F4; margin: 0; padding: 40px 20px;">
      <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 4px; overflow: hidden;">
        <div style="background: #17191C; padding: 32px 40px;">
          <h1 style="color: #F8F7F4; margin: 0; font-size: 24px; letter-spacing: 2px;">WINTERWEAR</h1>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #D32F2F; font-size: 20px; margin: 0 0 8px;">Payment Unsuccessful</h2>
          <p style="color: #555; line-height: 1.6;">Hello ${name || 'there'}, we were unable to complete the payment for Order <strong>${orderNumber}</strong>.</p>
          <p style="color: #777; font-size: 14px;">Reason: ${reason || 'Transaction could not be authorized.'}</p>
          <p style="color: #555; line-height: 1.6;">Your items are temporarily reserved. Please visit your account to retry payment or select Cash on Delivery.</p>
        </div>
        <div style="background: #17191C; padding: 20px 40px; text-align: center;">
          <p style="color: #A9ADB3; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} WinterWear. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  return sendEmail({ to, subject, html });
};

/**
 * Send order status update email
 */
export const sendOrderStatusUpdateEmail = async ({ to, name, orderNumber, newStatus, comment }) => {
  const subject = `Order Update: ${orderNumber} is now ${newStatus.replace(/_/g, ' ').toUpperCase()}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Georgia, serif; background: #F8F7F4; margin: 0; padding: 40px 20px;">
      <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 4px; overflow: hidden;">
        <div style="background: #17191C; padding: 32px 40px;">
          <h1 style="color: #F8F7F4; margin: 0; font-size: 24px; letter-spacing: 2px;">WINTERWEAR</h1>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #17191C; font-size: 20px; margin: 0 0 8px;">Status Update</h2>
          <p style="color: #555; line-height: 1.6;">Hello ${name || 'there'},</p>
          <p style="color: #555; line-height: 1.6;">Your order <strong>${orderNumber}</strong> has been updated to: <strong style="color: #762B3D; text-transform: uppercase;">${newStatus.replace(/_/g, ' ')}</strong>.</p>
          ${comment ? `<p style="color: #666; font-style: italic; font-size: 14px;">"${comment}"</p>` : ''}
        </div>
        <div style="background: #17191C; padding: 20px 40px; text-align: center;">
          <p style="color: #A9ADB3; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} WinterWear. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  return sendEmail({ to, subject, html });
};
