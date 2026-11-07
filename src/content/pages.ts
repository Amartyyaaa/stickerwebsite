import { formatINR } from '@/lib/money';
import type { StoreSettings } from '@/lib/settings';

/**
 * Info and policy pages. Razorpay asks for About, Contact, Shipping,
 * Returns/Refunds, Privacy and Terms pages before it activates live payments.
 *
 * Anything in [square brackets] is a placeholder for your own details. It is
 * highlighted on the page until you replace it. Have a lawyer review the
 * policies before you launch.
 */
export interface PageBlock {
  heading?: string;
  paragraphs?: string[];
  list?: string[];
  qa?: Array<{ q: string; a: string }>;
}

export interface InfoPage {
  title: string;
  description: string;
  blocks: PageBlock[];
}

export const PAGE_SLUGS = ['about', 'contact', 'faq', 'shipping', 'returns', 'privacy', 'terms'] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];

export function getInfoPage(slug: string, s: StoreSettings): InfoPage | null {
  const free = formatINR(s.shipping.freeAbove);
  const fee = formatINR(s.shipping.fee);
  const codFee = formatINR(s.cod.fee);
  const codMin = formatINR(s.cod.min);
  const codMax = formatINR(s.cod.max);
  const days = (d: [number, number]) => `${d[0]} to ${d[1]} working days`;
  const email = s.contact.email || '[your support email]';
  const phone = s.contact.phone || '[your support phone number]';

  const pages: Record<PageSlug, InfoPage> = {
    about: {
      title: 'About PrintYourVibe',
      description: 'Who we are and how we print.',
      blocks: [
        {
          paragraphs: [
            'PrintYourVibe makes stickers, posters and polaroids for every fandom and mood: anime, F1, cricket, K-pop, desi vibes, quotes and more. Everything is printed to order.',
            '[Tell your story here: who you are, where you are based, why you started PrintYourVibe and what makes your prints special.]',
          ],
        },
        {
          heading: 'How we print',
          list: [
            'Stickers are printed on waterproof vinyl and cut to shape.',
            'Posters are printed on thick 300 GSM paper and shipped flat.',
            'Every order is checked before it’s packed.',
          ],
        },
        { heading: 'Business details', paragraphs: ['[Registered business name] · [Registered address] · GSTIN: [your GSTIN, if registered]'] },
      ],
    },
    contact: {
      title: 'Contact us',
      description: 'Questions about an order or a custom print? Get in touch.',
      blocks: [
        {
          paragraphs: [
            `Email: ${email}`,
            `Phone and WhatsApp: ${s.contact.whatsapp || phone}`,
            `Hours: ${s.contact.hours}`,
            `Address: ${s.contact.address || '[your business address]'}`,
          ],
        },
        {
          heading: 'Order questions',
          paragraphs: ['Please include your order number so we can help faster. We reply within one working day.'],
        },
        {
          heading: 'Grievance officer',
          paragraphs: ['As required by the Consumer Protection (E-Commerce) Rules, 2020: [name of grievance officer], [designation], [email], [phone]. Complaints are acknowledged within 48 hours and resolved within one month.'],
        },
      ],
    },
    faq: {
      title: 'Help & FAQ',
      description: 'Answers to common questions about orders, delivery and printing.',
      blocks: [
        {
          qa: [
            { q: 'How long does delivery take?', a: `Orders are printed and dispatched within 1 to 2 working days. Delivery usually takes ${days(s.delivery.metroDays)} to metro cities and ${days(s.delivery.standardDays)} elsewhere in India.` },
            { q: 'Do you offer Cash on Delivery?', a: `Yes, on orders between ${codMin} and ${codMax}. A ${codFee} COD fee applies. Paying online is faster and gets you an extra ${s.prepaidDiscount.percent}% off.` },
            { q: 'How much is shipping?', a: `Shipping is free on orders above ${free}. Below that it’s a flat ${fee}.` },
            { q: 'How does the sticker pack offer work?', a: `Add any eligible stickers to your cart and the pack price is applied automatically: ${s.packs.tiers.map((t) => `${t.qty} for ${formatINR(t.price)}`).join(', ')}.` },
            { q: 'Are the stickers waterproof?', a: 'Yes. Our vinyl stickers handle water, sun and scratches, so they work on bottles and laptops.' },
            { q: 'Can I return a product?', a: 'Because everything is printed to order, we accept returns only for damaged, defective or wrong items. See our returns policy for details.' },
            { q: 'Can I order my own design?', a: 'Yes. The custom studio lets you upload your own image for stickers, posters and polaroids, and shows a preview before you order.' },
            { q: 'What files can I upload?', a: 'PNG, JPG or WebP images up to 25 MB. For die-cut stickers, a PNG with a transparent background works best because the cut follows its outline.' },
            { q: 'Will my photo print sharply?', a: 'The studio checks the resolution for the size you pick and warns you if the print might look blurry. As a guide, phone photos print well up to A3, and a 4 in sticker needs an image at least 1,000 pixels across.' },
            { q: 'Do you check custom designs before printing?', a: 'Yes. We look at every custom order before it’s printed and message you if something needs fixing, like a low-resolution image or text too close to the edge.' },
            { q: 'Can I return a custom order?', a: 'Custom prints are made just for you, so we can only replace them if they arrive damaged or misprinted.' },
            { q: 'Do you take bulk or corporate orders?', a: `Yes. Email ${email} with what you need and the quantity.` },
          ],
        },
      ],
    },
    shipping: {
      title: 'Shipping & delivery',
      description: 'Delivery times, charges and tracking.',
      blocks: [
        {
          heading: 'Delivery times',
          list: [
            'Printing and dispatch: 1 to 2 working days after your order is confirmed.',
            `Metro cities: ${days(s.delivery.metroDays)} after dispatch.`,
            `Rest of India: ${days(s.delivery.standardDays)}.`,
            `North-East, Jammu & Kashmir, Ladakh, Andaman & Nicobar and Lakshadweep: ${days(s.delivery.remoteDays)}.`,
          ],
        },
        { heading: 'Charges', paragraphs: [`Shipping is free on orders above ${free}. Orders below that have a flat ${fee} shipping charge. Cash on Delivery orders have an extra ${codFee} fee.`] },
        { heading: 'Tracking', paragraphs: ['We email and message you a tracking link as soon as your order ships.'] },
        { heading: 'Damaged parcels', paragraphs: ['If your parcel arrives damaged, please record an unboxing video and contact us within 48 hours. We’ll reprint and resend it at no cost.'] },
        { heading: 'Shipping partners', paragraphs: ['[Name your courier partners, for example via Shiprocket.] We currently ship within India only.'] },
      ],
    },
    returns: {
      title: 'Returns & refunds',
      description: 'What we accept, and how refunds work.',
      blocks: [
        {
          paragraphs: ['Every product is printed specially for you, so we can’t accept returns for a change of mind. We will always make it right if something is wrong with your order.'],
        },
        {
          heading: 'We replace or refund',
          list: ['Items damaged in transit', 'Printing defects', 'Wrong item, size or design sent'],
        },
        {
          heading: 'How to raise a request',
          list: [
            `Email ${email} within 48 hours of delivery with your order number.`,
            'Attach photos of the item and, if possible, an unboxing video.',
            'We reply within one working day with a replacement or refund.',
          ],
        },
        {
          heading: 'Refunds',
          paragraphs: [
            'Online payments are refunded to the original payment method within 5 to 7 working days after approval.',
            'Cash on Delivery orders are refunded by UPI or bank transfer to an account you share with us.',
          ],
        },
        { heading: 'Cancellations', paragraphs: ['You can cancel an order free of charge before it’s printed (usually within 12 hours of ordering). Contact us as soon as possible.'] },
      ],
    },
    privacy: {
      title: 'Privacy policy',
      description: 'What we collect and how we use it.',
      blocks: [
        { paragraphs: ['[Registered business name] (“PrintYourVibe”, “we”) runs this website. This policy explains how we handle your personal information. Last updated: [date].'] },
        {
          heading: 'What we collect',
          list: [
            'Your name, phone number, email address and delivery address when you order.',
            'Your order history and any images you upload for custom prints.',
            'Basic technical data such as your browser and device, used to keep the site working and secure.',
          ],
        },
        { heading: 'Payments', paragraphs: ['Online payments are processed by Razorpay. We never see or store your card, UPI or bank details.'] },
        {
          heading: 'Images you upload',
          paragraphs: [
            'Images you upload in the custom studio are used only to show you a preview and to print your order. Only our print team can see them.',
            'Uploads that aren’t ordered are deleted after [7] days. Images in orders are deleted [30] days after delivery, unless you ask us to keep them for a reorder.',
          ],
        },
        {
          heading: 'How we use it',
          list: ['To print, ship and support your orders.', 'To send order updates by email, SMS or WhatsApp.', 'To send offers, only if you sign up. You can unsubscribe at any time.'],
        },
        { heading: 'Who we share it with', paragraphs: ['Only with the partners needed to fulfil your order: our payment gateway, courier partners and email provider. We never sell your data.'] },
        { heading: 'Cookies and local storage', paragraphs: ['Your cart, wishlist, recently viewed items and unfinished custom designs are saved in your browser so they’re there when you come back.'] },
        { heading: 'Your choices', paragraphs: [`You can ask us to correct or delete your data at any time by emailing ${email}.`] },
        { heading: 'Grievance officer', paragraphs: ['[Name], [email], [phone].'] },
      ],
    },
    terms: {
      title: 'Terms & conditions',
      description: 'The terms for using this website and placing orders.',
      blocks: [
        { paragraphs: ['By using this website and placing an order, you agree to these terms. Last updated: [date].'] },
        {
          heading: 'Products and prices',
          list: [
            'Colours can look slightly different on screen and in print.',
            'Prices are in Indian rupees and include all taxes.',
            'We may change prices or stop selling a design at any time. Your order is charged at the price shown when you placed it.',
          ],
        },
        { heading: 'Orders', paragraphs: ['An order is confirmed when we send you a confirmation. We may cancel and fully refund an order if a product is unavailable or if we suspect fraud.'] },
        { heading: 'Cash on Delivery', paragraphs: [`COD is available for orders between ${codMin} and ${codMax}, with a ${codFee} fee. We may call or message you to confirm a COD order before we print it.`] },
        {
          heading: 'Designs and custom uploads',
          paragraphs: [
            'Designs on this website belong to PrintYourVibe or its artists and may not be copied.',
            'When you upload an image for a custom print, you confirm you have the right to use it. We may refuse uploads that infringe someone else’s rights or are offensive.',
          ],
        },
        { heading: 'Liability', paragraphs: ['Our liability for any order is limited to the amount you paid for it.'] },
        { heading: 'Governing law', paragraphs: ['These terms are governed by the laws of India. Courts in [your city] have jurisdiction.'] },
      ],
    },
  };

  return (pages as Record<string, InfoPage>)[slug] ?? null;
}
