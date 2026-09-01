import React, { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, FileText, Link as LinkIcon, Plus, Trash2 } from 'lucide-react';

/** Resolve a file URL: absolute URLs (Cloudinary) are used as-is; relative paths get backendBaseUrl prepended. */
function resolveFileUrl(url: string, backendBaseUrl: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${backendBaseUrl}${url}`;
}

/** Force download from Cloudinary by injecting fl_attachment transformation flag. */
function toDownloadUrl(url: string): string {
  if (!url.includes('res.cloudinary.com')) return url;
  return url.replace(/\/upload\/(?!fl_attachment)/, '/upload/fl_attachment/');
}
import { toast } from 'sonner';
import { apiClient } from '@/app/services/apiClient';
import { LearningMaterialItem, UserRole } from '@/app/types/models';

interface LearningMaterialsProps {
  role: UserRole;
  backendBaseUrl: string;
}

export function LearningMaterials({ role, backendBaseUrl }: LearningMaterialsProps) {
  const canManage = role === 'admin' || role === 'teacher';
  const [rows, setRows] = useState<LearningMaterialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'link' | 'file'>('link');
  const [form, setForm] = useState({ title: '', subject: '', description: '', url: '', file: null as File | null });

  const subjects = useMemo(() => {
    const unique = new Set(rows.map((item) => item.subject));
    return Array.from(unique).sort();
  }, [rows]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await apiClient.listLearningMaterials();
      setRows(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load learning materials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createLink = async () => {
    if (!form.title.trim() || !form.subject.trim() || !form.url.trim()) {
      toast.error('Title, subject, and URL are required.');
      return;
    }

    try {
      setSaving(true);
      const created = await apiClient.createLearningMaterialLink({
        title: form.title.trim(),
        subject: form.subject.trim(),
        description: form.description.trim() || undefined,
        url: form.url.trim(),
      });
      setRows((prev) => [created, ...prev]);
      setForm({ title: '', subject: '', description: '', url: '', file: null });
      toast.success('Learning material link added.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add material link.');
    } finally {
      setSaving(false);
    }
  };

  const createFile = async () => {
    if (!form.title.trim() || !form.subject.trim() || !form.file) {
      toast.error('Title, subject, and file are required.');
      return;
    }

    try {
      setSaving(true);
      const created = await apiClient.createLearningMaterialFile({
        title: form.title.trim(),
        subject: form.subject.trim(),
        description: form.description.trim() || undefined,
        file: form.file,
      });
      setRows((prev) => [created, ...prev]);
      setForm({ title: '', subject: '', description: '', url: '', file: null });
      toast.success('Learning material file uploaded.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload material file.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await apiClient.deleteLearningMaterial(id);
      setRows((prev) => prev.filter((item) => item.id !== id));
      toast.success('Learning material removed.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove learning material.');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="materials-header flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="materials-title text-3xl font-bold text-gray-800 flex items-start gap-2">
            <FileText className="h-7 w-7 text-indigo-600" />
            Learning Materials
          </h1>
          <p className="text-gray-500 mt-1">Share and access instructional resources by subject.</p>
        </div>
      </div>

      {canManage && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-5">
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={() => setMode('link')} className={`px-3 py-1.5 rounded-lg text-sm ${mode === 'link' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
              Link
            </button>
            <button onClick={() => setMode('file')} className={`px-3 py-1.5 rounded-lg text-sm ${mode === 'file' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
              File
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Title" className="border rounded-lg px-3 py-2" />
            <input value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Subject" className="border rounded-lg px-3 py-2" />
            <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description (optional)" className="border rounded-lg px-3 py-2" />

            {mode === 'link' ? (
              <input
                value={form.url}
                onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                placeholder="https://..."
                className="md:col-span-2 border rounded-lg px-3 py-2"
              />
            ) : (
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
                onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
                className="md:col-span-2 border rounded-lg px-3 py-2"
              />
            )}

            <button
              onClick={mode === 'link' ? createLink : createFile}
              disabled={saving}
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-3 py-2 inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Add Material
            </button>
          </div>
        </div>
      )}

      {subjects.length > 0 && (
        <div className="mb-4 text-xs text-gray-500">Subjects: {subjects.join(', ')}</div>
      )}

      <div className="space-y-3">
        {rows.map((item) => {
          const resolvedUrl = item.materialType === 'file'
            ? toDownloadUrl(resolveFileUrl(item.resourceUrl, backendBaseUrl))
            : item.resourceUrl;
          return (
            <article key={item.id} className="material-card bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="material-content min-w-0">
                  <p className="font-semibold text-gray-800">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.subject} • {item.materialType === 'file' ? item.fileName || 'File' : 'External Link'}</p>
                  {item.description ? <p className="text-sm text-gray-700 mt-2">{item.description}</p> : null}
                  <p className="text-xs text-gray-500 mt-2">By {item.createdByName} • {new Date(item.createdAt).toLocaleString()}</p>
                </div>

                <div className="material-actions flex items-center gap-2 shrink-0">
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noreferrer"
                    download={item.materialType === 'file' ? (item.fileName || true) : undefined}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50"
                  >
                    {item.materialType === 'link' ? <LinkIcon className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                    {item.materialType === 'file' ? 'Download' : 'Open'}
                  </a>
                  {canManage && (
                    <button onClick={() => remove(item.id)} className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 text-sm px-2 py-1.5">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {rows.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-10 text-center text-gray-500">
            No learning materials available yet.
          </div>
        )}
      </div>
    </div>
  );
}
