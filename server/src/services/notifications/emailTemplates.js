import { ENV } from '../../config/env.js';

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const abs = (path) => `${ENV.CLIENT_URL.replace(/\/$/, '')}${path || ''}`;

/** Responsive, table-based branded email (Charcoal / Cream / Burgundy). All dynamic text is escaped. */
export const renderNotificationEmail = (n, { name = '', unsubscribeUrl = '' } = {}) => {
  const cta = n.actionUrl ? abs(n.actionUrl) : '';
  const code = n.data?.couponCode ? esc(n.data.couponCode) : '';
  const subject = n.title;
  const html = `<!doctype html><html><body style="margin:0;background:#EDE7DC;font-family:Helvetica,Arial,sans-serif;color:#17191C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDE7DC;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#F8F7F4;border-radius:4px;overflow:hidden">
<tr><td style="background:#17191C;padding:22px 28px;text-align:center;color:#F8F7F4;letter-spacing:.35em;font-size:13px;text-transform:uppercase">WinterWear</td></tr>
${n.imageUrl ? `<tr><td><img src="${esc(n.imageUrl)}" alt="" width="560" style="display:block;width:100%;height:auto"></td></tr>` : ''}
<tr><td style="padding:28px">
${name ? `<p style="margin:0 0 8px;color:#7A7E85;font-size:13px">Hello ${esc(name)},</p>` : ''}
<h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#17191C">${esc(n.title)}</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#363B42">${esc(n.message)}</p>
${code ? `<p style="margin:0 0 20px"><span style="display:inline-block;border:1px dashed #762B3D;padding:8px 14px;font-weight:700;letter-spacing:.15em;color:#762B3D">${code}</span></p>` : ''}
${cta ? `<a href="${esc(cta)}" style="display:inline-block;background:#762B3D;color:#F8F7F4;text-decoration:none;padding:12px 24px;font-size:12px;letter-spacing:.2em;text-transform:uppercase">View in WinterWear</a>` : ''}
</td></tr>
<tr><td style="padding:16px 28px 24px;border-top:1px solid #EDE7DC;font-size:11px;color:#7A7E85;line-height:1.5">
You are receiving this because of activity on your WinterWear account.
${unsubscribeUrl ? `<br><a href="${esc(unsubscribeUrl)}" style="color:#7A7E85">Unsubscribe from promotional emails</a>` : ''}
</td></tr></table></td></tr></table></body></html>`;
  const text = `${n.title}\n\n${n.message}${code ? `\n\nCode: ${n.data.couponCode}` : ''}${cta ? `\n\n${cta}` : ''}${
    unsubscribeUrl ? `\n\nUnsubscribe from promotional emails: ${unsubscribeUrl}` : ''
  }`;
  return { subject, html, text };
};
