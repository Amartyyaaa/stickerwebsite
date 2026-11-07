import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { ArtKind, ArtSpec } from '@/lib/art/types';
import type { GroupId, OptionGroup, PriceProfile } from '@/lib/catalog/types';

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
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('uploads_created_idx').on(t.createdAt)],
);
