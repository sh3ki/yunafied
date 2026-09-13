import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Download, FileText, Loader2, X, ZoomIn, ZoomOut } from 'lucide-react';

export interface PreviewFile {
  title: string;
  fileName: string;
  url: string;
}

function getExtension(file: PreviewFile): string {
  return (file.fileName || file.url).split('?')[0].split('.').pop()?.toLowerCase() || '';
}

function getPreviewKind(file: PreviewFile): 'pdf' | 'text' | 'office' | 'image' | 'unsupported' {
  const extension = getExtension(file);
  if (extension === 'pdf') return 'pdf';
  if (['txt', 'csv', 'md'].includes(extension)) return 'text';
  if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(extension)) return 'office';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) return 'image';
  return 'unsupported';
}

function getPdfPagePreviewUrl(url: string, page: number, zoom: number): string {
  try {
    const parsed = new URL(url);
    const uploadPath = '/image/upload/';
    if (!parsed.pathname.includes(uploadPath)) return `${url}#page=${page}&zoom=${zoom}`;
    parsed.pathname = parsed.pathname.replace(uploadPath, `${uploadPath}fl_rasterize,pg_${page},w_${Math.round(1200 * zoom / 100)}/`);
    parsed.pathname = parsed.pathname.replace(/\.pdf(?=$|\/)/i, '.png');
    return parsed.toString();
  } catch {
    return `${url}#page=${page}&zoom=${zoom}`;
  }
}

interface FilePreviewModalProps {
  file: PreviewFile;
  onClose: () => void;
  downloadUrl?: string;
}

export function FilePreviewModal({ file, onClose, downloadUrl = file.url }: FilePreviewModalProps) {
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const kind = useMemo(() => getPreviewKind(file), [file]);
  const pdfUrl = useMemo(() => getPdfPagePreviewUrl(file.url, page, zoom), [file.url, page, zoom]);
  const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  useEffect(() => {
    setPage(1);
    setZoom(100);
    setError(false);
    setLoading(kind !== 'unsupported');
  }, [file, kind]);

  const markLoaded = () => setLoading(false);
  const markError = () => { setLoading(false); setError(true); };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 p-0 sm:p-6 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="assignment-preview-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="bg-white w-full h-full max-w-6xl rounded-none sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 sm:px-4 py-3 border-b bg-white">
          <div className="min-w-0 max-w-full sm:max-w-[45%]"><h2 id="assignment-preview-title" className="font-semibold text-gray-900 truncate">{file.title}</h2><p className="text-xs text-gray-500 truncate">{file.fileName}</p></div>
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 flex-wrap w-full sm:w-auto">
            {kind === 'pdf' && <><button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="p-2 rounded-lg border disabled:opacity-40 hover:bg-gray-50"><ChevronLeft className="h-4 w-4" /></button><span className="text-xs text-gray-600 min-w-14 text-center">Page {page}</span><button aria-label="Next page" onClick={() => setPage((value) => value + 1)} className="p-2 rounded-lg border hover:bg-gray-50"><ChevronRight className="h-4 w-4" /></button><button aria-label="Zoom out" disabled={zoom <= 50} onClick={() => setZoom((value) => Math.max(50, value - 10))} className="p-2 rounded-lg border disabled:opacity-40 hover:bg-gray-50"><ZoomOut className="h-4 w-4" /></button><span className="text-xs text-gray-600">{zoom}%</span><button aria-label="Zoom in" disabled={zoom >= 200} onClick={() => setZoom((value) => Math.min(200, value + 10))} className="p-2 rounded-lg border disabled:opacity-40 hover:bg-gray-50"><ZoomIn className="h-4 w-4" /></button></>}
            <a href={downloadUrl} download={file.fileName} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 text-white px-2.5 sm:px-3 py-2 text-sm hover:bg-indigo-700"><Download className="h-4 w-4" /><span className="hidden xs:inline sm:inline">Download</span></a>
            <button aria-label="Close preview" onClick={onClose} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"><X className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="relative flex-1 min-h-0 bg-slate-100">
          {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/90 text-gray-600"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading preview…</div>}
          {error && <div className="h-full flex items-center justify-center p-6 text-center"><div><AlertCircle className="h-8 w-8 text-rose-500 mx-auto mb-2" /><p className="font-medium text-gray-800">We couldn’t load this preview.</p><p className="text-sm text-gray-600 mt-1">You can download the original file to view it.</p></div></div>}
          {!error && kind === 'unsupported' && <div className="h-full flex items-center justify-center p-6 text-center"><div><FileText className="h-10 w-10 text-indigo-500 mx-auto mb-3" /><p className="font-medium text-gray-800">Preview isn’t available for this file type.</p><p className="text-sm text-gray-600 mt-1">You can download the file to view it.</p></div></div>}
          {!error && kind === 'image' && <div className="h-full overflow-auto flex items-center justify-center p-4"><img src={file.url} alt={file.title} onLoad={markLoaded} onError={markError} className="max-w-full max-h-full object-contain shadow-sm" /></div>}
          {!error && kind === 'pdf' && <div className="h-full overflow-auto flex items-center justify-center p-4"><img src={pdfUrl} alt={`Page ${page} of ${file.title}`} onLoad={markLoaded} onError={markError} className="max-w-none max-h-full object-contain shadow-sm" /></div>}
          {!error && kind === 'office' && <iframe title={`Preview of ${file.title}`} src={officeUrl} onLoad={markLoaded} onError={markError} className="w-full h-full border-0 bg-white" />}
          {!error && kind === 'text' && <iframe title={`Preview of ${file.title}`} src={file.url} onLoad={markLoaded} onError={markError} className="w-full h-full border-0 bg-white" />}
        </div>
      </div>
    </div>
  );
}
