'use client';

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from 'react';
import { createCsv } from '@/lib/csv';
import { buildNumber, parsePdf, ParsedDocument, TimberRow } from '@/lib/pdf-parser';

function cleanFilePart(value: string) {
  return value.trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').replace(/\s+/g, ' ').replace(/[. ]+$/g, '') || 'onbekend';
}

function downloadCsv(document: ParsedDocument) {
  const csv = createCsv(document);
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = `Ter Harmsel ${[document.project, document.offerte, document.opdrachtgever].map(cleanFilePart).join(' - ')}.csv`;
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
  const activeDocument = documents.find((document) => document.id === activeId) ?? documents[0];
  const totalItems = useMemo(() => activeDocument?.rows.reduce((sum, row) => sum + Number(row.aantal || 0), 0) ?? 0, [activeDocument]);

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
    if (!activeDocument) return;
    setDocuments((current) => current.map((document) => document.id === activeDocument.id ? { ...document, [field]: value } : document));
  }

  function updateRow(rowId: string, field: keyof TimberRow, value: string) {
    if (!activeDocument) return;
    setDocuments((current) => current.map((document) => {
      if (document.id !== activeDocument.id) return document;
      const rows = document.rows.map((row) => {
        if (row.id !== rowId) return row;
        const next = { ...row, [field]: ['breedte', 'hoogte', 'lengte', 'aantal'].includes(field) ? Number(value) : value } as TimberRow;
        if (['breedte', 'hoogte', 'lengte', 'profiel'].includes(field)) next.nummer = buildNumber(next);
        return next;
      });
      return { ...document, rows };
    }));
  }

  function addRow() {
    if (!activeDocument) return;
    const row: TimberRow = { id: crypto.randomUUID(), nummer: '0 Wit', breedte: 0, hoogte: 0, lengte: 0, aantal: 1, profiel: '', beschrijving: '', omitWhite: false };
    setDocuments((current) => current.map((document) => document.id === activeDocument.id ? { ...document, rows: [...document.rows, row] } : document));
  }

  function removeRow(rowId: string) {
    if (!activeDocument) return;
    setDocuments((current) => current.map((document) => document.id === activeDocument.id ? { ...document, rows: document.rows.filter((row) => row.id !== rowId) } : document));
  }

  function removeDocument(documentId: string) {
    const removedIndex = documents.findIndex((document) => document.id === documentId);
    const remaining = documents.filter((document) => document.id !== documentId);
    setDocuments(remaining);
    if (activeDocument?.id === documentId) {
      setActiveId(remaining[Math.min(removedIndex, remaining.length - 1)]?.id ?? '');
    }
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault(); setDragging(false); processFiles(event.dataTransfer.files);
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="intro">
          <p className="lede">Voeg één of meerdere PDF-bestellijsten toe. Controleer de netto houtmaten en pas ze aan voordat je exporteert.</p>
        </div>

        <input ref={inputRef} className="visually-hidden" type="file" accept="application/pdf,.pdf" multiple onChange={(event: ChangeEvent<HTMLInputElement>) => { if (event.target.files) processFiles(event.target.files); event.target.value = ''; }} />
        <button className={`dropzone ${dragging ? 'dragging' : ''}`} type="button" onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
          <span className="upload-icon">{processing ? '…' : '+'}</span>
          <span className="drop-title">{processing ? 'PDF-bestanden worden uitgelezen' : 'Sleep PDF-bestanden hierheen'}</span>
          <span className="drop-subtitle">{processing ? 'Even geduld, de gegevens blijven lokaal.' : 'of klik om bestanden te kiezen'}</span>
          <span className="file-types">PDF · ieder bestand krijgt een eigen CSV</span>
        </button>
        {message && <p className="app-message" role="alert">{message}</p>}

        {documents.length > 0 && <section className="document-list" aria-labelledby="document-list-title">
          <div className="document-list-heading"><h2 id="document-list-title">Toegevoegde PDF&apos;s</h2><span>{documents.length} {documents.length === 1 ? 'bestand' : 'bestanden'}</span></div>
          <ul>{documents.map((document) => <li key={document.id} className={document.id === activeDocument.id ? 'active' : ''}>
            <button className="document-select" type="button" onClick={() => setActiveId(document.id)} aria-pressed={document.id === activeDocument.id}>
              <span className="document-icon">PDF</span>
              <span className="document-name"><strong>{document.fileName}</strong><small>{document.project || 'Project onbekend'} · {document.rows.length} regels · eigen CSV</small></span>
              <span className="document-state">{document.id === activeDocument.id ? 'Geselecteerd' : 'Bekijken'}</span>
            </button>
            <button className="document-remove" type="button" onClick={() => removeDocument(document.id)} aria-label={`${document.fileName} verwijderen`}>Verwijderen</button>
          </li>)}</ul>
        </section>}

        {activeDocument && <section className="review-panel" aria-label="Controle van uitgelezen gegevens">
          <div className="panel-heading">
            <div><p className="eyebrow">Controleer vóór export</p><h2>{activeDocument.project || 'Project onbekend'}</h2><p>{activeDocument.fileName}</p></div>
            <span className="status"><i />{activeDocument.rows.length} regels gevonden</span>
          </div>

          <div className="edit-hint"><span aria-hidden="true">✎</span><p><strong>Alle gegevens zijn aanpasbaar.</strong> Klik op een tekst of getal hieronder om het zelf te wijzigen.</p></div>

          <div className="metadata-grid">
            <label><span>Project</span><input value={activeDocument.project} onChange={(event) => updateMeta('project', event.target.value)} /></label>
            <label><span>Offerte</span><input value={activeDocument.offerte} onChange={(event) => updateMeta('offerte', event.target.value)} /></label>
            <label><span>Opdrachtgever</span><input value={activeDocument.opdrachtgever} onChange={(event) => updateMeta('opdrachtgever', event.target.value)} /></label>
          </div>

          {activeDocument.warnings.length > 0 && <div className="warning-list">{activeDocument.warnings.map((warning) => <p key={warning}>Controle nodig: {warning}</p>)}</div>}

          <div className="table-wrap"><table><thead><tr><th>Nummer</th><th>Breedte</th><th>Hoogte</th><th>Lengte</th><th>Aantal</th><th>Profiel</th><th>Beschrijving</th><th aria-label="Acties" /></tr></thead><tbody>
            {activeDocument.rows.map((row) => <tr key={row.id}>
              {(['nummer', 'breedte', 'hoogte', 'lengte', 'aantal', 'profiel', 'beschrijving'] as const).map((field) => <td key={field}><input aria-label={`${field} van ${row.nummer}`} value={row[field]} inputMode={['breedte', 'hoogte', 'lengte', 'aantal'].includes(field) ? 'numeric' : 'text'} onChange={(event) => updateRow(row.id, field, event.target.value)} /></td>)}
              <td><button className="row-menu" type="button" onClick={() => removeRow(row.id)} aria-label={`Regel ${row.nummer} verwijderen`}>×</button></td>
            </tr>)}
          </tbody></table></div>

          <footer className="panel-footer"><p><strong>{totalItems}</strong> stuks <span>·</span> <strong>{activeDocument.rows.length}</strong> maatregels</p><div className="footer-actions"><button className="secondary-button" type="button" onClick={addRow}>+ Regel toevoegen</button><button className="export-button" type="button" disabled={!activeDocument.rows.length} onClick={() => downloadCsv(activeDocument)}>CSV van deze PDF exporteren <span>→</span></button></div></footer>
        </section>}
      </section>
    </main>
  );
}
