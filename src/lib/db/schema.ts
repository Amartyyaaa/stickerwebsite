import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { ArtKind, ArtSpec } from '@/lib/art/types';
import type { GroupId, OptionGroup, PriceProfile } from '@/lib/catalog/types';
import type { CustomDesign } from '@/lib/custom/types';

export const productTypes = sqliteTable('product_types', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  singular: text('singular').notNull(),
  groupId: text('group_id').$type<GroupId>().notNull(),
  description: text('description').notNull(),
  options: text('options', { mode: 'json' }).$type<OptionGroup[]>().notNull(),
  price: text('price', { mode: 'json' }).$type<PriceProfile>().notNull(),
  art: text('art').$type<ArtKind>().notNull(),
  highlights: text('highlights', { mode: 'json' }).$type<string[]>().notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const vibes = sqliteTable('vibes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  blurb: text('blurb').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const products = sqliteTable(
  'products',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    typeId: text('type_id')
      .notNull()
      .references(() => productTypes.id),
    /** Primary vibe, used for breadcrumbs and "more like this". */
    vibeId: text('vibe_id')
      .notNull()
      .references(() => vibes.id),
    description: text('description').notNull(),
    tags: text('tags').notNull().default(''),
    /** Optional per-product price changes on top of the type's price profile. */
    priceOverride: text('price_override', { mode: 'json' }).$type<Partial<PriceProfile> | null>(),
    /** Lowest possible price in paise, kept in sync for sorting and filtering. */
    priceFrom: integer('price_from').notNull(),
    art: text('art', { mode: 'json' }).$type<ArtSpec | null>(),
    images: text('images', { mode: 'json' }).$type<string[] | null>(),
    popularity: integer('popularity').notNull().default(0),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    /** Demo products created by the sample seed; removable in one go. */
    isSample: integer('is_sample', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('products_type_idx').on(t.typeId, t.isActive),
    index('products_vibe_idx').on(t.vibeId),
    index('products_popularity_idx').on(t.popularity),
    index('products_created_idx').on(t.createdAt),
    index('products_price_idx').on(t.priceFrom),
  ],
);

export const productVibes = sqliteTable(
  'product_vibes',
  {
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    vibeId: text('vibe_id')
      .notNull()
      .references(() => vibes.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.vibeId] }), index('product_vibes_vibe_idx').on(t.vibeId)],
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
});

export const subscribers = sqliteTable('subscribers', {
  email: text('email').primaryKey(),
  createdAt: integer('created_at').notNull(),
});

/**
 * Images shoppers upload in the custom studio. The original is kept untouched
 * for printing; a web preview and a thumbnail are made when the upload is
 * checked. Ids are random and unguessable.
 */
export const uploads = sqliteTable(
  'uploads',
  {
    id: text('id').primaryKey(),
    status: text('status').$type<'pending' | 'ready'>().notNull(),
    /** The shopper's file name, for the order sheet. Never used as a storage path. */
    name: text('name').notNull(),
    contentType: text('content_type').notNull(),
    bytes: integer('bytes').notNull(),
    /** Pixel size after EXIF rotation. */
    width: integer('width'),
    height: integer('height'),
    hasAlpha: integer('has_alpha', { mode: 'boolean' }),
    originalKey: text('original_key').notNull(),
    previewKey: text('preview_key'),
    thumbKey: text('thumb_key'),
    /** Set once the image is part of an order, so cleanup never removes it. */
    orderId: integer('order_id').references(() => orders.id, { onDelete: 'set null' }),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('uploads_created_idx').on(t.createdAt), index('uploads_order_idx').on(t.orderId)],
);

/* ---------- accounts (Better Auth) ---------- */

const created = () => new Date();

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(created),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(created)
    .$onUpdate(() => new Date()),
});

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(created),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(created)
      .$onUpdate(() => new Date()),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [index('session_user_idx').on(t.userId)],
);

export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(created),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(created)
      .$onUpdate(() => new Date()),
  },
  (t) => [index('account_user_idx').on(t.userId)],
);

export const verification = sqliteTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(created),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(created)
      .$onUpdate(() => new Date()),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
);

