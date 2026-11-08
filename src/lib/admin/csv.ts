/**
 * A small CSV reader and writer for the product import and export.
 * Handles quoted cells (with commas, quotes and line breaks inside), Windows
 * and Unix line endings, the byte-order mark Excel adds, and tab-separated
 * text pasted straight from a spreadsheet.
 */

/** Comma, or tab when the first line has more tabs than commas (text copied from Excel or Google Sheets). */
function detectDelimiter(text: string): ',' | '\t' {
  let commas = 0;
  let tabs = 0;
  let quoted = false;
  for (const ch of text) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && (ch === '\n' || ch === '\r')) break;
    else if (!quoted && ch === ',') commas++;
    else if (!quoted && ch === '\t') tabs++;
  }
  return tabs > commas ? '\t' : ',';
}

export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
      } else cell += ch;
      i++;
      continue;
    }
    if (ch === '"' && cell === '') quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else cell += ch;
    i++;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const needsQuotes = /[",\r\n\t]|^\s|\s$/;

function cellText(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return needsQuotes.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV text with Windows line endings, which Excel and Google Sheets both read. */
export function toCsv(rows: ReadonlyArray<ReadonlyArray<string | number | boolean | null | undefined>>): string {
  return rows.map((r) => r.map(cellText).join(',')).join('\r\n') + '\r\n';
}
