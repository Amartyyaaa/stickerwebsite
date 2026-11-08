import { describe, expect, it } from 'vitest';
import { ratingSummary, reviewName, reviewProblem } from './review-rules';

const ok = { delivered: true, productId: 7, productExists: true, alreadyReviewed: false, rating: 5, body: 'Lovely print!', photos: 1 };

describe('reviews', () => {
  it('shows a first name and initial', () => {
    expect(reviewName('  meera   iyer ')).toBe('Meera I.');
    expect(reviewName('Arjun')).toBe('Arjun');
    expect(reviewName('')).toBe('Verified buyer');
  });
  it('only lets buyers of delivered catalog items review, once', () => {
    expect(reviewProblem(ok)).toBeNull();
    expect(reviewProblem({ ...ok, body: '' })).toBeNull();
    expect(reviewProblem({ ...ok, delivered: false })).toMatch(/once it’s delivered/);
    expect(reviewProblem({ ...ok, productId: 0 })).toMatch(/Custom-printed/);
    expect(reviewProblem({ ...ok, productExists: false })).toMatch(/isn’t in the store/);
    expect(reviewProblem({ ...ok, alreadyReviewed: true })).toMatch(/already reviewed/);
    expect(reviewProblem({ ...ok, rating: 0 })).toMatch(/1 to 5 stars/);
    expect(reviewProblem({ ...ok, rating: 4.5 })).toMatch(/1 to 5 stars/);
    expect(reviewProblem({ ...ok, photos: 4 })).toMatch(/up to 3 photos/);
  });
  it('averages ratings', () => {
    expect(ratingSummary([5, 4, 4, 1])).toEqual({ count: 4, average: 3.5, stars: [1, 2, 0, 0, 1] });
    expect(ratingSummary([])).toEqual({ count: 0, average: 0, stars: [0, 0, 0, 0, 0] });
    expect(ratingSummary([5, 5, 4]).average).toBe(4.7);
  });
});
