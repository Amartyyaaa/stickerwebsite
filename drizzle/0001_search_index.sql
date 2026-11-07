-- Full-text search over product names, tags, product types and vibes.
-- Rows are kept in sync by the app (see src/lib/catalog/search-index.ts); rowid = products.id.
CREATE VIRTUAL TABLE IF NOT EXISTS `products_fts` USING fts5(
	`name`,
	`tags`,
	`type_name`,
	`vibe_names`,
	tokenize = 'unicode61 remove_diacritics 2',
	prefix = '2 3'
);
