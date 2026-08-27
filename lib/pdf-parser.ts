import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

export type TimberRow = {
  id: string;
  nummer: string;
  breedte: number;
  hoogte: number;
  lengte: number;
  aantal: number;
  profiel: string;
  omitWhite?: boolean;
};

export type ParsedDocument = {
  id: string;
  fileName: string;
  project: string;
  offerte: string;
  opdrachtgever: string;
  rows: TimberRow[];
  warnings: string[];
};

type Product = {
  breedte: number;
  hoogte: number;
  profiel: string;
  omitWhite?: boolean;
  fixedLength?: number;
  fixedLengthCaptured?: boolean;
};

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function captureLabel(lines: string[], label: string) {
  const expression = new RegExp(`${label}:\\s*(.*?)(?=\\s+(?:Project|Offerte|Opdrachtgever|Fase|Omschrijving):|$)`, 'i');
  for (const line of lines) {
    const match = line.match(expression);
    if (match?.[1]) {
      const captured = cleanText(match[1]).replace(/^[^\p{L}\p{N}]+/u, '');
      return label.toLowerCase() === 'offerte' ? captured.replace(/^0(?=\d{2}-\d+$)/, 'O') : captured;
    }
  }
  return '';
}

function normalizeProfile(value = '') {
  if (!value) return '';
  return value.length === 1 ? value.toUpperCase() : value.toLowerCase();
}

function parseProduct(line: string): Product | null {
  const omitWhite = /\bspouw\s*lat\b/i.test(line);
  const schoor = line.match(/\bSchoor\s+0*(\d{2,3})\s*x\s*0*(\d{2,3})\s+([A-Za-z]+\d*)/i);
  if (schoor) {
    const lengths = [...line.matchAll(/\b(\d{3,5})\s*mm\b/gi)];
    return {
      breedte: Number(schoor[1]),
      hoogte: Number(schoor[2]),
      profiel: normalizeProfile(schoor[3]),
      omitWhite,
      fixedLength: lengths.length ? Number(lengths.at(-1)?.[1]) : undefined,
    };
  }

  // Productregels kunnen vrije omschrijvingen gebruiken (bijvoorbeeld Stel,
  // Spouwlat of een projectspecifieke tekst). De eerste maat is de bruto
  // bestelmaat; de laatste maat op dezelfde houtregel is de netto houtmaat.
  const dimensions = [...line.matchAll(/0*(\d{2,3})\s*x\s*0*(\d{2,3})(?:\s*([A-Za-z])(?=\s|$))?/gi)];
  if (/\b(?:VUR(?:EN)?|RUW|SLS|FSC)\b/i.test(line) && dimensions.length >= 2) {
    const net = dimensions.at(-1)!;
    return {
      breedte: Number(net[1]),
      hoogte: Number(net[2]),
      profiel: normalizeProfile(net[3]),
      omitWhite,
    };
  }

  const stel = line.match(/\bStel\s+0*(\d{2,3})\s*x\s*0*(\d{2,3})(?:\s*([A-Za-z])(?=\s|$))?/i);
  if (stel) {
    return {
      breedte: Number(stel[1]),
      hoogte: Number(stel[2]),
      profiel: normalizeProfile(stel[3]),
      omitWhite,
    };
  }

  const sls = line.match(/\bVuren\s+0*(\d{2,3})\s*x\s*0*(\d{2,3})\s+Vuren\s+SLS\b/i);
  if (sls) {
    return { breedte: Number(sls[1]), hoogte: Number(sls[2]), profiel: '', omitWhite };
  }

  const raw = line.match(/\bVUR\s+RUW\s+0*(\d{2,3})\s*x\s*0*(\d{2,3})([A-Za-z])\b/i);
  if (raw && !/\bStel\b/i.test(line)) {
    return {
      breedte: Number(raw[1]),
      hoogte: Number(raw[2]),
      profiel: normalizeProfile(raw[3]),
      omitWhite,
    };
  }

  return null;
}

export function buildNumber(row: Pick<TimberRow, 'breedte' | 'hoogte' | 'lengte' | 'profiel' | 'omitWhite'>) {
  const parts = [String(row.lengte)];
  if (row.profiel) parts.push(row.profiel);
  if (!row.omitWhite && !(row.breedte === 21 && row.hoogte === 48)) parts.push('Wit');
  return parts.join(' ');
}

export function parseTextLines(lines: string[], fileName: string): ParsedDocument {
  const rows: TimberRow[] = [];
  const warnings: string[] = [];
  let product: Product | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    // Bij OCR of een afwijkende PDF-layout kan de bruto maat op de vorige
    // tekstregel staan en de netto maat op de huidige. Alleen regels die zelf
    // een maat bevatten worden samengevoegd, zodat aantallen niet verdwijnen.
    const continuedProduct = /\d\s*x\s*\d/i.test(line) && index > 0
      ? parseProduct(`${lines[index - 1]} ${line}`)
      : null;
    const nextProduct = parseProduct(line) ?? continuedProduct;
    if (nextProduct) {
      product = nextProduct;
      continue;
    }
    if (!product) continue;

    const sizedRow = line.match(/^\s*(\d+)\s+(\d{2,5})\s*mm\b/i);
    if (sizedRow) {
      const row = {
        id: crypto.randomUUID(),
        breedte: product.breedte,
        hoogte: product.hoogte,
        lengte: Number(sizedRow[2]),
        aantal: Number(sizedRow[1]),
        profiel: product.profiel,
        omitWhite: product.omitWhite,
      } as TimberRow;
      row.nummer = buildNumber(row);
      rows.push(row);
      continue;
    }

    if (product.fixedLength && !product.fixedLengthCaptured) {
      const quantity = line.match(/^\s*(\d+)\s+(?:(?:\d+\/[A-Za-z])|$)/);
      if (quantity) {
        const row = {
          id: crypto.randomUUID(),
          breedte: product.breedte,
          hoogte: product.hoogte,
          lengte: product.fixedLength,
          aantal: Number(quantity[1]),
          profiel: product.profiel,
          omitWhite: product.omitWhite,
        } as TimberRow;
        row.nummer = buildNumber(row);
        rows.push(row);
        product.fixedLengthCaptured = true;
      }
    }
  }

  const project = captureLabel(lines, 'Project') || fileName.match(/W\d{2}-\d{4}-\d+/i)?.[0] || '';
  const offerte = captureLabel(lines, 'Offerte');
  const opdrachtgever = captureLabel(lines, 'Opdrachtgever');
  if (!project) warnings.push('Projectnummer niet gevonden.');
  if (!offerte) warnings.push('Offertenummer niet gevonden.');
  if (!opdrachtgever) warnings.push('Opdrachtgever niet gevonden.');
  if (!rows.length) warnings.push('Geen houtregels gevonden; controleer of dit PDF-formaat wordt ondersteund.');

  return {
    id: crypto.randomUUID(), fileName, project, offerte, opdrachtgever, rows, warnings,
  };
}

