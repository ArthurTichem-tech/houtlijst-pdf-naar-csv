import assert from 'node:assert/strict';
import { formatProfile, parseTextLines } from '../lib/pdf-parser.ts';

function signatures(document) {
  return document.rows.map(({ breedte, hoogte, lengte, aantal, profiel, nummer }) =>
    `${breedte}x${hoogte}|${lengte}|${aantal}|${profiel}|${nummer}`,
  );
}

function expectedOutput(signature) {
  const [dimensions, length, quantity, model] = signature.split('|');
  const profile = formatProfile(model);
  return `${dimensions}|${length}|${quantity}|${profile}|${length} ${profile}`;
}

function verifyPdfVariant({ name, lines, expected }) {
  const document = parseTextLines(lines, name);
  assert.deepEqual(signatures(document), expected.map(expectedOutput), `${name} veranderde onverwacht`);
}

verifyPdfVariant({
  name: 'W25-0284-02_K61-1031+1033+Vurenhout+FSC+bestellijst.pdf',
  lines: [
    'VUR RUW 032x050 Spouwlat 27x44 mm Vuren FSC',
    '4 2824 mm 2/H 2/H1',
    '8 2471 mm 4/H 4/H1',
    '12 31.064 m1',
    'VUR RUW 032x063 Spouwlat 27x51 mm Vuren FSC',
    '2 2489 mm 2/J',
    '1 1739 mm 1/J',
    '3 6.717 m1',
    'VUR RUW 032x100 Spouwlat 15x81 mm (onder LR dorpel) Vuren FSC',
    '8 1102 mm 4/N 4/N1',
    '8 8.816 m1',
    'VUR SLS 038x089 FSC Spouwlat 38x70 mm Vuren SLS FSC',
    '16 2575 mm 8/N 8/N1',
    'VUR SLS 038x120 FSC Spouwlat 38x112 mm (onder LR dorpel) Vuren SLS FSC',
    '8 1138 mm 4/N 4/N1',
    'VUR SLS 038x140 FSC Spouwlat 38x130 mm Vuren SLS FSC',
    '8 1138 mm 4/N 4/N1',
  ],
  expected: [
    '27x44|2824|4||2824',
    '27x44|2471|8||2471',
    '27x51|2489|2||2489',
    '27x51|1739|1||1739',
    '15x81|1102|8||1102',
    '38x70|2575|16||2575',
    '38x112|1138|8||1138',
    '38x130|1138|8||1138',
  ],
});

verifyPdfVariant({
  name: 'W25-0237-02_K61-1031+1033+Vurenhout+FSC+bestellijst.pdf',
  lines: [
    'Omschrijving: binnenkozijnen Project: W25-0237-02',
    'VUR RUW 050x075 Vulhout Vuren 36x70 mm Vuren FSC',
    '2 1507 mm 2/2',
    '6 1372mm 4/1 2/1a',
    '4 1206 mm 4/3',
    '2 1006 mm 2/4H',
    '25 140 mm 8/1 4/1a 4/2 6/3 3/4H',
    '39 21.582 m1',
  ],
  expected: [
    '36x70|1507|2||1507 Wit',
    '36x70|1372|6||1372 Wit',
    '36x70|1206|4||1206 Wit',
    '36x70|1006|2||1006 Wit',
    '36x70|140|25||140 Wit',
  ],
});

const splitProductDescription = parseTextLines([
  'VUR RUW 050x075',
  'onbekende toekomstige omschrijving vóór netto maat 36x70 mm Vuren FSC',
  '2 1507 mm 2/2',
], 'gesplitste-productregel.pdf');
assert.deepEqual(signatures(splitProductDescription), [expectedOutput('36x70|1507|2||1507 Wit')]);

verifyPdfVariant({
  name: 'W25-0284-04_K61-1031+1033+Vurenhout+FSC+bestellijst.pdf',
  lines: [
    'VUR RUW 050x100 willekeurige productomschrijving Spouwlat 46x88 mm (onder LR doorloper)',
    '26 562 mm 2/C1-30 4/C1-30-T-ZW',
    '26 14.612 m1',
    'VUR RUW 063x125 opnieuw andere vrije tekst Spouwlat 59x113 Vuren FSC',
    '52 2495 mm 4/C1-30 8/C1-30-T-ZW',
    '26 680 mm 2/C1-30 4/C1-30-T-ZW',
    '78 147.420 m1',
    'VUR SLS 038x120 FSC Spouwlat 38x103 mm (onder LR dorpel) Vuren SLS FSC',
    '26 716 mm 2/C1-30 4/C1-30-T-ZW',
  ],
  expected: [
    '46x88|562|26||562',
    '59x113|2495|52||2495',
    '59x113|680|26||680',
    '38x103|716|26||716',
  ],
});

