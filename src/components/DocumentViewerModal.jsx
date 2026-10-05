import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

function parseZipEntries(buffer) {
  try {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    let offset = 0;
    const files = [];

    while (offset < bytes.length - 30) {
      if (
        bytes[offset] === 0x50 &&
        bytes[offset + 1] === 0x4b &&
        bytes[offset + 2] === 0x03 &&
        bytes[offset + 3] === 0x04
      ) {
        const compression = view.getUint16(offset + 8, true);
        const compressedSize = view.getUint32(offset + 18, true);
        const uncompressedSize = view.getUint32(offset + 22, true);
        const fileNameLen = view.getUint16(offset + 26, true);
        const extraLen = view.getUint16(offset + 28, true);

        const nameBytes = bytes.subarray(offset + 30, offset + 30 + fileNameLen);
        const name = new TextDecoder('utf-8').decode(nameBytes);
        const dataOffset = offset + 30 + fileNameLen + extraLen;
        const fileData = bytes.subarray(dataOffset, dataOffset + compressedSize);

        files.push({
          name,
          compression,
          compressedSize,
          uncompressedSize,
          fileData,
        });

        offset = dataOffset + compressedSize;
      } else {
        offset++;
      }
    }
    return files;
  } catch {
    return [];
  }
}

async function decompressDeflateRaw(compressedBytes) {
  try {
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(compressedBytes);
    writer.close();
    const response = new Response(ds.readable);
    return await response.text();
  } catch {
    try {
      const ds = new DecompressionStream('deflate');
      const writer = ds.writable.getWriter();
      writer.write(compressedBytes);
      writer.close();
      const response = new Response(ds.readable);
      return await response.text();
    } catch {
      return null;
    }
  }
}

const TEXT_EXTENSIONS_SET = new Set([
  'txt', 'json', 'csv', 'md', 'html', 'htm', 'js', 'jsx', 'ts', 'tsx',
  'css', 'xml', 'log', 'sql', 'rtf', 'yaml', 'yml', 'env', 'sh', 'bat'
]);

function useCopyText(text) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return [copied, handleCopy];
}

function extractDocxTextFromXml(xmlString) {
  if (!xmlString) return '';
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    const paragraphs = xmlDoc.getElementsByTagName('w:p');
    const lines = [];

    for (const paragraph of paragraphs) {
      const textNodes = paragraph.getElementsByTagName('w:t');
      let pText = '';
      for (const node of textNodes) {
        pText += node.textContent || '';
      }
      if (pText.trim()) {
        lines.push(pText.trim());
      }
    }

    if (lines.length > 0) {
      return lines.join('\n\n');
    }
  } catch {}

  return xmlString
    .replace(/<w:p[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n[ \t]*\n/g, '\n\n')
    .trim();
}

