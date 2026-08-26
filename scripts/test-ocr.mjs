import path from 'node:path';
import { createWorker, PSM } from 'tesseract.js';
import { parseTextLines } from '../lib/pdf-parser.ts';

const worker = await createWorker('eng', 1, { langPath: path.resolve('public/tessdata') });
await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
const result = await worker.recognize(process.argv[2]);
console.log(result.data.text);
console.log(parseTextLines(result.data.text.split(/\r?\n/), 'test.pdf'));
await worker.terminate();
