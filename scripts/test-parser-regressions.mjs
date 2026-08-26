import assert from 'node:assert/strict';
import { parseTextLines } from '../lib/pdf-parser.ts';

const dynamicDescription = parseTextLines([
  'VUR RUW 050x100 willekeurige productomschrijving 46x88 mm (onder LR doorloper)',
  '26 562 mm 2/C1-30 4/C1-30-T-ZW',
  '26 14.612 m1',
  'VUR RUW 063x125 opnieuw andere vrije tekst 59x113 Vuren FSC',
  '52 2495 mm 4/C1-30 8/C1-30-T-ZW',
  '26 680 mm 2/C1-30 4/C1-30-T-ZW',
  '78 147.420 m1',
], 'W25-0284-04_bestellijst.pdf');

assert.deepEqual(
  dynamicDescription.rows.map(({ breedte, hoogte, lengte, aantal, profiel, nummer }) => ({ breedte, hoogte, lengte, aantal, profiel, nummer })),
  [
    { breedte: 46, hoogte: 88, lengte: 562, aantal: 26, profiel: '', nummer: '562 Wit' },
    { breedte: 59, hoogte: 113, lengte: 2495, aantal: 52, profiel: '', nummer: '2495 Wit' },
    { breedte: 59, hoogte: 113, lengte: 680, aantal: 26, profiel: '', nummer: '680 Wit' },
  ],
);

const profiledProduct = parseTextLines([
  'VUR RUW 050x150 Stel 44x127A Vuren FSC',
  '56 2449 mm 1/K1 1/K1s',
  '56 137.144 m1',
], 'profiel.pdf');

assert.equal(profiledProduct.rows.length, 1);
assert.deepEqual(
  { breedte: profiledProduct.rows[0].breedte, hoogte: profiledProduct.rows[0].hoogte, profiel: profiledProduct.rows[0].profiel },
  { breedte: 44, hoogte: 127, profiel: 'A' },
);

console.log('Parserregressies geslaagd.');