verifyPdfVariant({
  name: 'W26-0056-21_K61-1031+1033+Vurenhout+FSC+bestellijst.pdf',
  lines: [
    'VUR RUW 050x150 Stel 60x89 Vuren FSC', '2 2449 mm 1/K1 1/K1s',
    'VUR RUW 050x150 Stel 44x127A Vuren FSC', '56 2449 mm 1/K1 1/K1s',
    'VUR RUW 050x150 Stel 50x89 Vuren FSC', '4 2449 mm 2/K2 2/K2s',
    'VUR RUW 050x150 Stel 49x89 Vuren FSC', '2 2449 mm 1/K2 1/K2s',
    'VUR RUW 050x150 Stel 44x127B Vuren FSC',
    '2 4694 mm 1/Ba 1/Be', '1 4629 mm 1/Bd', '2 2924 mm 2/Da', '3 2834 mm 1/Db 2/Dd',
    '6 1904 mm 3/P 3/Cb', '11 964 mm 1/N 10/Aa', '1 929 mm 1/Ac',
    'VUR RUW 050x225 Stel 44x210 Vuren FSC',
    '2 4606 mm 1/Ba 1/Be', '1 4541 mm 1/Bd', '2 3240 mm 1/K2 1/K2s', '1 2746 mm 1/Db', '2 1200 mm 1/K1 1/K1s',
    'VUR RUW 050x225 Stel 44x210 S Vuren FSC',
    '2 2836 mm 2/Da', '2 2746 mm 2/Dd', '6 1816 mm 3/P 3/Cb', '11 876 mm 1/N 10/Aa', '1 841 mm 1/Ac',
    'VUR RUW 063x150 Stel 60x127C Vuren FSC', '2 11995 mm 2/M',
    'VUR RUW 063x150 Stel 50x127 Vuren FSC', '6 2405 mm 2/Ba 2/Bd 2/Be',
    'VUR RUW 063x200 Stel 60x200 Vuren FSC', '1 1386 mm 1/M',
    'VUR RUW 075x250 Stel 44x240 B Vuren FSC', '2 3585 mm 1/K2 1/K2s', '2 1304 mm 1/K1 1/K1s',
    'VUR SLS 038x235 FSC ST-RH Vuren 38 x 210 Vuren SLS FSC', '2 3453 mm 1/K2 1/K2s', '2 1304 mm 1/K1 1/K1s', '8 123 mm 2/K1 2/K1s',
    'VUR SLS 038x235 FSC ST-VH Vuren 38 x 210 Vuren SLS FSC', '14 123 mm 2/K1 2/K1s',
    'Schoor 021x048 schuin Schoor 021x048 schuin 1000 mm', '48 1/K1 1/K1s 1/N',
    'Schoor 021x048 schuin1 Schoor 021x048 schuin 1500 mm', '4 2/K2 2/K2s',
    'VUR RUW 021x048S vuren ruw 021x048 mm FSC Stelkozijnen Vuren',
    '2 3240 mm 1/K2 1/K2s', '3 2836 mm 1/Be 2/Da', '3 2746 mm 1/Db 2/Dd', '1 2733 mm 1/Bd',
    '1 2690 mm 1/Ba', '21 2405 mm 2/K2 2/K2s', '7 1816 mm 3/P 1/Ba 3/Cb', '1 1708 mm 1/Bd',
    '1 1670 mm 1/Be', '2 1200 mm 1/K1 1/K1s', '11 876 mm 1/N 10/Aa', '1 841 mm 1/Ac',
  ],
  expected: [
    '60x89|2449|2||2449 Wit', '44x127|2449|56|A|2449 A Wit', '50x89|2449|4||2449 Wit', '49x89|2449|2||2449 Wit',
    '44x127|4694|2|B|4694 B Wit', '44x127|4629|1|B|4629 B Wit', '44x127|2924|2|B|2924 B Wit',
    '44x127|2834|3|B|2834 B Wit', '44x127|1904|6|B|1904 B Wit', '44x127|964|11|B|964 B Wit', '44x127|929|1|B|929 B Wit',
    '44x210|4606|2||4606 Wit', '44x210|4541|1||4541 Wit', '44x210|3240|2||3240 Wit', '44x210|2746|1||2746 Wit', '44x210|1200|2||1200 Wit',
    '44x210|2836|2|S|2836 S Wit', '44x210|2746|2|S|2746 S Wit', '44x210|1816|6|S|1816 S Wit', '44x210|876|11|S|876 S Wit', '44x210|841|1|S|841 S Wit',
    '60x127|11995|2|C|11995 C Wit', '50x127|2405|6||2405 Wit', '60x200|1386|1||1386 Wit',
    '44x240|3585|2|B|3585 B Wit', '44x240|1304|2|B|1304 B Wit',
    '38x210|3453|2||3453 Wit', '38x210|1304|2||1304 Wit', '38x210|123|8||123 Wit', '38x210|123|14||123 Wit',
    '21x48|1000|48|schuin|1000 schuin', '21x48|1500|4|schuin|1500 schuin',
    '21x48|3240|2||3240', '21x48|2836|3||2836', '21x48|2746|3||2746', '21x48|2733|1||2733',
    '21x48|2690|1||2690', '21x48|2405|21||2405', '21x48|1816|7||1816', '21x48|1708|1||1708',
    '21x48|1670|1||1670', '21x48|1200|2||1200', '21x48|876|11||876', '21x48|841|1||841',
  ],
});

