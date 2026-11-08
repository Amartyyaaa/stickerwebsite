import { designSummary } from '@/lib/custom/studios';
import { formatINR } from '@/lib/money';
import type { OrderView } from '@/lib/orders/types';
import type { Mail } from './send';

/**
 * Plain, light emails that read well in Gmail on a phone. Every value that
 * came from a shopper is escaped.
 */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f6;font-family:Arial,Helvetica,sans-serif;color:#1b1b24">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden">
<tr><td style="background:#0b0b12;padding:18px 24px;font-size:20px;font-weight:bold;color:#ffffff;letter-spacing:.5px"><span style="color:#c6ff3d">//</span>PRINTYOURVIBE</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3">${esc(title)}</h1>
${body}
</td></tr></table>
<p style="font-size:12px;color:#8a8a99;margin:16px 0 0">PrintYourVibe · Printed to order in India</p>
</td></tr></table></body></html>`;
}

const p = (html: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55">${html}</p>`;
const button = (href: string, label: string) =>
  `<p style="margin:20px 0"><a href="${esc(href)}" style="display:inline-block;background:#c6ff3d;color:#0b0b12;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:4px">${esc(label)}</a></p>`;

export function otpEmail(otp: string): Omit<Mail, 'to'> {
  return {
    subject: `Your PrintYourVibe sign-in code: ${otp}`,
    html: layout(
      'Your sign-in code',
      `${p('Enter this code to sign in to PrintYourVibe. It works for 5 minutes.')}
<p style="margin:8px 0 18px;font-size:34px;font-weight:bold;letter-spacing:8px">${esc(otp)}</p>
${p('If you didn’t ask for this code, you can ignore this email.')}`,
    ),
    text: `Your PrintYourVibe sign-in code is ${otp}. It works for 5 minutes.\n\nIf you didn't ask for this code, you can ignore this email.`,
  };
}

function itemLines(order: OrderView): { html: string; text: string } {
  const rows = order.items.map((i) => {
    const extra = i.custom ? designSummary(i.custom, i.options) : '';
    const detail = [i.optionLabels.join(' · '), extra].filter(Boolean).join(' · ');
    return {
      html: `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px"><b>${esc(i.name)}</b> × ${i.qty}<br><span style="color:#6b6b7b">${esc(i.typeName)}${detail ? ` · ${esc(detail)}` : ''}</span></td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;text-align:right;white-space:nowrap">${formatINR(i.total)}</td></tr>`,
      text: `- ${i.name} x ${i.qty} (${i.typeName}${detail ? `, ${detail}` : ''}): ${formatINR(i.total)}`,
    };
  });
  const totals: Array<[string, string]> = [['Subtotal', formatINR(order.subtotal)]];
  for (const d of order.discounts) totals.push([d.label, `−${formatINR(d.amount)}`]);
  totals.push(['Shipping', order.shipping ? formatINR(order.shipping) : 'Free']);
  if (order.codFee) totals.push(['Cash on Delivery fee', formatINR(order.codFee)]);
  if (order.prepaidDiscount) totals.push(['Online payment discount', `−${formatINR(order.prepaidDiscount)}`]);
  totals.push(['Total', formatINR(order.total)]);
  const totalsHtml = totals
    .map(([k, v], i) => `<tr><td style="padding:4px 0;font-size:14px${i === totals.length - 1 ? ';font-weight:bold' : ''}">${esc(k)}</td><td style="padding:4px 0;font-size:14px;text-align:right${i === totals.length - 1 ? ';font-weight:bold' : ''}">${v}</td></tr>`)
    .join('');
  return {
    html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 12px">${rows.map((r) => r.html).join('')}</table><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${totalsHtml}</table>`,
    text: `${rows.map((r) => r.text).join('\n')}\n\n${totals.map(([k, v]) => `${k}: ${v}`).join('\n')}`,
  };
}

function addressText(order: OrderView): string {
  const a = order.address;
  return [a.name, a.line1, a.line2, a.landmark && `Near ${a.landmark}`, `${a.city}, ${a.state} ${a.pincode}`, `Phone: ${a.phone}`].filter(Boolean).join('\n');
}

export function orderConfirmationEmail(order: OrderView, link: string): Omit<Mail, 'to'> {
  const cod = order.paymentMethod === 'cod';
  const lines = itemLines(order);
  const note = cod
    ? `Please keep ${formatINR(order.total)} ready to pay in cash when your parcel arrives. We’ll message you to confirm the order before we print it.`
    : 'We’ve received your payment. Your order is going to print.';
  const title = cod ? `Order ${order.number} is placed` : `Order ${order.number} is confirmed`;
  return {
    subject: `${title} · PrintYourVibe`,
    html: layout(
      title,
      `${p(`Hi ${esc(order.name.split(' ')[0] || order.name)}, thanks for your order!`)}
${p(esc(note))}
${lines.html}
<h2 style="font-size:16px;margin:22px 0 8px">Delivering to</h2>
<p style="margin:0;font-size:14px;line-height:1.55;white-space:pre-line">${esc(addressText(order))}</p>
${button(link, 'View your order')}
${p('<span style="color:#6b6b7b;font-size:13px">Keep this email: the button above opens your order without signing in.</span>')}`,
    ),
    text: `${title}\n\nHi ${order.name}, thanks for your order!\n${note}\n\n${lines.text}\n\nDelivering to:\n${addressText(order)}\n\nView your order: ${link}`,
  };
}

