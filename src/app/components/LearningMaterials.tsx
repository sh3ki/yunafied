import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Download, ExternalLink, Eye, FileText, Link as LinkIcon, Loader2, Plus, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/app/services/apiClient';
import { LearningMaterialItem, UserRole } from '@/app/types/models';

function resolveFileUrl(url: string, backendBaseUrl: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${backendBaseUrl}${url}`;
}

function toDownloadUrl(url: string): string {
  if (!url.includes('res.cloudinary.com')) return url;
  return url.replace(/\/upload\/(?!fl_attachment)/, '/upload/fl_attachment/');
}

function getExtension(item: LearningMaterialItem): string {
  const name = item.fileName || item.resourceUrl;
  return name.split('?')[0].split('.').pop()?.toLowerCase() || '';
}

function getPreviewKind(item: LearningMaterialItem): 'pdf' | 'text' | 'office' | 'image' | 'unsupported' | 'link' {
  if (item.materialType === 'link') return 'link';
  const extension = getExtension(item);
  if (extension === 'pdf') return 'pdf';
  if (extension === 'txt') return 'text';
  if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(extension)) return 'office';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) return 'image';
  return 'unsupported';
}

/**
 * Cloudinary can block direct PDF delivery on free/untrusted product environments.
 * Rasterizing the requested page delivers a normal PNG instead, while keeping the
 * original PDF URL unchanged for downloads.
 */
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

interface LearningMaterialsProps { role: UserRole; backendBaseUrl: string; subjectOptions?: string[]; }

export function LearningMaterials({ role, backendBaseUrl, subjectOptions = [] }: LearningMaterialsProps) {
  const canManage = role === 'admin' || role === 'teacher';
  const [rows, setRows] = useState<LearningMaterialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'link' | 'file'>('link');
  const [form, setForm] = useState({ title: '', subject: '', description: '', url: '', file: null as File | null });
  const [previewItem, setPreviewItem] = useState<LearningMaterialItem | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewZoom, setPreviewZoom] = useState(100);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const subjects = useMemo(() => Array.from(new Set([...subjectOptions, ...rows.map((item) => item.subject)])).sort(), [rows, subjectOptions]);

  const load = async () => {
    try { setLoading(true); setRows(await apiClient.listLearningMaterials()); }
    catch (error: any) { toast.error(error.message || 'Failed to load learning materials.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!previewItem) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setPreviewItem(null); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [previewItem]);

  const openPreview = (item: LearningMaterialItem) => {
    const kind = getPreviewKind(item);
    setPreviewItem(item); setPreviewPage(1); setPreviewZoom(100); setPreviewError(false);
    setPreviewLoading(kind === 'pdf' || kind === 'text' || kind === 'office' || kind === 'image');
  };

  const createLink = async () => {
    if (!form.title.trim() || !form.subject.trim() || !form.url.trim()) return toast.error('Title, subject, and URL are required.');
    try {
      setSaving(true);
      const created = await apiClient.createLearningMaterialLink({ title: form.title.trim(), subject: form.subject.trim(), description: form.description.trim() || undefined, url: form.url.trim() });
      setRows((prev) => [created, ...prev]); setForm({ title: '', subject: '', description: '', url: '', file: null }); toast.success('Learning material link added.');
    } catch (error: any) { toast.error(error.message || 'Failed to add material link.'); }
    finally { setSaving(false); }
  };

  const createFile = async () => {
    if (!form.title.trim() || !form.subject.trim() || !form.file) return toast.error('Title, subject, and file are required.');
    try {
      setSaving(true);
      const created = await apiClient.createLearningMaterialFile({ title: form.title.trim(), subject: form.subject.trim(), description: form.description.trim() || undefined, file: form.file });
      setRows((prev) => [created, ...prev]); setForm({ title: '', subject: '', description: '', url: '', file: null }); toast.success('Learning material file uploaded.');
    } catch (error: any) { toast.error(error.message || 'Failed to upload material file.'); }
    finally { setSaving(false); }
  };

  const download = async (item: LearningMaterialItem) => {
    try {
      const blob = await apiClient.downloadLearningMaterial(item.id);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = item.fileName || item.title;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error: any) {
      toast.error(error.message || 'Failed to download this material.');
    }
  };

  const remove = async (id: string) => {
    try { await apiClient.deleteLearningMaterial(id); setRows((prev) => prev.filter((item) => item.id !== id)); if (previewItem?.id === id) setPreviewItem(null); toast.success('Learning material removed.'); }
    catch (error: any) { toast.error(error.message || 'Failed to remove learning material.'); }
  };

  const previewUrl = previewItem ? previewItem.materialType === 'file' ? resolveFileUrl(previewItem.resourceUrl, backendBaseUrl) : previewItem.resourceUrl : '';
  const previewKind = previewItem ? getPreviewKind(previewItem) : null;
  const pdfViewerUrl = getPdfPagePreviewUrl(previewUrl, previewPage, previewZoom);
  // Microsoft’s browser viewer renders Office documents without downloading them first.
  // The original Cloudinary URL is used so access remains tied to the material URL already returned by the API.
  const officeViewerUrl = previewUrl
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}`
    : '';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="materials-header flex items-start justify-between gap-3 mb-6"><div><h1 className="materials-title text-3xl font-bold text-gray-800 flex items-start gap-2"><FileText className="h-7 w-7 text-indigo-600" />Learning Materials</h1><p className="text-gray-500 mt-1">Share and access instructional resources by subject.</p></div></div>
      {canManage && <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-5">
        <div className="flex flex-wrap gap-2 mb-3"><button onClick={() => setMode('link')} className={`px-3 py-1.5 rounded-lg text-sm ${mode === 'link' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Link</button><button onClick={() => setMode('file')} className={`px-3 py-1.5 rounded-lg text-sm ${mode === 'file' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700'}`}>File</button></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"><input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Title" className="border rounded-lg px-3 py-2" /><select value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} className="border rounded-lg px-3 py-2 text-gray-700"><option value="">Select subject</option>{subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select><input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description (optional)" className="border rounded-lg px-3 py-2" />{mode === 'link' ? <input value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} placeholder="https://..." className="md:col-span-2 border rounded-lg px-3 py-2" /> : <input type="file" accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.bmp" onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] || null }))} className="md:col-span-2 border rounded-lg px-3 py-2" />}<button onClick={mode === 'link' ? createLink : createFile} disabled={saving || subjects.length === 0} className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-3 py-2 inline-flex items-center justify-center gap-2 disabled:opacity-60"><Plus className="h-4 w-4" />{saving ? 'Saving…' : 'Add Material'}</button></div>
      </div>}
      {subjects.length > 0 && <div className="mb-4 text-xs text-gray-500">Subjects: {subjects.join(', ')}</div>}
      <div className="space-y-3">
        {loading && <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-10 text-center text-gray-500"><Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />Loading learning materials…</div>}
        {!loading && rows.map((item) => {
          const resolvedUrl = item.materialType === 'file' ? toDownloadUrl(resolveFileUrl(item.resourceUrl, backendBaseUrl)) : item.resourceUrl;
          const extension = item.materialType === 'file' ? getExtension(item).toUpperCase() : 'LINK';
          return <article key={item.id} className="material-card bg-white border border-gray-100 rounded-xl p-4 shadow-sm"><div className="flex flex-col sm:flex-row items-start justify-between gap-4"><div className="material-content min-w-0"><p className="font-semibold text-gray-800 break-words">{item.title}</p><div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 mt-1"><span>{item.subject}</span><span>•</span><span>{item.fileName || (item.materialType === 'link' ? 'External link' : 'File')}</span><span className="rounded-full bg-violet-50 text-violet-700 px-2 py-0.5 font-medium">{extension}</span></div>{item.description ? <p className="text-sm text-gray-700 mt-2">{item.description}</p> : null}<p className="text-xs text-gray-500 mt-2">By {item.createdByName} • {new Date(item.createdAt).toLocaleString()}</p></div><div className="material-actions flex flex-wrap items-center gap-2 shrink-0"><button onClick={() => openPreview(item)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-violet-200 text-violet-700 text-sm hover:bg-violet-50"><Eye className="h-4 w-4" />Preview</button>{item.materialType === 'file' ? <button onClick={() => download(item)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50"><Download className="h-4 w-4" />Download</button> : <a href={resolvedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50"><LinkIcon className="h-4 w-4" />Open</a>}{canManage && <button aria-label={`Delete ${item.title}`} onClick={() => remove(item.id)} className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 text-sm px-2 py-1.5"><Trash2 className="h-4 w-4" /></button>}</div></div></article>;
        })}
        {!loading && rows.length === 0 && <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-10 text-center text-gray-500">No learning materials available yet.</div>}
      </div>
      {previewItem && <div className="fixed inset-0 z-50 bg-slate-950/70 p-2 sm:p-6 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="material-preview-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewItem(null); }}><div className="bg-white w-full h-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col"><div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-white"><div className="min-w-0"><h2 id="material-preview-title" className="font-semibold text-gray-900 truncate">{previewItem.title}</h2><p className="text-xs text-gray-500 truncate">{previewItem.fileName || previewItem.resourceUrl}</p></div><div className="flex items-center gap-2 shrink-0">{previewKind === 'pdf' && <><button aria-label="Previous page" disabled={previewPage <= 1} onClick={() => setPreviewPage((page) => Math.max(1, page - 1))} className="p-2 rounded-lg border disabled:opacity-40 hover:bg-gray-50"><ChevronLeft className="h-4 w-4" /></button><span className="text-xs text-gray-600 min-w-14 text-center">Page {previewPage}</span><button aria-label="Next page" onClick={() => setPreviewPage((page) => page + 1)} className="p-2 rounded-lg border hover:bg-gray-50"><ChevronRight className="h-4 w-4" /></button><button aria-label="Zoom out" disabled={previewZoom <= 50} onClick={() => setPreviewZoom((zoom) => Math.max(50, zoom - 10))} className="p-2 rounded-lg border disabled:opacity-40 hover:bg-gray-50"><ZoomOut className="h-4 w-4" /></button><span className="text-xs text-gray-600">{previewZoom}%</span><button aria-label="Zoom in" disabled={previewZoom >= 200} onClick={() => setPreviewZoom((zoom) => Math.min(200, zoom + 10))} className="p-2 rounded-lg border disabled:opacity-40 hover:bg-gray-50"><ZoomIn className="h-4 w-4" /></button></>}{previewItem.materialType === 'file' && <button onClick={() => download(previewItem)} className="inline-flex items-center gap-1 rounded-lg bg-violet-600 text-white px-3 py-2 text-sm hover:bg-violet-700"><Download className="h-4 w-4" />Download</button>}<button aria-label="Close preview" onClick={() => setPreviewItem(null)} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"><X className="h-5 w-5" /></button></div></div><div className="relative flex-1 min-h-0 bg-slate-100">{previewLoading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/90 text-gray-600"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading preview…</div>}{previewError && <div className="h-full flex items-center justify-center p-6 text-center"><div><AlertCircle className="h-8 w-8 text-rose-500 mx-auto mb-2" /><p className="font-medium text-gray-800">We couldn’t load this preview.</p><p className="text-sm text-gray-600 mt-1">You can download the original file to view it.</p></div></div>}{!previewError && previewKind === 'unsupported' && <div className="h-full flex items-center justify-center p-6 text-center"><div><FileText className="h-10 w-10 text-violet-500 mx-auto mb-3" /><p className="font-medium text-gray-800">Preview isn’t available for this file type.</p><p className="text-sm text-gray-600 mt-1">You can download the file to view it.</p></div></div>}{!previewError && previewKind === 'link' && <div className="h-full flex items-center justify-center p-6 text-center"><div><LinkIcon className="h-10 w-10 text-violet-500 mx-auto mb-3" /><p className="font-medium text-gray-800">This material is an external link.</p><a href={previewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-4 rounded-lg bg-violet-600 text-white px-4 py-2 text-sm hover:bg-violet-700">Open link <ExternalLink className="h-4 w-4" /></a></div></div>}{!previewError && previewKind === 'image' && <div className="h-full overflow-auto flex items-center justify-center p-4"><img src={previewUrl} alt={previewItem.title} onLoad={() => setPreviewLoading(false)} onError={() => { setPreviewLoading(false); setPreviewError(true); }} className="max-w-full max-h-full object-contain shadow-sm" /></div>}{!previewError && previewKind === 'pdf' && <div className="h-full overflow-auto flex items-center justify-center p-4"><img src={pdfViewerUrl} alt={`Page ${previewPage} of ${previewItem.title}`} onLoad={() => setPreviewLoading(false)} onError={() => { setPreviewLoading(false); setPreviewError(true); }} className="max-w-none max-h-full object-contain shadow-sm" /></div>}{!previewError && previewKind === 'office' && <iframe title={`Preview of ${previewItem.title}`} src={officeViewerUrl} onLoad={() => setPreviewLoading(false)} onError={() => { setPreviewLoading(false); setPreviewError(true); }} className="w-full h-full border-0 bg-white" />}{!previewError && previewKind === 'text' && <iframe title={`Preview of ${previewItem.title}`} src={previewUrl} onLoad={() => setPreviewLoading(false)} onError={() => { setPreviewLoading(false); setPreviewError(true); }} className="w-full h-full border-0 bg-white" />}</div></div></div>}
    </div>
  );
}
