'use client';

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from 'react';
import { buildNumber, parsePdf, ParsedDocument, TimberRow } from '@/lib/pdf-parser';

const demoRows: TimberRow[] = [
  { id: 'demo-1', nummer: '2449 Wit', breedte: 60, hoogte: 89, lengte: 2449, aantal: 2, profiel: '' },
  { id: 'demo-2', nummer: '2449 A Wit', breedte: 44, hoogte: 127, lengte: 2449, aantal: 56, profiel: 'A' },
  { id: 'demo-3', nummer: '4694 B Wit', breedte: 44, hoogte: 127, lengte: 4694, aantal: 2, profiel: 'B' },
  { id: 'demo-4', nummer: '1000 schuin', breedte: 21, hoogte: 48, lengte: 1000, aantal: 48, profiel: 'schuin' },
];

const demoDocument: ParsedDocument = {
  id: 'demo', fileName: 'voorbeeld.pdf', project: 'W26-0056-21', offerte: 'O25-0271',
  opdrachtgever: 'Vastbouw BV', rows: demoRows, warnings: [],
};

function cleanFilePart(value: string) {
  return value.trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').replace(/\s+/g, ' ').replace(/[. ]+$/g, '') || 'onbekend';
}

function csvValue(value: string | number) {
  const text = String(value ?? '');
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadCsv(document: ParsedDocument) {
  const headers = ['Nummer', 'Breedte', 'Hoogte', 'Lengte', 'Aantal', 'Profiel'];
  const rows = document.rows.map((row) => [row.nummer, row.breedte, row.hoogte, row.lengte, row.aantal, row.profiel]);
  const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvValue).join(';')).join('\r\n')}\r\n`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = `${[document.project, document.offerte, document.opdrachtgever].map(cleanFilePart).join(' - ')}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<ParsedDocument[]>([]);
  const [activeId, setActiveId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState('');
  const activeDocument = documents.find((document) => document.id === activeId) ?? documents[0] ?? demoDocument;
  const isDemo = documents.length === 0;
  const totalItems = useMemo(() => activeDocument.rows.reduce((sum, row) => sum + Number(row.aantal || 0), 0), [activeDocument]);

  async function processFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    if (!files.length) { setMessage('Kies één of meerdere PDF-bestanden.'); return; }
    setProcessing(true); setMessage('');
    const parsed: ParsedDocument[] = [];
    let failed = false;
    for (const file of files) {
      try { parsed.push(await parsePdf(file, setMessage)); }
      catch (error) { failed = true; setMessage(`${file.name} kon niet worden uitgelezen: ${error instanceof Error ? error.message : 'onbekende fout'}`); }
    }
    if (parsed.length) {
      setDocuments((current) => [...current, ...parsed]);
      setActiveId(parsed[0].id);
    }
    setProcessing(false);
    if (!failed) setMessage('');
  }

  function updateMeta(field: 'project' | 'offerte' | 'opdrachtgever', value: string) {
    setDocuments((current) => current.map((document) => document.id === activeDocument.id ? { ...document, [field]: value } : document));
  }

  function updateRow(rowId: string, field: keyof TimberRow, value: string) {
    setDocuments((current) => current.map((document) => {
      if (document.id !== activeDocument.id) return document;
      const rows = document.rows.map((row) => {
        if (row.id !== rowId) return row;
        const next = { ...row, [field]: ['breedte', 'hoogte', 'lengte', 'aantal'].includes(field) ? Number(value) : value } as TimberRow;
        if (field !== 'nummer') next.nummer = buildNumber(next);
        return next;
      });
      return { ...document, rows };
    }));
  }

  function addRow() {
    const row: TimberRow = { id: crypto.randomUUID(), nummer: '0 Wit', breedte: 0, hoogte: 0, lengte: 0, aantal: 1, profiel: '' };
    setDocuments((current) => current.map((document) => document.id === activeDocument.id ? { ...document, rows: [...document.rows, row] } : document));
  }

  function removeRow(rowId: string) {
    setDocuments((current) => current.map((document) => document.id === activeDocument.id ? { ...document, rows: document.rows.filter((row) => row.id !== rowId) } : document));
  }

  function exportAll() {
    documents.forEach((document, index) => window.setTimeout(() => downloadCsv(document), index * 180));
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault(); setDragging(false); processFiles(event.dataTransfer.files);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Houtlijst startpagina"><span className="brand-mark">H</span><span><strong>Houtlijst</strong><small>PDF naar CSV</small></span></a>
        <div className="privacy-note"><span />Verwerking gebeurt op deze computer</div>
      </header>

      <section className="workspace">
        <div className="intro">
          <p className="eyebrow">Nieuwe omzetting</p>
          <h1>Van bestellijst naar een<br />controleerbare CSV.</h1>
          <p className="lede">Voeg één of meerdere PDF-bestellijsten toe. Controleer de netto houtmaten en pas ze aan voordat je exporteert.</p>
        </div>

        <input ref={inputRef} className="visually-hidden" type="file" accept="application/pdf,.pdf" multiple onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.files && processFiles(event.target.files)} />
        <button className={`dropzone ${dragging ? 'dragging' : ''}`} type="button" onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
          <span className="upload-icon">{processing ? '…' : '+'}</span>
          <span className="drop-title">{processing ? 'PDF-bestanden worden uitgelezen' : 'Sleep PDF-bestanden hierheen'}</span>
          <span className="drop-subtitle">{processing ? 'Even geduld, de gegevens blijven lokaal.' : 'of klik om bestanden te kiezen'}</span>
          <span className="file-types">PDF · meerdere bestanden mogelijk</span>
        </button>
        {message && <p className="app-message" role="alert">{message}</p>}

        {documents.length > 1 && <nav className="document-tabs" aria-label="Ingelezen PDF-bestanden">{documents.map((document) => <button key={document.id} type="button" className={document.id === activeDocument.id ? 'active' : ''} onClick={() => setActiveId(document.id)}><span>{document.project || document.fileName}</span><small>{document.rows.length} regels</small></button>)}</nav>}

        <section className={`review-panel ${isDemo ? 'demo' : ''}`} aria-label="Controle van uitgelezen gegevens">
          <div className="panel-heading">
            <div><p className="eyebrow">{isDemo ? 'Voorbeeldweergave' : 'Controleer vóór export'}</p><h2>{activeDocument.project || 'Project onbekend'}</h2><p>{activeDocument.fileName}</p></div>
            <span className="status"><i />{activeDocument.rows.length} regels gevonden</span>
          </div>

          {!isDemo && <div className="metadata-grid">
            <label><span>Project</span><input value={activeDocument.project} onChange={(event) => updateMeta('project', event.target.value)} /></label>
            <label><span>Offerte</span><input value={activeDocument.offerte} onChange={(event) => updateMeta('offerte', event.target.value)} /></label>
            <label><span>Opdrachtgever</span><input value={activeDocument.opdrachtgever} onChange={(event) => updateMeta('opdrachtgever', event.target.value)} /></label>
          </div>}

          {activeDocument.warnings.length > 0 && <div className="warning-list">{activeDocument.warnings.map((warning) => <p key={warning}>Controle nodig: {warning}</p>)}</div>}

          <div className="table-wrap"><table><thead><tr><th>Nummer</th><th>Breedte</th><th>Hoogte</th><th>Lengte</th><th>Aantal</th><th>Profiel</th><th aria-label="Acties" /></tr></thead><tbody>
            {activeDocument.rows.map((row) => <tr key={row.id}>
              {(['nummer', 'breedte', 'hoogte', 'lengte', 'aantal', 'profiel'] as const).map((field) => <td key={field}><input aria-label={`${field} van ${row.nummer}`} value={row[field]} readOnly={isDemo} inputMode={['breedte', 'hoogte', 'lengte', 'aantal'].includes(field) ? 'numeric' : 'text'} onChange={(event) => updateRow(row.id, field, event.target.value)} /></td>)}
              <td><button className="row-menu" type="button" disabled={isDemo} onClick={() => removeRow(row.id)} aria-label={`Regel ${row.nummer} verwijderen`}>×</button></td>
            </tr>)}
          </tbody></table></div>

          <footer className="panel-footer"><p><strong>{totalItems}</strong> stuks <span>·</span> <strong>{activeDocument.rows.length}</strong> maatregels</p><div className="footer-actions">{!isDemo && <button className="secondary-button" type="button" onClick={addRow}>+ Regel toevoegen</button>}<button className="export-button" type="button" disabled={isDemo || !activeDocument.rows.length} onClick={() => documents.length > 1 ? exportAll() : downloadCsv(activeDocument)}>{documents.length > 1 ? `${documents.length} CSV's exporteren` : 'CSV exporteren'} <span>→</span></button></div></footer>
        </section>
      </section>
    </main>
  );
}