export function ownerOrderEmail(order: OrderView, link: string): Omit<Mail, 'to'> {
  const lines = itemLines(order);
  const custom = order.items.filter((i) => i.custom).length;
  const method = order.paymentMethod === 'cod' ? 'Cash on Delivery (confirm before printing)' : 'Paid online';
  return {
    subject: `New order ${order.number} · ${formatINR(order.total)} · ${order.paymentMethod === 'cod' ? 'COD' : 'Paid'}`,
    html: layout(
      `New order ${order.number}`,
      `${p(`<b>${esc(method)}</b> · ${order.itemCount} item${order.itemCount === 1 ? '' : 's'}${custom ? ` · <b>${custom} custom design${custom === 1 ? '' : 's'}</b>` : ''}`)}
${lines.html}
<h2 style="font-size:16px;margin:22px 0 8px">Customer</h2>
<p style="margin:0;font-size:14px;line-height:1.55;white-space:pre-line">${esc(`${order.name}\n${order.email}\n${order.phone}\n\n${addressText(order)}`)}</p>
${button(link, 'Open the order')}`,
    ),
    text: `New order ${order.number} (${method})\n\n${lines.text}\n\nCustomer:\n${order.name}\n${order.email}\n${order.phone}\n\n${addressText(order)}\n\n${link}`,
  };
}

export type StatusEmail = 'shipped' | 'delivered' | 'cancelled' | 'refunded';

/** Emails sent when the store moves an order along. */
export function orderStatusEmail(kind: StatusEmail, order: OrderView, link: string, extra: { reason?: string; amount?: number } = {}): Omit<Mail, 'to'> {
  const first = esc(order.name.split(' ')[0] || order.name);
  const s = order.shipment;
  if (kind === 'shipped') {
    const track = s ? `${esc(s.courier)}, tracking number <b>${esc(s.trackingNumber)}</b>` : 'our courier partner';
    return {
      subject: `Order ${order.number} has shipped · PrintYourVibe`,
      html: layout(
        'Your order is on its way',
        `${p(`Hi ${first}, good news: order ${order.number} has left our studio with ${track}.`)}
${order.paymentMethod === 'cod' && order.paymentStatus !== 'paid' ? p(`Please keep ${formatINR(order.total)} ready in cash for the delivery partner.`) : ''}
${s?.trackingUrl ? button(s.trackingUrl, 'Track your parcel') : ''}
${button(link, 'View your order')}`,
      ),
      text: `Hi ${order.name}, order ${order.number} has shipped${s ? ` with ${s.courier}, tracking number ${s.trackingNumber}` : ''}.${s?.trackingUrl ? `\nTrack it: ${s.trackingUrl}` : ''}\nYour order: ${link}`,
    };
  }
  if (kind === 'delivered') {
    // Catalog items can be reviewed from the order page; custom-printed ones can't.
    const canReview = order.items.some((i) => i.productId > 0);
    const target = canReview ? `${link}#reviews` : link;
    return {
      subject: `Order ${order.number} was delivered · PrintYourVibe`,
      html: layout(
        'Delivered!',
        `${p(`Hi ${first}, your order ${order.number} has been delivered. We hope you love it.`)}
${p('If anything isn’t right, reply to this email within 7 days with a photo and we’ll sort it out.')}
${canReview ? p('Got a minute? A quick review with a photo helps other shoppers, and helps us print better.') : ''}
${button(target, canReview ? 'Write a review' : 'View your order')}`,
      ),
      text: `Hi ${order.name}, order ${order.number} has been delivered. We hope you love it!${canReview ? ` Write a review: ${target}` : ` Your order: ${target}`}`,
    };
  }
  if (kind === 'cancelled') {
    const why = extra.reason ? ` Reason: ${extra.reason}.` : '';
    const paid = order.paymentStatus === 'paid';
    return {
      subject: `Order ${order.number} was cancelled · PrintYourVibe`,
      html: layout(
        'Your order was cancelled',
        `${p(`Hi ${first}, order ${order.number} has been cancelled.${esc(why)}`)}
${paid ? p('Your payment will be refunded to the original payment method. We’ll email you when the refund is on its way.') : ''}
${p('Questions? Just reply to this email.')}`,
      ),
      text: `Hi ${order.name}, order ${order.number} has been cancelled.${why}${paid ? ' Your payment will be refunded to the original payment method.' : ''}`,
    };
  }
  const amount = formatINR(extra.amount ?? order.total);
  return {
    subject: `Refund of ${amount} for order ${order.number} · PrintYourVibe`,
    html: layout(
      'Your refund is on its way',
      `${p(`Hi ${first}, we’ve refunded ${amount} for order ${order.number}.`)}
${p('Refunds usually reach your bank or UPI account within 5 to 7 working days.')}
${button(link, 'View your order')}`,
    ),
    text: `Hi ${order.name}, we've refunded ${amount} for order ${order.number}. It usually takes 5 to 7 working days to reach your account. ${link}`,
  };
}
