import React, { useState } from 'react';
import { Megaphone, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { AnnouncementItem, UserRole } from '@/app/types/models';

interface CommunicationProps {
  role: UserRole;
  announcements: AnnouncementItem[];
  onCreateAnnouncement: (input: { title: string; content: string }) => Promise<void>;
}

export function Communication({ role, announcements, onCreateAnnouncement }: CommunicationProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });

  const canPost = role === 'teacher' || role === 'admin';

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
    } catch (error: any) {
      toast.error(error.message || 'Failed to post announcement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
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
          <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-gray-800">{item.title}</h3>
              <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{item.content}</p>
            <p className="mt-3 text-xs text-indigo-700 font-medium">Posted by: {item.postedByName}</p>
          </div>
        ))}

        {announcements.length === 0 && <div className="text-center text-gray-400 py-16">No announcements posted yet.</div>}
      </div>

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
