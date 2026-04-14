import React, { useState } from 'react';
import { Video, ArrowRight, FileText, Play } from 'lucide-react';
import { motion } from 'motion/react';

export function VideoSummarizer() {
  const [videoUrl, setVideoUrl] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const handleSummarize = () => {
    if (!videoUrl) return;
    setIsSummarizing(true);
    // Mock API call
    setTimeout(() => {
      setSummary("This video covers the fundamental concepts of English grammar, focusing on subject-verb agreement and the proper use of tenses. It provides three key examples: 1. Present Simple for habits. 2. Past Perfect for completed actions. 3. Future Continuous for ongoing plans.");
      setIsSummarizing(false);
    }, 2000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Video className="h-8 w-8 text-red-600" />
          AI Video Summarizer
        </h1>
        <p className="text-gray-500 mt-1">Get key takeaways from educational videos instantly</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="space-y-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Video URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste YouTube or lecture link here..."
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              <button
                onClick={handleSummarize}
                disabled={isSummarizing || !videoUrl}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 rounded-xl font-medium transition disabled:opacity-50 flex items-center gap-2"
              >
                {isSummarizing ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Generate <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
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
              <p className="text-gray-700 leading-relaxed text-lg">{summary}</p>
              
              <div className="mt-6 flex gap-3">
                <button className="text-sm bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-full hover:bg-indigo-100 transition shadow-sm">
                  Copy Text
                </button>
                <button className="text-sm bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-full hover:bg-indigo-100 transition shadow-sm">
                  Save to Notes
                </button>
              </div>
            </motion.div>
          )}

          {!summary && !isSummarizing && (
            <div className="border-2 border-dashed border-gray-100 rounded-xl p-16 text-center">
              <Play className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-400 text-lg">Paste a URL above to see the magic happen</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
