import type { ArtSpec } from '@/lib/art/types';
import type { CustomDesign } from '@/lib/custom/types';
import type { AddressSnapshot, OrderStatus, PaymentMethod, PaymentStatus } from '@/lib/db/schema';

export type { AddressSnapshot, OrderStatus, PaymentMethod, PaymentStatus };

export interface OrderItemView {
  /** The order item's own id (reviews are per item). */
  id: number;
  productId: number;
  typeId: string;
  slug: string;
  name: string;
  typeName: string;
  options: Record<string, string>;
  optionLabels: string[];
  art: ArtSpec | null;
  image: string | null;
  custom: CustomDesign | null;
  unit: number;
  qty: number;
  total: number;
}

export interface OrderEventView {
  status: OrderStatus;
  note: string;
  at: number;
}

/** Everything the order page, emails and account pages show about an order. Amounts in paise, times in seconds. */
export interface OrderView {
  id: number;
  number: string;
  accessKey: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  email: string;
  phone: string;
  name: string;
  address: AddressSnapshot;
  items: OrderItemView[];
  itemCount: number;
  subtotal: number;
  discounts: Array<{ id: string; label: string; amount: number }>;
  discountTotal: number;
  shipping: number;
  codFee: number;
  prepaidDiscount: number;
  total: number;
  events: OrderEventView[];
  createdAt: number;
  paidAt: number | null;
  /** Shipping details, once the order ships. */
  shipment: Shipment | null;
  couponCode: string | null;
}

export interface Shipment {
  courier: string;
  trackingNumber: string;
  trackingUrl: string | null;
}
