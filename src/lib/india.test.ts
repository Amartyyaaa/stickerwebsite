import { describe, expect, it } from 'vitest';
import { whatsappLink, whatsappNumbers } from './india';

describe('WhatsApp links', () => {
  it('add India’s country code however the number is written', () => {
    for (const n of ['8002898685', '80028 98685', '+91 80028 98685', '08002898685']) expect(whatsappLink(n)).toBe('https://wa.me/918002898685');
    expect(whatsappLink('8002898685', 'Hi there!')).toBe('https://wa.me/918002898685?text=Hi%20there!');
  });
  it('skip numbers that aren’t Indian mobiles', () => {
    expect(whatsappLink('')).toBeNull();
    expect(whatsappLink('12345')).toBeNull();
    expect(whatsappNumbers({ whatsapp: '', whatsappAlt: '+91 98016 44598' })).toEqual(['+91 98016 44598']);
    expect(whatsappNumbers({ whatsapp: '+91 80028 98685', whatsappAlt: '+91 98016 44598' })).toHaveLength(2);
  });
});