/** Better Auth's own rate-limit counters (sign-in codes and the like). */
export const authRateLimit = sqliteTable('auth_rate_limit', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull(),
  lastRequest: integer('last_request', { mode: 'number' }).notNull(),
});

/* ---------- addresses and orders ---------- */

export const addresses = sqliteTable(
  'addresses',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    line1: text('line1').notNull(),
    line2: text('line2').notNull().default(''),
    landmark: text('landmark').notNull().default(''),
    city: text('city').notNull(),
    state: text('state').notNull(),
    pincode: text('pincode').notNull(),
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('addresses_user_idx').on(t.userId)],
);

export type OrderStatus = 'pending_payment' | 'placed' | 'confirmed' | 'printing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'unpaid' | 'paid' | 'cod_due' | 'failed' | 'refunded';
export type PaymentMethod = 'online' | 'cod';

/** The delivery address as it was when the order was placed. */
export interface AddressSnapshot {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
}

export const orders = sqliteTable(
  'orders',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Shown to shoppers, for example PYV-7KQ2MD. */
    number: text('number').notNull().unique(),
    /** Secret for the private order link in emails. */
    accessKey: text('access_key').notNull(),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    name: text('name').notNull(),
    address: text('address', { mode: 'json' }).$type<AddressSnapshot>().notNull(),
    status: text('status').$type<OrderStatus>().notNull(),
    paymentMethod: text('payment_method').$type<PaymentMethod>().notNull(),
    paymentStatus: text('payment_status').$type<PaymentStatus>().notNull(),
    itemCount: integer('item_count').notNull(),
    /** Money in paise, frozen from the server's quote when the order was placed. */
    subtotal: integer('subtotal').notNull(),
    discounts: text('discounts', { mode: 'json' }).$type<Array<{ id: string; label: string; amount: number }>>().notNull(),
    discountTotal: integer('discount_total').notNull(),
    shipping: integer('shipping').notNull(),
    codFee: integer('cod_fee').notNull(),
    prepaidDiscount: integer('prepaid_discount').notNull(),
    total: integer('total').notNull(),
    razorpayOrderId: text('razorpay_order_id').unique(),
    razorpayPaymentId: text('razorpay_payment_id'),
    paidAt: integer('paid_at'),
    /** Sent by the checkout page so a double click creates one order. */
    idempotencyKey: text('idempotency_key').notNull().unique(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('orders_user_idx').on(t.userId), index('orders_email_idx').on(t.email), index('orders_status_idx').on(t.status, t.createdAt)],
);

export const orderItems = sqliteTable(
  'order_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    /** The catalog product (0 for custom-studio items). Kept as a plain number so old orders survive product deletions. */
    productId: integer('product_id').notNull(),
    typeId: text('type_id').notNull(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    typeName: text('type_name').notNull(),
    options: text('options', { mode: 'json' }).$type<Record<string, string>>().notNull(),
    optionLabels: text('option_labels', { mode: 'json' }).$type<string[]>().notNull(),
    art: text('art', { mode: 'json' }).$type<ArtSpec | null>(),
    image: text('image'),
    custom: text('custom', { mode: 'json' }).$type<CustomDesign | null>(),
    unit: integer('unit').notNull(),
    qty: integer('qty').notNull(),
    total: integer('total').notNull(),
  },
  (t) => [index('order_items_order_idx').on(t.orderId)],
);

/** Status timeline for each order. */
export const orderEvents = sqliteTable(
  'order_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    status: text('status').$type<OrderStatus>().notNull(),
    note: text('note').notNull().default(''),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('order_events_order_idx').on(t.orderId)],
);

/** Razorpay webhook events already handled, so a repeated delivery changes nothing. */
export const paymentEvents = sqliteTable('payment_events', {
  id: text('id').primaryKey(),
  orderId: integer('order_id'),
  type: text('type').notNull(),
  createdAt: integer('created_at').notNull(),
});

/** Fixed-window counters for simple rate limits (checkout, tracking, uploads). */
export const requestLimits = sqliteTable('request_limits', {
  key: text('key').primaryKey(),
  windowStart: integer('window_start').notNull(),
  count: integer('count').notNull(),
});
