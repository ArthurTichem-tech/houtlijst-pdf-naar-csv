# Houtlijst

Installeerbare webapp die houtbestellijsten volledig lokaal in de browser uitleest, laat controleren en als CSV exporteert.

## Werkwijze

1. Voeg één of meerdere PDF-bestellijsten toe.
2. De app leest project, offerte, opdrachtgever en netto houtregels uit.
3. Bekijk elk toegevoegd PDF-bestand afzonderlijk en verwijder bestanden die niet meer nodig zijn.
4. Controleer en bewerk de gevonden gegevens per PDF. Alle getoonde teksten en cijfers zijn rechtstreeks aanklikbaar en aanpasbaar.
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

## Windows-app en automatische updates

De Windows-versie werkt volledig lokaal en wordt als normale `.exe`-installer via GitHub Releases verspreid. De geïnstalleerde app controleert bij het starten en daarna iedere zes uur op een nieuwere officiële versie. Een gevonden update wordt op de achtergrond gedownload; daarna kan de gebruiker meteen opnieuw starten of de installatie uitstellen.

Een lokale installer bouwen:

```powershell
pnpm run build:desktop
```

De installer en `latest.yml` komen in de map `release`.

Een officiële update publiceren:

1. Open op GitHub **Actions** → **Publiceer Windows-app**.
2. Kies **Run workflow** op de `main`-branch.
3. Vul een hoger versienummer in, bijvoorbeeld `1.0.1`.
4. De workflow test de parser, bouwt de installer en publiceert automatisch een GitHub Release.

Gebruikers met een oudere geïnstalleerde versie ontvangen die release vervolgens automatisch. Voor distributie buiten een kleine interne groep is Windows-codeondertekening sterk aanbevolen. Voeg daarvoor de GitHub Secrets `WINDOWS_CERTIFICATE` en `WINDOWS_CERTIFICATE_PASSWORD` toe; zonder certificaat kan Windows SmartScreen bij de eerste installatie waarschuwen.