function ZipViewerCard({ entries, fileName, fileSize, fileUrl }) {
  const readableEntries = entries.filter(e => !e.name.endsWith('/'));
  const firstWithContent = readableEntries.findIndex(e => e.content);
  const [selectedIdx, setSelectedIdx] = useState(Math.max(0, firstWithContent));

  const selectedFile = readableEntries[selectedIdx] || null;

  return (
    <div className="bg-white border rounded-xl overflow-hidden shadow-sm my-4" style={{ border: '1px solid #cbd5e1', borderRadius: '12px' }}>
      <div className="bg-slate-100 p-4 border-b d-flex justify-between items-center flex-wrap gap-2" style={{ backgroundColor: '#f8fafc', padding: '14px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="text-base font-extrabold text-slate-800 mb-0" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{fileName}</h3>
          <span className="text-xs text-muted" style={{ color: '#64748b', fontSize: '0.8rem' }}>ZIP Archive Package · {readableEntries.length} files inside ({fileSize || 'Archive'})</span>
        </div>
        {fileUrl && (
          <a
            href={fileUrl}
            download={fileName}
            className="ui-btn ui-btn-primary ui-btn-sm d-inline-flex items-center gap-1.5 text-decoration-none"
            style={{ padding: '6px 14px', textDecoration: 'none', fontSize: '0.8rem' }}
          >
            Download Original Zip
          </a>
        )}
      </div>

      <div className="grid-2col p-0" style={{ display: 'grid', gridTemplateColumns: readableEntries.length > 1 ? '240px 1fr' : '1fr', minHeight: '400px' }}>
        {readableEntries.length > 1 && (
          <div className="border-r p-3 bg-slate-50 overflow-y-auto" style={{ borderRight: '1px solid #e2e8f0', backgroundColor: '#f8fafc', maxHeight: '500px', padding: '12px' }}>
            <div className="text-xs font-bold text-slate-500 uppercase mb-2" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>Files inside Zip Archive:</div>
            <div className="d-flex flex-col gap-1" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {readableEntries.map((entry, idx) => (
                <button
                  key={entry.name}
                  type="button"
                  onClick={() => setSelectedIdx(idx)}
                  className={`text-left p-2 rounded text-xs font-mono w-full text-truncate border ${selectedIdx === idx ? 'bg-indigo-50 text-indigo-700 font-bold border-indigo-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                  style={{
                    border: '1px solid #cbd5e1',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    backgroundColor: selectedIdx === idx ? '#e0e7ff' : '#ffffff',
                    color: selectedIdx === idx ? '#4338ca' : '#334155',
                    fontWeight: selectedIdx === idx ? 700 : 400
                  }}
                >
                  {entry.name.split('/').pop() || entry.name}

                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 overflow-y-auto max-h-96" style={{ backgroundColor: '#0f172a', color: '#f8fafc', padding: '16px', maxHeight: '500px', overflowY: 'auto' }}>
          {selectedFile ? (
            <div>
              <div className="d-flex justify-between items-center mb-3 pb-2 border-b border-slate-700" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '8px', marginBottom: '12px' }}>
                <span className="text-xs font-mono font-bold text-emerald-400" style={{ color: '#34d399', fontSize: '0.85rem', fontFamily: 'monospace' }}>{selectedFile.name}</span>
                <span className="text-xs text-slate-400" style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{selectedFile.size ? `${(selectedFile.size / 1024).toFixed(1)} KB` : ''}</span>
              </div>
              <pre style={{ fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap', margin: 0, color: '#e2e8f0', lineHeight: '1.5' }}>
                {selectedFile.content || `[Binary Content: ${selectedFile.name}]`}
              </pre>
            </div>
          ) : (
            <div className="text-center text-slate-400 p-8">Select a file on the left to view its content.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocxViewerCard({ text, fileName, fileUrl }) {
  const [copied, handleCopy] = useCopyText(text);

  return (
    <div className="doc-paper-view-container">
      <div className="doc-paper-sheet">
        <header className="doc-paper-header d-flex justify-between items-center flex-wrap gap-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="doc-paper-title" style={{ fontSize: '1.4rem', fontWeight: 800 }}>{fileName}</h1>
            <span className="doc-paper-subtitle" style={{ color: '#64748b' }}>Uploaded Document Content</span>
          </div>
          <button type="button" onClick={handleCopy} className="ui-btn ui-btn-secondary ui-btn-xs" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
            {copied ? 'Copied!' : 'Copy Text'}
          </button>
        </header>

        <div className="flex-grow-1 my-4" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
          {text.split('\n\n').map((paragraph, idx) => (
            <p key={`para-${idx}-${paragraph.substring(0, 15)}`} className="doc-paper-sec-text mb-4" style={{ fontSize: '0.95rem', lineHeight: '1.65', color: '#1e293b', marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
              {paragraph}
            </p>
          ))}
        </div>

        {fileUrl && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md d-flex justify-between items-center flex-wrap gap-2 mt-6">
            <span className="text-xs text-muted font-semibold">Attached File: {fileName}</span>
            <a
              href={fileUrl}
              download={fileName}
              className="ui-btn ui-btn-primary ui-btn-sm text-decoration-none"
            >
              Download Original Document
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function TextViewerCard({ text, fileName }) {
  const [copied, handleCopy] = useCopyText(text);

  return (
    <div className="bg-white border rounded-xl overflow-hidden shadow-sm my-4">
      <div className="bg-slate-100 p-3 border-b d-flex justify-between items-center flex-wrap gap-2" style={{ backgroundColor: '#f8fafc', padding: '12px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="text-xs font-mono font-bold text-slate-700">{fileName}</span>
        <button 
          type="button" 
          onClick={handleCopy} 
          className="ui-btn ui-btn-secondary ui-btn-xs"
        >
          {copied ? 'Copied!' : 'Copy Content'}
        </button>
      </div>
      <div className="p-4 overflow-auto max-h-96" style={{ backgroundColor: '#0f172a', color: '#f8fafc', padding: '16px', maxHeight: '500px', overflowY: 'auto' }}>
        <pre style={{ fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap', margin: 0, color: '#e2e8f0', lineHeight: '1.5' }}>
          {text || 'Empty file.'}
        </pre>
      </div>
    </div>
  );
}

async function parseDocxFromResponse(res) {
  try {
    const buffer = await res.arrayBuffer();
    const entries = parseZipEntries(buffer);
    const docXmlEntry = entries.find(e => e.name === 'word/document.xml' || e.name.endsWith('document.xml'));
    if (docXmlEntry) {
      let xmlText = '';
      if (docXmlEntry.compression === 0) {
        xmlText = new TextDecoder('utf-8').decode(docXmlEntry.fileData);
      } else {
        xmlText = await decompressDeflateRaw(docXmlEntry.fileData);
      }
      if (xmlText) {
        const extracted = extractDocxTextFromXml(xmlText);
        if (extracted) {
          return { loading: false, type: 'docx', text: extracted, entries: null };
        }
      }
    }
  } catch {}
  return null;
}

async function parseZipFromResponse(res) {
  try {
    const buffer = await res.arrayBuffer();
    const entries = parseZipEntries(buffer);
    if (entries.length > 0) {
      const fileContents = [];
      for (const entry of entries) {
        if (entry.name.endsWith('/')) continue;
        const subExt = entry.name.split('.').pop().toLowerCase();
        let content = null;
        if (TEXT_EXTENSIONS_SET.has(subExt)) {
          if (entry.compression === 0) {
            content = new TextDecoder('utf-8').decode(entry.fileData);
          } else {
            content = await decompressDeflateRaw(entry.fileData);
          }
        }
        fileContents.push({
          name: entry.name,
          size: entry.uncompressedSize,
          content,
        });
      }
      return { loading: false, type: 'zip', text: null, entries: fileContents };
    }
  } catch {}
  return null;
}

async function fetchDocumentData(url, ext) {
  const res = await fetch(url);
  if (!res.ok) {
    return { loading: false, type: 'error', text: null, entries: null };
  }

  if (ext === 'docx' || ext === 'doc') {
    const docxResult = await parseDocxFromResponse(res);
    if (docxResult) return docxResult;
  }

  if (ext === 'zip' || ext === 'rar' || ext === '7z') {
    const zipResult = await parseZipFromResponse(res);
    if (zipResult) return zipResult;
  }

  if (TEXT_EXTENSIONS_SET.has(ext)) {
    const text = await res.text();
    return { loading: false, type: 'text', text, entries: null };
  }

  try {
    const text = await res.text();
    if (text && !/[\u0000-\u0008\u000E-\u001F]/.test(text.substring(0, 100))) {
      return { loading: false, type: 'text', text, entries: null };
    }
  } catch {}

  return { loading: false, type: 'binary', text: null, entries: null };
}

function DocumentViewerModal({ viewedPdf, setViewedPdf }) {
  const [fileUrl, setFileUrl] = useState(null);
  const [loadedData, setLoadedData] = useState({ loading: false, type: null, text: null, entries: null });

  useEffect(() => {
    if (viewedPdf?.fileName) {
      const baseUrl = typeof window !== 'undefined' && window.API_BASE_URL ? window.API_BASE_URL : 'project-management-production-2612.up.railway.app';
      const url = `${baseUrl}/uploads/${viewedPdf.fileName}`;
      setFileUrl(url);
      setLoadedData({ loading: true, type: null, text: null, entries: null });

      const fileName = viewedPdf.fileName;
      const ext = fileName.split('.').pop().toLowerCase();

      fetchDocumentData(url, ext)
        .then((data) => setLoadedData(data))
        .catch(() => setLoadedData({ loading: false, type: 'error', text: null, entries: null }));
    } else {
      setFileUrl(null);
      setLoadedData({ loading: false, type: null, text: null, entries: null });
    }
  }, [viewedPdf]);

  if (!viewedPdf) return null;

  const displayName = viewedPdf.name || viewedPdf.fileName || "Unnamed Document";
  const ext = viewedPdf.fileName ? viewedPdf.fileName.split('.').pop().toLowerCase() : '';
  const isPdf = ext === 'pdf';
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(ext);
  const isVideo = ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext);
  const userFriendlyFileName = viewedPdf.fileName ? viewedPdf.fileName.substring(viewedPdf.fileName.indexOf('-') + 1) : '';
  const nameForDisplay = userFriendlyFileName || displayName;

  const renderViewportContent = () => {
    if (!viewedPdf.fileName) {
      return (
        <div className="p-8 bg-white border rounded-xl shadow-sm text-center max-w-lg mx-auto my-6" style={{ maxWidth: '540px', margin: '2rem auto' }}>
          <div className="w-16 h-16 rounded-full bg-slate-100 d-flex items-center justify-center mb-4 text-slate-400" style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#94a3b8' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <h3 className="text-xl font-extrabold text-main mb-1">{displayName}</h3>
          <p className="text-sm text-muted mb-0" style={{ color: '#64748b' }}>
            No file has been uploaded for this item yet. Please upload a document file to view its content.
          </p>
        </div>
      );
    }

    if (loadedData.loading) {
      return (
        <div className="p-8 text-center text-slate-500 my-6">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
          <p className="text-sm">Reading document contents...</p>
        </div>
      );
    }

    if (isVideo && fileUrl) {
      return (
        <div className="d-flex justify-center items-center p-4">
          <video 
            src={fileUrl} 
            controls 
            autoPlay
            className="doc-image-preview" 
            style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '12px' }}
          >
            <track kind="captions" src="" label="English" default />
          </video>
        </div>
      );
    }

    if (isImage && fileUrl) {
      return (
        <div className="d-flex justify-center items-center p-4">
          <img 
            src={fileUrl} 
            alt={displayName} 
            className="doc-image-preview" 
            style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '12px' }}
          />
        </div>
      );
    }

    if (isPdf && fileUrl) {
      return (
        <div className="d-flex flex-col gap-4 w-full h-full p-2">
          <object 
            data={fileUrl} 
            type="application/pdf" 
            width="100%" 
            height="650px" 
            className="w-full"
            style={{ borderRadius: '8px', border: '1px solid #cbd5e1' }}
          >
            <iframe 
              src={fileUrl} 
              width="100%" 
              height="650px" 
              className="w-full" 
              title={nameForDisplay} 
            />
          </object>
        </div>
      );
    }

    if (loadedData.type === 'docx' && loadedData.text) {
      return (
        <DocxViewerCard 
          text={loadedData.text}
          fileName={nameForDisplay}
          fileUrl={fileUrl}
        />
      );
    }

    if (loadedData.type === 'zip' && loadedData.entries) {
      return (
        <ZipViewerCard 
          entries={loadedData.entries}
          fileName={nameForDisplay}
          fileSize={viewedPdf.fileSize}
          fileUrl={fileUrl}
        />
      );
    }

    if (loadedData.type === 'text' && loadedData.text !== null) {
      return (
        <TextViewerCard 
          text={loadedData.text}
          fileName={nameForDisplay}
        />
      );
    }

    // Default Binary / Unsupported File Asset Card
    return (
      <div className="p-6 bg-white border rounded-xl shadow-sm d-flex flex-col items-center text-center max-w-lg mx-auto my-6" style={{ maxWidth: '540px', margin: '2rem auto' }}>
        <div className="w-16 h-16 rounded-full bg-indigo-50 d-flex items-center justify-center mb-4 text-indigo-600" style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#4f46e5' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <h3 className="text-xl font-extrabold text-main mb-1">{nameForDisplay}</h3>
        {viewedPdf.fileName && <p className="text-xs text-muted mb-3 font-mono">{viewedPdf.fileName}</p>}
        
        <div className="d-flex items-center gap-2 mb-4 justify-center flex-wrap" style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '1rem' }}>
          <span className="ui-badge ui-badge-purple font-bold">{ext.toUpperCase() || 'FILE'} Document</span>
          {viewedPdf.fileSize && <span className="ui-badge ui-badge-neutral font-bold">{viewedPdf.fileSize}</span>}
        </div>

        {fileUrl && (
          <a
            href={fileUrl}
            download={nameForDisplay}
            className="ui-btn ui-btn-primary ui-btn-lg d-inline-flex items-center gap-2 text-decoration-none"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', textDecoration: 'none' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download File ({viewedPdf.fileSize || ext.toUpperCase()})
          </a>
        )}
      </div>
    );
  };

  return ReactDOM.createPortal(
    <dialog
      className="modal-overlay"
      open
      aria-modal="true"
    >
      <button
        type="button"
        className="modal-backdrop-btn"
        onClick={() => setViewedPdf(null)}
        aria-label="Close modal backdrop"
      />
      <div className="modal-content doc-modal-container">
        <div className="doc-modal-header">
          <div>
            <h2 className="modal-title mb-0">File Preview Reader</h2>
            <span className="text-sm text-muted">File: {nameForDisplay} ({viewedPdf.fileSize || 'File'})</span>
          </div>
          <div className="d-flex items-center gap-2">
            {fileUrl && (
              <a
                href={fileUrl}
                download={nameForDisplay}
                target="_blank"
                rel="noreferrer"
                className="ui-btn ui-btn-primary ui-btn-sm d-inline-flex items-center gap-2 text-decoration-none"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download File
              </a>
            )}
            <button type="button" onClick={() => setViewedPdf(null)} className="ui-btn ui-btn-secondary ui-btn-sm">
              Close Reader
            </button>
          </div>
        </div>

        <div className="doc-preview-viewport">
          {renderViewportContent()}
        </div>
      </div>
    </dialog>,
    document.body
  );
}

export default DocumentViewerModal;
