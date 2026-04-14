import React, { useEffect, useState } from 'react';
import { ArrowRight, Languages, Search } from 'lucide-react';
import { toast } from 'sonner';
import { TranslationHistoryItem } from '@/app/types/models';

interface WordTranslatorProps {
  onTranslate: (payload: {
    text: string;
    sourceLanguage: string;
    targetLanguage: string;
  }) => Promise<{ translatedText: string; historyItem: TranslationHistoryItem }>;
  onLoadHistory: (input: {
    page: number;
    pageSize: number;
    search?: string;
  }) => Promise<{
    rows: TranslationHistoryItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>;
}

const PAGE_SIZE = 6;

export function WordTranslator({ onTranslate, onLoadHistory }: WordTranslatorProps) {
  const [textToTranslate, setTextToTranslate] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('English');
  const [targetLanguage, setTargetLanguage] = useState('Korean');
  const [historySearch, setHistorySearch] = useState('');
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const loadHistory = async (page = historyPage, search = historySearch) => {
    try {
      setHistoryLoading(true);
      const response = await onLoadHistory({
        page,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined,
      });

      setHistory(response.rows);
      setHistoryPage(response.page);
      setHistoryTotalPages(response.totalPages);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load translation history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(1, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTranslate = async () => {
    if (!textToTranslate.trim()) {
      return;
    }

    try {
      setIsTranslating(true);
      const response = await onTranslate({
        text: textToTranslate,
        sourceLanguage,
        targetLanguage,
      });
      setTranslatedText(response.translatedText);
      toast.success('Translated successfully.');
      await loadHistory(1, historySearch);
    } catch (error: any) {
      toast.error(error.message || 'Translation failed.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSearchHistory = async () => {
    await loadHistory(1, historySearch);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Languages className="h-8 w-8 text-violet-600" />
          Word Translator
        </h1>
        <p className="text-gray-500 mt-1">Translate complex terms with context</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 min-h-[360px]">
          <div className="flex flex-col">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-sm font-bold text-gray-700">Source Language</label>
              <select
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
              >
                <option>English</option>
                <option>Filipino</option>
                <option>Japanese</option>
                <option>Korean</option>
                <option>Spanish</option>
              </select>
            </div>
            <textarea
              className="flex-1 w-full border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-violet-500 outline-none resize-none bg-gray-50 text-lg"
              placeholder="Type text or paste content to translate..."
              value={textToTranslate}
              onChange={(e) => setTextToTranslate(e.target.value)}
            />
          </div>

          <div className="flex flex-col relative">
            <div className="absolute top-1/2 -left-4 transform -translate-y-1/2 md:block hidden z-10">
              <div className="bg-white border border-gray-200 p-2 rounded-full shadow-sm">
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-sm font-bold text-gray-700">Target Language</label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
              >
                <option>Korean</option>
                <option>English</option>
                <option>Filipino</option>
                <option>Japanese</option>
                <option>Spanish</option>
              </select>
            </div>
            <div className="flex-1 w-full border border-gray-200 rounded-xl p-4 bg-violet-50/40">
              {isTranslating ? (
                <div className="h-full flex items-center justify-center">
                  <div className="h-8 w-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                </div>
              ) : translatedText ? (
                <p className="text-gray-800 text-lg leading-relaxed">{translatedText}</p>
              ) : (
                <p className="text-gray-400 italic mt-2">Translation will appear here...</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleTranslate}
            disabled={isTranslating || !textToTranslate}
            className="bg-violet-600 hover:bg-violet-700 text-white px-10 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition active:scale-95 flex items-center gap-2"
          >
            Translate <Languages className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h3 className="text-lg font-bold text-gray-800">Translation History</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search history"
                className="border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={handleSearchHistory}
              className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded-lg text-sm"
            >
              Search
            </button>
          </div>
        </div>

        <div className="space-y-3 min-h-[180px]">
          {historyLoading ? (
            <p className="text-sm text-gray-500">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500">No translation history yet.</p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="border border-gray-100 rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-2">
                  {item.sourceLanguage} <ArrowRight className="h-3 w-3 inline mx-1" /> {item.targetLanguage}
                </div>
                <p className="text-sm text-gray-700"><span className="font-semibold">Source:</span> {item.sourceText}</p>
                <p className="text-sm text-gray-800 mt-1"><span className="font-semibold">Translation:</span> {item.translatedText}</p>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex justify-end items-center gap-2">
          <button
            onClick={() => loadHistory(Math.max(1, historyPage - 1), historySearch)}
            disabled={historyPage <= 1 || historyLoading}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {historyPage} of {historyTotalPages}</span>
          <button
            onClick={() => loadHistory(Math.min(historyTotalPages, historyPage + 1), historySearch)}
            disabled={historyPage >= historyTotalPages || historyLoading}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
