/**
 * Email provider abstraction. The rest of the system calls getEmailProvider()?.send(...) and never
 * touches SMTP credentials. Swap in an API provider (SES, SendGrid, Resend…) by adding another
 * implementation here and selecting it with EMAIL_PROVIDER.
 */
let override = null;
let smtpTransport = null;

/** Test hook / custom provider injection. Pass null to restore the configured provider. */
export const setEmailProvider = (provider) => {
  override = provider;
};

export const smtpConfig = () => ({
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || '',
  // The repo historically used both names; accept either.
  pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '',
  from: process.env.EMAIL_FROM || process.env.SMTP_FROM || 'WinterWear <noreply@winterwear.pk>',
});

const placeholderPass = (v) => !v || /^your_|^changeme/i.test(v);

export const isSmtpConfigured = () => {
  const c = smtpConfig();
  return !!(c.host && c.user && c.pass && !placeholderPass(c.pass));
};

const buildSmtpProvider = () => ({
  name: 'smtp',
  async send({ to, subject, html, text, headers = {} }) {
    const c = smtpConfig();
    if (!smtpTransport) {
      const nodemailer = (await import('nodemailer')).default;
      smtpTransport = nodemailer.createTransport({
        host: c.host,
        port: c.port,
        secure: c.secure,
        auth: { user: c.user, pass: c.pass },
      });
    }
    const info = await smtpTransport.sendMail({ from: c.from, to, subject, html, text, headers });
    return { messageId: info.messageId || '' };
  },
});

/** Returns a provider, or null when email is not configured (in-app notifications still work). */
export const getEmailProvider = () => {
  if (override) return override;
  if (isSmtpConfigured()) return buildSmtpProvider();
  return null;
};

export const emailStatus = () => ({
  configured: !!getEmailProvider(),
  provider: override ? override.name : isSmtpConfigured() ? 'smtp' : null,
});
