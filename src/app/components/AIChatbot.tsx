import React, { useMemo, useRef, useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/app/services/apiClient';
import { UserRole } from '@/app/types/models';
import { toast } from 'sonner';
import { SystemLogo } from '@/app/components/SystemLogo';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
}

interface AIChatbotProps {
  role: UserRole;
  currentView: string;
}

const WELCOME_TEXT =
  "Hi! I am YUNA AI. I can help you navigate pages, explain features, and answer study or system questions.";

export function AIChatbot({ role, currentView }: AIChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', sender: 'assistant', text: WELCOME_TEXT },
  ]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const shortHistory = useMemo(
    () =>
      messages
        .slice(-8)
        .map((m) => ({ role: m.sender === 'assistant' ? 'assistant' : 'user', content: m.text })) as Array<{
        role: 'assistant' | 'user';
        content: string;
      }>,
    [messages],
  );

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputValue.trim();
    if (!content || isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsSending(true);
    scrollToBottom();

    try {
      const response = await apiClient.askYunaAi({
        message: content,
        role,
        currentView,
        history: shortHistory,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          sender: 'assistant',
          text: response.answer,
        },
      ]);
      scrollToBottom();
    } catch (error: any) {
      toast.error(error.message || 'YUNA AI is unavailable right now.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-4 w-[22rem] md:w-[25rem] bg-white rounded-2xl shadow-2xl border border-indigo-100 z-50 overflow-hidden flex flex-col h-[520px]"
          >
            <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <SystemLogo compact showText={false} imageClassName="h-8 w-8 rounded-full ring-1 ring-white/20" />
                <div>
                  <h3 className="font-bold text-sm">YUNA AI</h3>
                  <div className="flex items-center gap-1 text-[10px] text-indigo-200">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    Assistant Ready
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-lg transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] p-3 text-sm rounded-2xl whitespace-pre-wrap ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-white text-gray-700 shadow-sm border border-gray-100 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-700 shadow-sm border border-gray-100 rounded-2xl rounded-tl-none p-3 text-sm inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                    Thinking...
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask YUNA AI..."
                className="flex-1 bg-gray-100 border-0 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
              <button
                type="submit"
                disabled={isSending || !inputValue.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl transition shadow-md active:scale-95 disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-20 md:bottom-8 right-4 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg shadow-indigo-600/30 transition-transform active:scale-90 z-50 flex items-center gap-2 group"
      >
        <SystemLogo compact showText={false} imageClassName="h-6 w-6 rounded-full" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out font-medium whitespace-nowrap">
          YUNA AI
        </span>
      </button>
    </>
  );
}
