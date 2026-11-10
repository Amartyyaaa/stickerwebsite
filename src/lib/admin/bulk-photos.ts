/**
 * Helpers for "Add from photos" (Admin → Products): turning a folder of design files into products.
 * Pure, so they're unit-tested.
 */
import { LIMITS } from './product-rules';

/** At most this many photos become products in one request; the page sends bigger folders in turns. */
export const BULK_BATCH = 100;

/**
 * A product name from a file name: "kitsune-moon_v2.png" → "Kitsune Moon V2", "nightDrive.jpg" → "Night Drive".
 * Copy markers like "(1)" and "copy" are dropped; words already in capitals (JDM) stay as they are.
 */
export function nameFromFile(fileName: string): string {
  const base = fileName.replace(/^.*[\\/]/, '').replace(/\.[a-z0-9]{2,5}$/i, '');
  const words = base
    .replace(/\(\d+\)|\bcopy\b/gi, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_\-.+]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w === w.toLowerCase() ? w[0].toUpperCase() + w.slice(1) : w));
  return words.join(' ').slice(0, LIMITS.nameMax).trim();
}

/** The folder a file was in, when a whole folder was chosen ("designs/Anime/fox.png" → "Anime"). */
export function folderOf(relativePath: string): string {
  const parts = relativePath.split('/').filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 2] : '';
}

const squash = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\band\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '');

/** The theme a folder name matches, by name or web address, ignoring case, spaces, "&" and "and". */
export function themeForFolder(folder: string, themes: ReadonlyArray<{ id: string; name: string }>): string | null {
  const key = squash(folder);
  if (!key) return null;
  return themes.find((t) => squash(t.name) === key || squash(t.id) === key)?.id ?? null;
}
