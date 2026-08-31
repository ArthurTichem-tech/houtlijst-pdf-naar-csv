import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

export type TimberRow = {
  id: string;
  nummer: string;
  breedte: number;
  hoogte: number;
  lengte: number;
  aantal: number;
  profiel: string;
};

export type ParsedDocument = {
  id: string;
  fileName: string;
  project: string;
  offerte: string;
  opdrachtgever: string;
  rows: TimberRow[];
  warnings: string[];
  recognitionStatus: 'complete' | 'review' | 'incomplete';
  qualityIssues: string[];
  unrecognizedLines: string[];
};

type Product = {
  breedte: number;
  hoogte: number;
  profiel: string;
  fixedLength?: number;
  fixedLengthCaptured?: boolean;
  capturedRows?: number;
  capturedAantal?: number;
  closed?: boolean;
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

export function formatProfile(value = '') {
  const cleaned = cleanText(value);
  if (!cleaned || /^wit$/i.test(cleaned)) return 'WIT';
  const model = cleaned.replace(/^model\s+/i, '').replace(/,\s*wit$/i, '').trim();
  if (!model) return 'WIT';
  if (/^schuin$/i.test(model)) return 'schuin';
  return `Model ${model.length === 1 ? model.toUpperCase() : model}, WIT`;
}

export function formatRowProfile(row: Pick<TimberRow, 'breedte' | 'hoogte' | 'profiel'>) {
  const profile = formatProfile(row.profiel);
  return row.breedte === 21 && row.hoogte === 48 && profile === 'WIT' ? '' : profile;
}

function productName(product: Product) {
  return `${product.breedte}x${product.hoogte}${product.profiel ? ` ${product.profiel}` : ''}`;
}

function recognitionStatus(rows: TimberRow[], warnings: string[], qualityIssues: string[]) {
  if (!rows.length || qualityIssues.length) return 'incomplete' as const;
  return warnings.length ? 'review' as const : 'complete' as const;
}

export function isBetterRecognition(candidate: ParsedDocument, current: ParsedDocument) {
  const statusRank = { incomplete: 0, review: 1, complete: 2 };
  const candidateQuantity = candidate.rows.reduce((total, row) => total + row.aantal, 0);
  const currentQuantity = current.rows.reduce((total, row) => total + row.aantal, 0);
  const candidateScore = [
    statusRank[candidate.recognitionStatus],
    -candidate.qualityIssues.length,
    candidateQuantity,
    candidate.rows.length,
    -candidate.warnings.length,
  ];
  const currentScore = [
    statusRank[current.recognitionStatus],
    -current.qualityIssues.length,
    currentQuantity,
    current.rows.length,
    -current.warnings.length,
  ];

  return candidateScore.some((value, index) =>
    value !== currentScore[index] &&
    candidateScore.slice(0, index).every((earlier, earlierIndex) => earlier === currentScore[earlierIndex]) &&
    value > currentScore[index],
  );
}

function parseProduct(line: string): Product | null {
  const schoren = [...line.matchAll(/\bSchoor\s+0*(\d{2,3})\s*[x×]\s*0*(\d{2,3})\s+([A-Za-z]+\d*)/gi)];
  const schoor = schoren.at(-1);
  if (schoor) {
    const lengths = [...line.matchAll(/\b(\d{3,5})\s*mm\b/gi)];
    return {
      breedte: Number(schoor[1]),
      hoogte: Number(schoor[2]),
      profiel: normalizeProfile(schoor[3]),
      fixedLength: lengths.length ? Number(lengths.at(-1)?.[1]) : undefined,
    };
  }

  // Productregels kunnen vrije omschrijvingen gebruiken (bijvoorbeeld Stel,
  // Spouwlat of een projectspecifieke tekst). De eerste maat is de bruto
  // bestelmaat; de laatste maat op dezelfde houtregel is de netto houtmaat.
  const dimensions = [...line.matchAll(/0*(\d{2,3})\s*[x×]\s*0*(\d{2,3})(?:\s*(?:[-(]\s*)?([A-Za-z])\s*\)?)?(?=\s|$)/gi)];
  if (/\b(?:VUR|RUW|SLS)\b/i.test(line) && dimensions.length >= 2) {
    const net = dimensions.at(-1)!;
    return {
      breedte: Number(net[1]),
      hoogte: Number(net[2]),
      profiel: normalizeProfile(net[3]),
    };
  }

  const stel = line.match(/\bStel\s+0*(\d{2,3})\s*[x×]\s*0*(\d{2,3})(?:\s*(?:[-(]\s*)?([A-Za-z])\s*\)?(?=\s|$))?/i);
  if (stel) {
    return {
      breedte: Number(stel[1]),
      hoogte: Number(stel[2]),
      profiel: normalizeProfile(stel[3]),
    };
  }

  const sls = line.match(/\bVuren\s+0*(\d{2,3})\s*[x×]\s*0*(\d{2,3})\s+Vuren\s+SLS\b/i);
  if (sls) {
    return { breedte: Number(sls[1]), hoogte: Number(sls[2]), profiel: '' };
  }

  const raw = line.match(/\bVUR\s+RUW\s+0*(\d{2,3})\s*[x×]\s*0*(\d{2,3})([A-Za-z])\b/i);
  if (raw && !/\bStel\b/i.test(line)) {
    return {
      breedte: Number(raw[1]),
      hoogte: Number(raw[2]),
      profiel: normalizeProfile(raw[3]),
    };
  }

  return null;
}

export function buildNumber(row: Pick<TimberRow, 'breedte' | 'hoogte' | 'lengte' | 'profiel'>) {
  return [String(row.lengte), formatRowProfile(row)].filter(Boolean).join(' ');
}

export function parseTextLines(lines: string[], fileName: string): ParsedDocument {
  const rows: TimberRow[] = [];
  const warnings: string[] = [];
  const qualityIssues: string[] = [];
  const unrecognizedLines: string[] = [];
  let product: Product | null = null;

  function addQualityIssue(issue: string, line?: string) {
    if (!qualityIssues.includes(issue)) qualityIssues.push(issue);
    if (line && !unrecognizedLines.includes(line)) unrecognizedLines.push(line);
  }

  function finalizeProduct(current: Product | null) {
    if (current && !current.capturedRows) {
      addQualityIssue(`Houtmaat ${productName(current)} heeft geen herkende aantallen.`);
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    // Bij OCR of een afwijkende PDF-layout kunnen bruto maat, omschrijving en
    // netto maat over meerdere regels zijn verdeeld. Alleen een regel die zelf
    // een maat bevat activeert dit korte terugkijkvenster.
    let continuedProduct: Product | null = null;
    if (/\d{2,3}\s*[x×]\s*\d{2,3}(?!\d)/i.test(line)) {
      for (let lookBehind = 1; lookBehind <= Math.min(3, index) && !continuedProduct; lookBehind += 1) {
        continuedProduct = parseProduct(lines.slice(index - lookBehind, index + 1).join(' '));
      }
    }
    const nextProduct = parseProduct(line) ?? continuedProduct;
    if (nextProduct) {
      finalizeProduct(product);
      product = { ...nextProduct, capturedRows: 0, capturedAantal: 0 };
      continue;
    }
    if (!product) continue;

    const declaredTotal = line.match(/^\s*(\d+)\s+[\d.,]+\s*m[12]\b/i);
    if (declaredTotal) {
      const expectedAantal = Number(declaredTotal[1]);
      if ((product.capturedAantal ?? 0) !== expectedAantal) {
        addQualityIssue(
          `Totaalcontrole ${productName(product)}: ${expectedAantal} stuks vermeld, ${(product.capturedAantal ?? 0)} uitgelezen.`,
          line,
        );
      }
      product.closed = true;
      continue;
    }

    if (product.fixedLengthCaptured && /^\s*\d+\s*$/.test(line)) {
      product.closed = true;
      continue;
    }
    if (product.closed) continue;

    const sizedRow = line.match(/^\s*(\d+)\s+(\d{2,5})\s*mm\b/i);
    if (sizedRow) {
      const row = {
        id: crypto.randomUUID(),
        breedte: product.breedte,
        hoogte: product.hoogte,
        lengte: Number(sizedRow[2]),
        aantal: Number(sizedRow[1]),
        profiel: product.profiel,
      } as TimberRow;
      row.profiel = formatRowProfile(row);
      row.nummer = buildNumber(row);
      rows.push(row);
      product.capturedRows = (product.capturedRows ?? 0) + 1;
      product.capturedAantal = (product.capturedAantal ?? 0) + row.aantal;
      continue;
    }

    if (product.fixedLength && !product.fixedLengthCaptured) {
      // Een schoorregel vermeldt de vaste lengte bij het product. De regel
      // eronder bevat alleen het aantal en een of meer positieverwijzingen.
      // Die verwijzingen kunnen zowel letters (1/K1) als cijfers (2/12-RZ)
      // bevatten; een kale totaalregel zonder verwijzing wordt genegeerd.
      const quantity = line.match(/^\s*(\d+)\s+\d+\/\S+/);
      if (quantity) {
        const row = {
          id: crypto.randomUUID(),
          breedte: product.breedte,
          hoogte: product.hoogte,
          lengte: product.fixedLength,
          aantal: Number(quantity[1]),
          profiel: product.profiel,
        } as TimberRow;
        row.profiel = formatRowProfile(row);
        row.nummer = buildNumber(row);
        rows.push(row);
        product.fixedLengthCaptured = true;
        product.capturedRows = (product.capturedRows ?? 0) + 1;
        product.capturedAantal = (product.capturedAantal ?? 0) + row.aantal;
        continue;
      }
    }

    const looksLikeUnknownQuantity =
      (/^\s*\d+\s+\d{2,5}(?:\s|$)/.test(line) && !/[x×]/i.test(line)) ||
      /^\s*\d+\s*[x×]\s*\d{2,5}(?:\s|$)/i.test(line) ||
      /^\s*\d+\s+stuks?\s+\d{2,5}\b/i.test(line);
    if (looksLikeUnknownQuantity) {
      addQualityIssue(`Mogelijke aantallenregel bij ${productName(product)} niet herkend.`, line);
    }
  }

  finalizeProduct(product);

  const project = captureLabel(lines, 'Project') || fileName.match(/W\d{2}-\d{4}-\d+/i)?.[0] || '';
  const offerte = captureLabel(lines, 'Offerte');
  const opdrachtgever = captureLabel(lines, 'Opdrachtgever');
  if (!project) warnings.push('Projectnummer niet gevonden.');
  if (!offerte) warnings.push('Offertenummer niet gevonden.');
  if (!opdrachtgever) warnings.push('Opdrachtgever niet gevonden.');
  if (!rows.length) warnings.push('Geen houtregels gevonden; controleer of dit PDF-formaat wordt ondersteund.');
  warnings.unshift(...qualityIssues);

  return {
    id: crypto.randomUUID(), fileName, project, offerte, opdrachtgever, rows, warnings,
    recognitionStatus: recognitionStatus(rows, warnings, qualityIssues),
    qualityIssues,
    unrecognizedLines,
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
      const canvas = await renderPage(await pdf.getPage(pageNumber), 3);
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

  if (!parsed.rows.length || parsed.recognitionStatus === 'incomplete') {
    onStage?.(`${file.name}: pagina's scherp controleren…`);
    try {
      scannedLines = await recognizeScannedPages(pdf);
      const ocrParsed = parseTextLines(scannedLines.filter(Boolean), file.name);

      if (isBetterRecognition(ocrParsed, parsed)) {
        ocrParsed.project ||= parsed.project;
        ocrParsed.offerte ||= parsed.offerte;
        ocrParsed.opdrachtgever ||= parsed.opdrachtgever;
        parsed = ocrParsed;
      }
    } catch {
      parsed.warnings.push('De aanvullende visuele controle kon niet worden uitgevoerd; controleer deze PDF handmatig.');
    }
  }

  parsed.warnings = parsed.warnings.filter((warning) =>
    !(parsed.project && warning.startsWith('Projectnummer')) &&
    !(parsed.offerte && warning.startsWith('Offertenummer')) &&
    !(parsed.opdrachtgever && warning.startsWith('Opdrachtgever')),
  );
  parsed.recognitionStatus = recognitionStatus(parsed.rows, parsed.warnings, parsed.qualityIssues);

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
      parsed.recognitionStatus = recognitionStatus(parsed.rows, parsed.warnings, parsed.qualityIssues);
    } catch {
      parsed.warnings.push('De visuele projectkop kon niet automatisch worden herkend; vul de ontbrekende velden handmatig in.');
      parsed.recognitionStatus = recognitionStatus(parsed.rows, parsed.warnings, parsed.qualityIssues);
    }
  }
  return parsed;
}
