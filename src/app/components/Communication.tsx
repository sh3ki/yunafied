import React, { useState } from 'react';
import { Megaphone, Plus, X, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AnnouncementItem, UserRole } from '@/app/types/models';
import { apiClient } from '@/app/services/apiClient';

interface CommunicationProps {
  role: UserRole;
  userId: string;
  announcements: AnnouncementItem[];
  onCreateAnnouncement: (input: { title: string; content: string }) => Promise<void>;
  onAnnouncementsChange?: (updated: AnnouncementItem[]) => void;
}

export function Communication({ role, userId, announcements, onCreateAnnouncement, onAnnouncementsChange }: CommunicationProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });
  const [openAnnouncement, setOpenAnnouncement] = useState<AnnouncementItem | null>(null);
  const [editTarget, setEditTarget] = useState<AnnouncementItem | null>(null);
  const [editForm, setEditForm] = useState({ title: '', content: '' });
  const [editSaving, setEditSaving] = useState(false);

  const canPost = role === 'teacher' || role === 'admin';

  const canManage = (item: AnnouncementItem) =>
    role === 'admin' || item.postedById === userId;

  const handlePost = async () => {
    if (!form.title || !form.content) {
      toast.error('Please complete all fields.');
      return;
    }

    try {
      setSaving(true);
      await onCreateAnnouncement({ title: form.title, content: form.content });
      setForm({ title: '', content: '' });
      setIsModalOpen(false);
      toast.success('Announcement posted.');
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Failed to post announcement.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (item: AnnouncementItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTarget(item);
    setEditForm({ title: item.title, content: item.content });
  };

  const handleEditSave = async () => {
    if (!editTarget || !editForm.title || !editForm.content) return;
    try {
      setEditSaving(true);
      const updated = await apiClient.updateAnnouncement(editTarget.id, editForm);
      onAnnouncementsChange?.(announcements.map((a) => a.id === updated.id ? updated : a));
      setEditTarget(null);
      toast.success('Announcement updated.');
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Failed to update announcement.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (item: AnnouncementItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete announcement "${item.title}"?`)) return;
    try {
      await apiClient.deleteAnnouncement(item.id);
      onAnnouncementsChange?.(announcements.filter((a) => a.id !== item.id));
      toast.success('Announcement deleted.');
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Failed to delete announcement.');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="announcements-header flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Megaphone className="h-7 w-7 text-violet-600" />
            Announcements
          </h1>
          <p className="text-gray-500 mt-1">Post updates and reminders for the community.</p>
        </div>

        {canPost && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus className="h-4 w-4" />
            Post
          </button>
        )}
      </div>

      <div className="space-y-3">
        {announcements.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md hover:border-violet-200 transition group"
            onClick={() => setOpenAnnouncement(item)}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-gray-800 group-hover:text-violet-700 transition">{item.title}</h3>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString()}</span>
                {canManage(item) && (
                  <>
                    <button
                      onClick={(e) => openEdit(item, e)}
                      title="Edit"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(item, e)}
                      title="Delete"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
                <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-violet-500 transition" />
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600 line-clamp-2 whitespace-pre-wrap">{item.content}</p>
            <p className="mt-3 text-xs text-indigo-700 font-medium">Posted by: {item.postedByName}</p>
          </div>
        ))}

        {announcements.length === 0 && <div className="text-center text-gray-400 py-16">No announcements posted yet.</div>}
      </div>

      {/* Announcement Detail Modal */}
      {openAnnouncement && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 pt-16 backdrop-blur-sm" onClick={() => setOpenAnnouncement(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{openAnnouncement.title}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Posted by <span className="text-indigo-700 font-medium">{openAnnouncement.postedByName}</span>
                  {' · '}{new Date(openAnnouncement.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setOpenAnnouncement(null)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-base">{openAnnouncement.content}</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-bold mb-4">Edit Announcement</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 h-36 resize-none"
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setEditTarget(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button disabled={editSaving} onClick={handleEditSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
                {editSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-bold mb-4">Post Announcement</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 h-36 resize-none"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button disabled={saving} onClick={handlePost} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60">
                Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