async function renderPage(page: PDFPageProxy, scale: number) {
  const viewport = page.getViewport({ scale });
  const canvas = window.document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext('2d');
  if (!context) return null;
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return canvas;
}

async function createOcrWorker() {
  const { createWorker } = await import('tesseract.js');
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return createWorker('eng', 1, {
    workerPath: `${basePath}/tesseract-worker.min.js`,
    corePath: `${basePath}/tesseract-core`,
    langPath: `${basePath}/tessdata`,
  });
}

async function recognizeHeader(page: PDFPageProxy) {
  const canvas = await renderPage(page, 3);
  if (!canvas) return [];

  const header = window.document.createElement('canvas');
  header.width = canvas.width;
  header.height = Math.ceil(canvas.height * 0.15);
  const headerContext = header.getContext('2d');
  if (!headerContext) return [];
  headerContext.fillStyle = '#ffffff';
  headerContext.fillRect(0, 0, header.width, header.height);
  headerContext.drawImage(canvas, 0, 0, header.width, header.height, 0, 0, header.width, header.height);

  const { PSM } = await import('tesseract.js');
  const worker = await createOcrWorker();
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
    const result = await worker.recognize(header);
    return result.data.text.split(/\r?\n/).map(cleanText).filter(Boolean);
  } finally {
    await worker.terminate();
  }
}

async function recognizeScannedPages(pdf: PDFDocumentProxy) {
  const { PSM } = await import('tesseract.js');
  const worker = await createOcrWorker();
  const lines: string[] = [];
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const canvas = await renderPage(await pdf.getPage(pageNumber), 2);
      if (!canvas) continue;
      const result = await worker.recognize(canvas);
      lines.push(...result.data.text.split(/\r?\n/).map(cleanText).filter(Boolean));
    }
    return lines;
  } finally {
    await worker.terminate();
  }
}

export async function parsePdf(file: File, onStage?: (message: string) => void): Promise<ParsedDocument> {
  onStage?.(`${file.name}: houtregels uitlezen…`);
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/pdf.worker.min.mjs`;

  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const lines: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items
      .map((item) => 'str' in item ? { text: item.str, x: item.transform[4], y: item.transform[5] } : null)
      .filter((item): item is { text: string; x: number; y: number } => item !== null)
      .sort((a, b) => Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x);

    const grouped: Array<{ y: number; parts: Array<{ x: number; text: string }> }> = [];
    for (const item of items) {
      let line = grouped.find((candidate) => Math.abs(candidate.y - item.y) <= 2);
      if (!line) {
        line = { y: item.y, parts: [] };
        grouped.push(line);
      }
      line.parts.push({ x: item.x, text: item.text });
    }
    grouped
      .sort((a, b) => b.y - a.y)
      .forEach((line) => lines.push(cleanText(line.parts.sort((a, b) => a.x - b.x).map((part) => part.text).join(' '))));
  }

  let parsed = parseTextLines(lines.filter(Boolean), file.name);
  let scannedLines: string[] = [];

  if (!parsed.rows.length) {
    onStage?.(`${file.name}: gescande pagina's herkennen…`);
    try {
      scannedLines = await recognizeScannedPages(pdf);
      parsed = parseTextLines([...lines, ...scannedLines].filter(Boolean), file.name);
    } catch {
      parsed.warnings.push('De gescande houtregels konden niet automatisch worden herkend; controleer deze PDF handmatig.');
    }
  }

  if (!parsed.offerte || !parsed.opdrachtgever) {
    onStage?.(`${file.name}: projectkop herkennen…`);
    try {
      const headerLines = scannedLines.length ? scannedLines : await recognizeHeader(await pdf.getPage(1));
      parsed.project ||= captureLabel(headerLines, 'Project');
      parsed.offerte ||= captureLabel(headerLines, 'Offerte');
      parsed.opdrachtgever ||= captureLabel(headerLines, 'Opdrachtgever');
      parsed.warnings = parsed.warnings.filter((warning) =>
        !(parsed.project && warning.startsWith('Projectnummer')) &&
        !(parsed.offerte && warning.startsWith('Offertenummer')) &&
        !(parsed.opdrachtgever && warning.startsWith('Opdrachtgever')),
      );
    } catch {
      parsed.warnings.push('De visuele projectkop kon niet automatisch worden herkend; vul de ontbrekende velden handmatig in.');
    }
  }
  return parsed;
}
