# Houtlijst

Installeerbare webapp die houtbestellijsten volledig lokaal in de browser uitleest, laat controleren en als CSV exporteert.

## Werkwijze

1. Voeg één of meerdere PDF-bestellijsten toe.
2. De app leest project, offerte, opdrachtgever en netto houtregels uit.
3. Bekijk elk toegevoegd PDF-bestand afzonderlijk en verwijder bestanden die niet meer nodig zijn.
4. Controleer en bewerk de gevonden gegevens per PDF.
5. Exporteer één afzonderlijke CSV per PDF. De bestandsnaam begint met `Ter Harmsel`, gevolgd door project, offerte en opdrachtgever.

De app gebruikt OCR voor de visuele projectkop. PDF's en uitgelezen gegevens worden niet naar een externe dienst gestuurd.

## Lokaal ontwikkelen

```powershell
pnpm install
pnpm run dev
```

## Controleren

```powershell
pnpm run build
```

## GitHub Pages

De applicatie is beschikbaar op [arthurtichem-tech.github.io/houtlijst-pdf-naar-csv](https://arthurtichem-tech.github.io/houtlijst-pdf-naar-csv/).

Elke wijziging op de `main`-branch wordt via GitHub Actions automatisch als GitHub Page gepubliceerd. De workflow staat in `.github/workflows/deploy-pages.yml`.

De bestaande Sites-publicatie kan daarnaast met `pnpm run build` worden bijgewerkt. Gebruikers van de geïnstalleerde webapp ontvangen bijgewerkte bestanden automatisch via de service worker.