verifyPdfVariant({
  name: 'W25-0257_K61-1031+1033+Vurenhout+FSC+bestellijst.pdf',
  lines: [
    'Schoor 021x048 schuin Schoor 021x048 schuin 1000 mm Hans Oude',
    '51 4/12-RA 4/12-RB 4/12-RC',
    '51',
    'Schoor 021x048 schuin1 Schoor 021x048 schuin 1500 mm Hans Oude',
    '4 2/12-RZ 2/13-RZ',
    '4',
  ],
  expected: [
    '21x48|1000|51|schuin|1000 schuin',
    '21x48|1500|4|schuin|1500 schuin',
  ],
});

const completeRecognition = parseTextLines([
  'Project: W27-0001 Offerte: O27-0001 Opdrachtgever: Testbouw BV',
  'VUR RUW 050×075',
  'toekomstige vrije omschrijving verdeeld over meerdere regels',
  'netto maat 36×70 (B) mm Vuren FSC',
  '2 1507 mm 2/2',
  '2 3.014 m1',
], 'volledig-herkend.pdf');
assert.deepEqual(signatures(completeRecognition), ['36x70|1507|2|Model B, WIT|1507 Model B, WIT']);
assert.equal(formatProfile('A'), 'Model A, WIT');
assert.equal(formatProfile('Model B, WIT'), 'Model B, WIT');
assert.equal(formatProfile(''), 'WIT');
assert.equal(completeRecognition.recognitionStatus, 'complete');
assert.deepEqual(completeRecognition.qualityIssues, []);

const reviewRecognition = parseTextLines([
  'VUR RUW 050x075 Vulhout Vuren 36x70 mm Vuren FSC',
  '2 1507 mm 2/2',
  '2 3.014 m1',
], 'metadata-ontbreekt.pdf');
assert.equal(reviewRecognition.recognitionStatus, 'review');

const mismatchedTotal = parseTextLines([
  'Project: W27-0002 Offerte: O27-0002 Opdrachtgever: Testbouw BV',
  'VUR RUW 050x075 Vulhout Vuren 36x70 mm Vuren FSC',
  '2 1507 mm 2/2',
  '3 4.521 m1',
], 'afwijkend-totaal.pdf');
assert.equal(mismatchedTotal.recognitionStatus, 'incomplete');
assert.match(mismatchedTotal.qualityIssues[0], /3 stuks vermeld, 2 uitgelezen/);

const missingQuantities = parseTextLines([
  'Project: W27-0003 Offerte: O27-0003 Opdrachtgever: Testbouw BV',
  'VUR RUW 050x075 Vulhout Vuren 36x70 mm Vuren FSC',
  'VUR RUW 050x100 Vulhout Vuren 44x92 mm Vuren FSC',
  '2 1507 stuks 2/2',
  '4x1500 mm 4/3',
  '3 stuks 1200 mm 3/4',
], 'ontbrekende-aantallen.pdf');
assert.equal(missingQuantities.recognitionStatus, 'incomplete');
assert.equal(missingQuantities.unrecognizedLines[0], '2 1507 stuks 2/2');
assert.equal(missingQuantities.unrecognizedLines.length, 3);
assert.ok(missingQuantities.qualityIssues.some((issue) => issue.includes('36x70 heeft geen herkende aantallen')));
assert.ok(missingQuantities.qualityIssues.some((issue) => issue.includes('Mogelijke aantallenregel bij 44x92')));

console.log('Parserregressies voor 5 PDF-varianten en betrouwbaarheidscontroles geslaagd.');
