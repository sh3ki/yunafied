import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Clock, FileText, Link2, Play, Trash2, Upload, Video } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { apiClient } from '@/app/services/apiClient';
import { VideoSummaryItem, VideoSummaryResponse } from '@/app/types/models';

type ActiveTab = 'summarize' | 'history';

export function VideoSummarizer() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('summarize');
  const [mode, setMode] = useState<'url' | 'upload'>('url');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<VideoSummaryResponse | null>(null);
  const [context, setContext] = useState('');

  // History state
  const [historyItems, setHistoryItems] = useState<VideoSummaryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadHistory = useCallback(async (page = 1) => {
    setIsLoadingHistory(true);
    try {
      const result = await apiClient.listVideoSummaries({ page, pageSize: 10 });
      setHistoryItems(result.rows);
      setHistoryPage(result.page);
      setHistoryTotalPages(result.totalPages);
    } catch {
      toast.error('Failed to load history.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory(historyPage);
    }
  }, [activeTab, historyPage, loadHistory]);

  const handleSummarize = async () => {
    if (mode === 'url' && !videoUrl.trim()) return;
    if (mode === 'upload' && !videoFile) return;

    try {
      setIsSummarizing(true);
      const response = await apiClient.summarizeVideo(
        mode === 'upload'
          ? { videoFile: videoFile as File, context: context.trim() || undefined }
          : { videoUrl: videoUrl.trim(), context: context.trim() || undefined },
      );
      setSummary(response);
    } catch (error: any) {
      toast.error(error.message || 'Failed to summarize video.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const copySummary = async (s: VideoSummaryResponse) => {
    try {
      const exportText = [
        s.title,
        '',
        'Summary:',
        ...s.summary.map((point) => `- ${point}`),
        '',
        'Takeaways:',
        ...s.takeaways.map((point) => `- ${point}`),
      ].join('\n');
      await navigator.clipboard.writeText(exportText);
      toast.success('Summary copied.');
    } catch {
      toast.error('Failed to copy summary.');
    }
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      await apiClient.deleteVideoSummary(id);
      toast.success('Entry deleted.');
      setHistoryItems((prev) => prev.filter((h) => h.id !== id));
    } catch {
      toast.error('Failed to delete entry.');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Video className="h-8 w-8 text-red-600" />
          AI Video Summarizer
        </h1>
        <p className="text-gray-500 mt-1">Upload a video or paste a YouTube link. We transcribe first, then summarize.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {(['summarize', 'history'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition capitalize ${
              activeTab === tab ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'history' ? <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> History</span> : 'Summarize'}
          </button>
        ))}
      </div>

      {activeTab === 'summarize' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="space-y-8">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMode('url')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition ${
                  mode === 'url' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                <Link2 className="h-4 w-4" />
                YouTube URL
              </button>
              <button
                type="button"
                onClick={() => setMode('upload')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition ${
                  mode === 'upload' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                <Upload className="h-4 w-4" />
                Upload video
              </button>
            </div>

            <div>
              {mode === 'url' ? (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-2">YouTube URL</label>
                  <input
                    type="text"
                    placeholder="Paste a YouTube link here..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                  />
                </>
              ) : (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload video</label>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl px-4 py-8 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="font-medium text-gray-700">Click to choose a video file</span>
                    <span className="text-xs text-gray-500 mt-1">MP4, MOV, MKV, WEBM, AVI</span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  {videoFile && <p className="text-sm text-gray-600 mt-2">Selected: {videoFile.name}</p>}
                </>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleSummarize}
                  disabled={isSummarizing || (mode === 'url' ? !videoUrl.trim() : !videoFile)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-medium transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isSummarizing ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Transcribe & Summarize <ArrowRight className="h-4 w-4" /></>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setVideoUrl(''); setVideoFile(null); }}
                  className="px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium"
                >
                  Clear
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Optional context</label>
              <textarea
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                rows={3}
                placeholder="Add lesson topic or what you want to focus on"
                value={context}
                onChange={(e) => setContext(e.target.value)}
              />
            </div>

            {summary && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-indigo-50 rounded-xl p-6 border border-indigo-100"
              >
                <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Summary
                </h3>
                <h4 className="text-lg font-semibold text-indigo-900 mb-3">{summary.title}</h4>
                <ul className="space-y-2 text-gray-700 list-disc list-inside">
                  {summary.summary.map((item, index) => (
                    <li key={`summary-${index}`}>{item}</li>
                  ))}
                </ul>

                {summary.takeaways.length > 0 && (
                  <div className="mt-5">
                    <h5 className="text-sm font-semibold uppercase tracking-wide text-indigo-800 mb-2">Takeaways</h5>
                    <ul className="space-y-2 text-gray-700 list-disc list-inside">
                      {summary.takeaways.map((item, index) => (
                        <li key={`takeaway-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button onClick={() => copySummary(summary)} className="text-sm bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-full hover:bg-indigo-100 transition shadow-sm">
                    Copy Text
                  </button>
                  <button
                    onClick={() => {
                      setVideoUrl('');
                      setVideoFile(null);
                      setContext('');
                      setSummary(null);
                    }}
                    className="text-sm bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-full hover:bg-indigo-100 transition shadow-sm"
                  >
                    New Summary
                  </button>
                </div>
              </motion.div>
            )}

            {!summary && !isSummarizing && (
              <div className="border-2 border-dashed border-gray-100 rounded-xl p-16 text-center">
                <Play className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-400 text-lg">Choose a source above to generate a summary</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {isLoadingHistory ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : historyItems.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400">No summaries yet. Generate your first one!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historyItems.map((item) => (
                <div key={item.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{item.generatedTitle || 'Untitled Summary'}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.sourceType === 'youtube' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {item.sourceType === 'youtube' ? 'YouTube' : 'Upload'}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); copySummary({ title: item.generatedTitle || '', summary: item.summary, takeaways: item.takeaways }); }}
                        className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 text-gray-600 transition"
                      >
                        Copy
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteHistory(item.id); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {expandedId === item.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="px-5 pb-5 bg-indigo-50/40 border-t border-gray-100"
                    >
                      {item.contextNote && (
                        <p className="text-xs text-gray-500 italic mt-3 mb-2">Context: {item.contextNote}</p>
                      )}
                      <ul className="space-y-1.5 text-sm text-gray-700 list-disc list-inside mt-3">
                        {item.summary.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                      {item.takeaways.length > 0 && (
                        <>
                          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 mt-4 mb-2">Takeaways</p>
                          <ul className="space-y-1.5 text-sm text-gray-700 list-disc list-inside">
                            {item.takeaways.map((t, i) => <li key={i}>{t}</li>)}
                          </ul>
                        </>
                      )}
                    </motion.div>
                  )}
                </div>
              ))}

              {historyTotalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <button
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage((p) => p - 1)}
                    className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-600">Page {historyPage} of {historyTotalPages}</span>
                  <button
                    disabled={historyPage >= historyTotalPages}
                    onClick={() => setHistoryPage((p) => p + 1)}
                    className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
