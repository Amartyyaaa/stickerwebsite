/** URL-friendly names, for example "Pit Lane Poster" → "pit-lane-poster". */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_SLUG = 120;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG)
    .replace(/-+$/, '');
}

/** The first of `base`, `base-2`, `base-3`… that `taken` doesn't have. */
export function uniqueSlug(base: string, taken: (slug: string) => boolean): string {
  const root = base || 'product';
  if (!taken(root)) return root;
  for (let n = 2; ; n++) {
    const suffix = `-${n}`;
    const slug = `${root.slice(0, MAX_SLUG - suffix.length).replace(/-+$/, '')}${suffix}`;
    if (!taken(slug)) return slug;
  }
}
