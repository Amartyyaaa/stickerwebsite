import { z } from 'zod';
import { isPincode } from '@/lib/delivery';

/** States and union territories, for the address form. */
export const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const;

export type IndianState = (typeof INDIAN_STATES)[number];

/** Keep the 10-digit number from inputs like "+91 98765 43210", "098765 43210" or "9876543210". */
export function normalizePhone(input: string): string {
  let d = input.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
}

export const isIndianMobile = (digits: string) => /^[6-9]\d{9}$/.test(digits);

export const formatPhone = (digits: string) => (digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : digits);

/** A WhatsApp chat link for an Indian number written any common way ("98765 43210", "+91 98765 43210"), or null. */
export function whatsappLink(number: string, text?: string): string | null {
  const digits = normalizePhone(number);
  if (!isIndianMobile(digits)) return null;
  return `https://wa.me/91${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

/** The store's WhatsApp numbers that are set, first one first. */
export const whatsappNumbers = (contact: { whatsapp: string; whatsappAlt?: string }) => [contact.whatsapp, contact.whatsappAlt ?? ''].filter((n) => whatsappLink(n));

const Phone = z
  .string()
  .max(20)
  .transform(normalizePhone)
  .refine(isIndianMobile, 'Enter a 10-digit Indian mobile number.');

export const ContactInput = z.object({
  email: z.string().trim().toLowerCase().email('Enter an email like name@example.com.').max(200),
  phone: Phone,
});

export const AddressInput = z.object({
  name: z.string().trim().min(2, 'Enter the full name.').max(80),
  phone: Phone,
  line1: z.string().trim().min(3, 'Enter the house or flat number and building.').max(120),
  line2: z.string().trim().max(120).default(''),
  landmark: z.string().trim().max(80).default(''),
  city: z.string().trim().min(2, 'Enter the town or city.').max(60),
  state: z.enum(INDIAN_STATES, { message: 'Choose a state.' }),
  pincode: z.string().trim().refine(isPincode, 'Enter a 6-digit pincode.'),
});

export type ContactInput = z.infer<typeof ContactInput>;
export type AddressInput = z.infer<typeof AddressInput>;

/** zod issues as { field: message }, for showing errors next to form fields. */
export function fieldErrors(error: z.ZodError, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = prefix + issue.path.join('.');
    out[key] ??= issue.message;
  }
  return out;
}
