import type { ParsedDocument } from './pdf-parser';

function csvValue(value: string | number) {
  const text = String(value ?? '');
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function createCsv(document: Pick<ParsedDocument, 'rows'>) {
  const headers = ['Nummer', 'Breedte', 'Hoogte', 'Lengte', 'Aantal', 'Profiel', 'Beschrijving'];
  const rows = document.rows.map((row) => [
    row.nummer,
    row.breedte,
    row.hoogte,
    row.lengte,
    row.aantal,
    row.profiel,
    row.beschrijving,
  ]);
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvValue).join(';')).join('\r\n')}\r\n`;
}
