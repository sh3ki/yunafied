import React, { useState } from 'react';
import { ArrowRight, FileText, Link2, Play, Upload, Video } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { apiClient } from '@/app/services/apiClient';
import { VideoSummaryResponse } from '@/app/types/models';

export function VideoSummarizer() {
  const [mode, setMode] = useState<'url' | 'upload'>('url');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<VideoSummaryResponse | null>(null);
  const [context, setContext] = useState('');

  const handleSummarize = async () => {
    if (mode === 'url' && !videoUrl.trim()) return;
    if (mode === 'upload' && !videoFile) return;

    try {
      setIsSummarizing(true);
      const response = await apiClient.summarizeVideo(
        mode === 'upload'
          ? {
              videoFile: videoFile as File,
              context: context.trim() || undefined,
            }
          : {
              videoUrl: videoUrl.trim(),
              context: context.trim() || undefined,
            },
      );
      setSummary(response);
    } catch (error: any) {
      toast.error(error.message || 'Failed to summarize video.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const copySummary = async () => {
    if (!summary) {
      return;
    }

    try {
      const exportText = [
        summary.title,
        '',
        'Summary:',
        ...summary.summary.map((point) => `- ${point}`),
        '',
        'Takeaways:',
        ...summary.takeaways.map((point) => `- ${point}`),
      ].join('\n');

      await navigator.clipboard.writeText(exportText);
      toast.success('Summary copied.');
    } catch {
      toast.error('Failed to copy summary.');
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
                  <>
                    Transcribe & Summarize <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setVideoUrl('');
                  setVideoFile(null);
                }}
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
                <button onClick={copySummary} className="text-sm bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-full hover:bg-indigo-100 transition shadow-sm">
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
    </div>
  );
}
