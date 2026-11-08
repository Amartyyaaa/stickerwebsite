/** Rules for verified-buyer reviews, shared by the review form and the server. */

export const MAX_REVIEW_PHOTOS = 3;
export const MAX_REVIEW_TEXT = 1000;

/** "Meera Iyer" → "Meera I.", so reviews don't show full names. */
export function reviewName(full: string): string {
  const parts = full.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!parts.length) return 'Verified buyer';
  const first = parts[0].slice(0, 24).replace(/^./, (c) => c.toUpperCase());
  const last = parts.length > 1 ? ` ${parts[parts.length - 1][0].toUpperCase()}.` : '';
  return `${first}${last}`;
}

/** Why this review can't be accepted, or null. */
export function reviewProblem(r: { delivered: boolean; productId: number; productExists: boolean; alreadyReviewed: boolean; rating: number; body: string; photos: number }): string | null {
  if (!r.delivered) return 'You can review your order once it’s delivered.';
  if (r.productId <= 0) return 'Custom-printed items can’t be reviewed on the store.';
  if (!r.productExists) return 'That product isn’t in the store any more.';
  if (r.alreadyReviewed) return 'You’ve already reviewed this item. Thank you!';
  if (!Number.isInteger(r.rating) || r.rating < 1 || r.rating > 5) return 'Choose from 1 to 5 stars.';
  if (r.body.trim().length > MAX_REVIEW_TEXT) return `Keep the review under ${MAX_REVIEW_TEXT} characters.`;
  if (r.photos > MAX_REVIEW_PHOTOS) return `Add up to ${MAX_REVIEW_PHOTOS} photos.`;
  return null;
}

export interface RatingSummary {
  count: number;
  /** Rounded to one decimal place. */
  average: number;
  /** How many reviews gave 5, 4, 3, 2 and 1 stars. */
  stars: [number, number, number, number, number];
}

export function ratingSummary(ratings: number[]): RatingSummary {
  const stars: RatingSummary['stars'] = [0, 0, 0, 0, 0];
  for (const r of ratings) if (r >= 1 && r <= 5) stars[5 - r]++;
  const count = stars.reduce((a, b) => a + b, 0);
  const total = stars.reduce((sum, n, i) => sum + n * (5 - i), 0);
  return { count, average: count ? Math.round((total / count) * 10) / 10 : 0, stars };
}
