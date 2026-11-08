import { describe, expect, it } from 'vitest';
import { printRegion } from '@/lib/custom/print';
import { safeHttpUrl, trackingUrlFor } from './couriers';
import { refundable } from './refunds';

describe('courier tracking links', () => {
  it('fills in links for couriers we know', () => {
    expect(trackingUrlFor('Delhivery', ' 1234567890 ')).toBe('https://www.delhivery.com/track/package/1234567890');
    expect(trackingUrlFor('Shiprocket', 'SR-99')).toBe('https://shiprocket.co/tracking/SR-99');
  });
  it('leaves others for the admin to paste', () => {
    expect(trackingUrlFor('Blue Dart', '12345678')).toBeNull();
    expect(trackingUrlFor('Delhivery', 'bad number!')).toBeNull();
  });
  it('only keeps http links', () => {
    expect(safeHttpUrl('https://track.example.com/a?b=1')).toBe('https://track.example.com/a?b=1');
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('not a link')).toBeNull();
  });
});

describe('print files', () => {
  it('keeps the whole image for die-cut stickers', () => {
    expect(printRegion({ w: 1400, h: 1000 }, null, undefined)).toEqual({ width: 1400, height: 1000, extract: null, place: null });
  });
  it('cuts the crop out of the original at full resolution', () => {
    const r = printRegion({ w: 3000, h: 2000 }, 1, { x: 0.5, y: 0.5, zoom: 1 });
    expect(r).toEqual({ width: 2000, height: 2000, extract: { left: 500, top: 0, width: 2000, height: 2000 }, place: null });
    const zoomed = printRegion({ w: 3000, h: 2000 }, 1, { x: 0, y: 0, zoom: 2 });
    expect(zoomed.extract).toEqual({ left: 0, top: 0, width: 1000, height: 1000 });
  });
  it('places a zoomed-out sticker on a white canvas', () => {
    const r = printRegion({ w: 1000, h: 1000 }, 1, { x: 0.5, y: 0.5, zoom: 0.5 }, 0.5);
    expect(r).toEqual({ width: 2000, height: 2000, extract: { left: 0, top: 0, width: 1000, height: 1000 }, place: { left: 500, top: 500 } });
  });
  it('handles a crop that is zoomed out on one side only', () => {
    // A wide logo in a square sticker, zoomed out a little: the sides are cut, the top and bottom get white space.
    const r = printRegion({ w: 1500, h: 1000 }, 1, { x: 0.5, y: 0.5, zoom: 0.8 }, 0.5);
    expect(r.width).toBe(1250);
    expect(r.height).toBe(1250);
    expect(r.extract).toEqual({ left: 125, top: 0, width: 1250, height: 1000 });
    expect(r.place).toEqual({ left: 0, top: 125 });
  });
});

describe('refunds', () => {
  it('limits refunds to what was paid and not yet refunded', () => {
    expect(refundable({ paymentStatus: 'paid', total: 50000, refundedAmount: 0 })).toBe(50000);
    expect(refundable({ paymentStatus: 'paid', total: 50000, refundedAmount: 20000 })).toBe(30000);
    expect(refundable({ paymentStatus: 'refunded', total: 50000, refundedAmount: 50000 })).toBe(0);
    expect(refundable({ paymentStatus: 'cod_due', total: 50000, refundedAmount: 0 })).toBe(0);
    expect(refundable({ paymentStatus: 'unpaid', total: 50000, refundedAmount: 0 })).toBe(0);
  });
});
