import fs from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseTextLines } from '../lib/pdf-parser.ts';

const input = process.argv[2];
if (!input) throw new Error('Geef een PDF-pad op.');
const pdf = await getDocument({ data: new Uint8Array(await fs.readFile(input)) }).promise;
const lines = [];

for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();
  const items = content.items
    .filter((item) => 'str' in item && 'transform' in item)
    .map((item) => ({ text: item.str, x: item.transform[4], y: item.transform[5] }))
    .sort((a, b) => Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x);
  const grouped = [];
  for (const item of items) {
    let line = grouped.find((candidate) => Math.abs(candidate.y - item.y) <= 2);
    if (!line) { line = { y: item.y, parts: [] }; grouped.push(line); }
    line.parts.push({ x: item.x, text: item.text });
  }
  grouped.sort((a, b) => b.y - a.y).forEach((line) => lines.push(line.parts.sort((a, b) => a.x - b.x).map((part) => part.text).join(' ').replace(/\s+/g, ' ').trim()));
}

const result = parseTextLines(lines.filter(Boolean), input.split(/[\\/]/).at(-1));
console.log(JSON.stringify({ headerLines: lines.slice(0, 28), metadataLines: lines.filter((line) => /Project|Offerte|Opdrachtgever|Vastbouw|O25-/i.test(line)), project: result.project, offerte: result.offerte, opdrachtgever: result.opdrachtgever, rowCount: result.rows.length, firstRows: result.rows.slice(0, 3), warnings: result.warnings }, null, 2));
