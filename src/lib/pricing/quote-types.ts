import type { ArtSpec } from '@/lib/art/types';
import type { Quote } from './engine';

export interface QuoteRequestLine {
  key: string;
  productId: number;
  options?: Record<string, string>;
  qty: number;
}

export interface QuotedLine {
  key: string;
  productId: number;
  slug: string;
  name: string;
  typeName: string;
  art: ArtSpec | null;
  image: string | null;
  options: Record<string, string>;
  optionLabels: string[];
  qty: number;
  unit: number;
  total: number;
}

export interface QuoteResponse {
  lines: QuotedLine[];
  /** Cart keys the server could not price (removed products or invalid options). */
  invalid: string[];
  summary: Omit<Quote, 'lines'>;
  /** False while online payments aren't set up, so the cart only mentions Cash on Delivery. */
  onlinePayments?: boolean;
}
