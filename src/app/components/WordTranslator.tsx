import React, { useEffect, useState } from 'react';
import { ArrowRight, ArrowLeftRight, Languages, Search, BookMarked, Volume2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { TranslationHistoryItem, VocabItem } from '@/app/types/models';
import { apiClient } from '@/app/services/apiClient';

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
const LANGUAGES = [
  'English', 'Filipino', 'Japanese', 'Korean', 'Spanish', 'French', 'German',
  'Chinese (Simplified)', 'Chinese (Traditional)', 'Arabic', 'Hindi', 'Portuguese',
  'Italian', 'Russian', 'Vietnamese', 'Thai', 'Indonesian', 'Malay', 'Turkish', 'Dutch',
];

export function WordTranslator({ onTranslate, onLoadHistory }: WordTranslatorProps) {
  const [activeTab, setActiveTab] = useState<'translate' | 'vocab'>('translate');
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
  const [vocab, setVocab] = useState<VocabItem[]>([]);
  const [vocabLoading, setVocabLoading] = useState(false);
  const [savingVocab, setSavingVocab] = useState(false);

  const loadHistory = async (page = historyPage, search = historySearch) => {
    try {
      setHistoryLoading(true);
      const response = await onLoadHistory({ page, pageSize: PAGE_SIZE, search: search.trim() || undefined });
      setHistory(response.rows);
      setHistoryPage(response.page);
      setHistoryTotalPages(response.totalPages);
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Failed to load translation history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadVocab = async () => {
    try {
      setVocabLoading(true);
      const items = await apiClient.listVocabItems();
      setVocab(items);
    } catch {
      // silent
    } finally {
      setVocabLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(1, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'vocab') loadVocab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleTranslate = async () => {
    if (!textToTranslate.trim()) return;
    try {
      setIsTranslating(true);
      const response = await onTranslate({ text: textToTranslate, sourceLanguage, targetLanguage });
      setTranslatedText(response.translatedText);
      toast.success('Translated successfully.');
      await loadHistory(1, historySearch);
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Translation failed.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSwapLanguages = () => {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
    setTextToTranslate(translatedText);
    setTranslatedText(textToTranslate);
  };

  const languageNameToCode = (name: string): string => {
    const map: Record<string, string> = {
      English: 'en-US',
      Filipino: 'en-PH',
      Japanese: 'ja-JP',
      Korean: 'ko-KR',
      Spanish: 'es-ES',
      French: 'fr-FR',
      German: 'de-DE',
      'Chinese (Simplified)': 'zh-CN',
      'Chinese (Traditional)': 'zh-TW',
      Arabic: 'ar-SA',
      Hindi: 'hi-IN',
      Portuguese: 'pt-PT',
      Italian: 'it-IT',
      Russian: 'ru-RU',
      Vietnamese: 'vi-VN',
      Thai: 'th-TH',
      Indonesian: 'id-ID',
      Malay: 'ms-MY',
      Turkish: 'tr-TR',
      Dutch: 'nl-NL',
    };
    return map[name] || 'en-US';
  };

  const pickMaleLikeVoice = (voices: SpeechSynthesisVoice[], langPrefix: string) => {
    if (!voices || voices.length === 0) return null;
    const byLang = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith(langPrefix));
    // prefer voices with 'male' or 'man' in the name
    const maleNamed = (list: SpeechSynthesisVoice[]) => list.find((v) => /male|man/i.test(v.name || ''));
    let v = maleNamed(byLang || []) || (byLang.length ? byLang[0] : null);
    if (v) return v;
    v = maleNamed(voices) || voices[0];
    return v || null;
  };

  const speakText = (text: string, languageName?: string) => {
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const langCode = languageName ? languageNameToCode(languageName) : 'en-US';

    const doSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const langPrefix = langCode.split('-')[0].toLowerCase();
      const voice = pickMaleLikeVoice(voices, langPrefix);
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = langCode;
      if (voice) utter.voice = voice;
      // Slightly lower pitch to sound more male-like when voice selection is ambiguous
      utter.pitch = 0.9;
      utter.rate = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    };

    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) {
      // voices may load asynchronously
      window.speechSynthesis.onvoiceschanged = () => doSpeak();
      // also set a small timeout fallback
      setTimeout(() => doSpeak(), 300);
      return;
    }

    doSpeak();
  };

  const handleSaveVocab = async () => {
    if (!textToTranslate.trim() || !translatedText.trim()) {
      toast.error('Translate something first.');
      return;
    }
    try {
      setSavingVocab(true);
      await apiClient.saveVocabItem({
        sourceText: textToTranslate.trim(),
        translatedText: translatedText.trim(),
        sourceLanguage,
        targetLanguage,
      });
      toast.success('Saved to vocabulary!');
    } catch {
      toast.error('Failed to save vocab item.');
    } finally {
      setSavingVocab(false);
    }
  };

  const handleDeleteVocab = async (id: string) => {
    try {
      await apiClient.deleteVocabItem(id);
      setVocab((prev) => prev.filter((v) => v.id !== id));
    } catch {
      toast.error('Failed to delete vocab item.');
    }
  };

  const handleSearchHistory = async () => {
    await loadHistory(1, historySearch);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Languages className="h-8 w-8 text-violet-600" />
          Word Translator
        </h1>
        <p className="text-gray-500 mt-1">Translate complex terms with context</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {(['translate', 'vocab'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab ? 'bg-white shadow text-violet-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'translate' ? 'Translate' : 'My Vocabulary'}
          </button>
        ))}
      </div>

      {activeTab === 'translate' && (
        <>
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
                    {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div className="relative">
                  <textarea
                    className="flex-1 w-full border border-gray-200 rounded-xl p-4 bg-gray-50 text-lg placeholder-gray-400 italic min-h-[200px]"
                    placeholder="Type text or paste content to translate..."
                    value={textToTranslate}
                    onChange={(e) => setTextToTranslate(e.target.value)}
                  />
                  {textToTranslate.trim() ? (
                    <button
                      onClick={() => speakText(textToTranslate, sourceLanguage)}
                      title={`Listen (source: ${sourceLanguage})`}
                      className="absolute right-3 bottom-3 p-2 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-violet-50 transition"
                    >
                      <Volume2 className="h-4 w-4 text-gray-600" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col relative">
                <div className="absolute top-1/2 -left-4 transform -translate-y-1/2 md:block hidden z-10">
                  <button
                    onClick={handleSwapLanguages}
                    title="Swap languages"
                    className="bg-white border border-gray-200 p-2 rounded-full shadow-sm hover:bg-violet-50 hover:border-violet-300 transition"
                  >
                    <ArrowLeftRight className="h-5 w-5 text-gray-400" />
                  </button>
                </div>

                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="text-sm font-bold text-gray-700">Target Language</label>
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                  >
                    {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div className="flex-1 w-full border border-gray-200 rounded-xl p-4 bg-gray-50 text-lg relative min-h-[200px]">
                  {isTranslating ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="h-8 w-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                    </div>
                  ) : translatedText ? (
                    <>
                      <p className="text-gray-800 text-lg leading-relaxed pr-10">{translatedText}</p>
                      <button
                        onClick={() => speakText(translatedText, targetLanguage)}
                        title={`Listen (target: ${targetLanguage})`}
                        className="absolute right-3 bottom-3 p-2 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition"
                      >
                        <Volume2 className="h-4 w-4 text-gray-600" />
                      </button>
                    </>
                  ) : (
                    <p className="text-gray-400 italic mt-2">Translation will appear here...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Swap (mobile) */}
            <div className="mt-4 flex md:hidden justify-center">
              <button
                onClick={handleSwapLanguages}
                className="flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                <ArrowLeftRight className="h-4 w-4" /> Swap Languages
              </button>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              {translatedText && (
                <>
                  <button
                    onClick={handleSaveVocab}
                    disabled={savingVocab}
                    className="flex items-center gap-2 border border-violet-200 bg-violet-50 px-4 py-2.5 rounded-xl text-sm text-violet-700 hover:bg-violet-100 transition disabled:opacity-60"
                  >
                    <BookMarked className="h-4 w-4" /> Save to Vocab
                  </button>
                </>
              )}
              <button
                onClick={handleTranslate}
                disabled={isTranslating || !textToTranslate}
                className="bg-violet-600 hover:bg-violet-700 text-white px-10 py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition active:scale-95 flex items-center gap-2"
              >
                Translate <Languages className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* History */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <h3 className="text-lg font-bold text-gray-800">Translation History</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchHistory()}
                    placeholder="Search history"
                    className="border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm"
                  />
                </div>
                <button onClick={handleSearchHistory} className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded-lg text-sm">
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
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-700"><span className="font-semibold">Source:</span> {item.sourceText}</p>
                      </div>
                      <div className="shrink-0">
                        <button
                          onClick={() => speakText(item.sourceText, item.sourceLanguage)}
                          title={`Listen source (${item.sourceLanguage})`}
                          className="p-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-violet-50 transition"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-3 mt-1">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800"><span className="font-semibold">Translation:</span> {item.translatedText}</p>
                      </div>
                      <div className="shrink-0">
                        <button
                          onClick={() => speakText(item.translatedText, item.targetLanguage)}
                          title={`Listen translation (${item.targetLanguage})`}
                          className="p-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-violet-50 transition"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
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
        </>
      )}

      {activeTab === 'vocab' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">My Vocabulary</h3>
            <span className="text-sm text-gray-500">{vocab.length} saved items</span>
          </div>
          {vocabLoading ? (
            <p className="text-sm text-gray-500 py-8 text-center">Loading…</p>
          ) : vocab.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">
              No vocabulary saved yet. Translate something and click "Save to Vocab".
            </p>
          ) : (
            <div className="space-y-3">
              {vocab.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 border border-gray-100 rounded-xl p-3 hover:bg-gray-50 transition">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400 mb-1">
                      {item.sourceLanguage} → {item.targetLanguage}
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">{item.sourceText}</p>
                    <p className="text-sm text-violet-700 truncate">{item.translatedText}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteVocab(item.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-gray-400 transition shrink-0"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


