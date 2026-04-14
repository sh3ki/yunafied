import React, { useMemo, useRef, useState } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface AIGuideProps {
  onAsk: (input: {
    message: string;
    subject?: string;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
  }) => Promise<{ answer: string }>;
}

export function AIGuide({ onAsk }: AIGuideProps) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content:
        "Hello! I'm your AI Study Companion. I can help you break down topics, review your understanding, and guide you step-by-step.",
    },
  ]);
  const [input, setInput] = useState('');
  const [subject, setSubject] = useState('General');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const conversationHistory = useMemo(() => messages.slice(1), [messages]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) {
      return;
    }

    const userMessage = { role: 'user' as const, content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');

    try {
      setSending(true);
      const response = await onAsk({
        message: content,
        subject: subject === 'General' ? undefined : subject,
        history: [...conversationHistory, userMessage].slice(-10),
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: response.answer }]);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (error: any) {
      toast.error(error.message || 'Failed to get response from AI Study Guide.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center gap-4 bg-gradient-to-r from-violet-50 to-indigo-50">
        <div className="bg-white p-3 rounded-full shadow-sm">
          <Bot className="h-8 w-8 text-violet-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">AI Study Guide</h2>
          <p className="text-sm text-gray-500">Ask anything and get guided, step-by-step support.</p>
        </div>
        <div className="ml-auto">
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option>General</option>
            <option>English</option>
            <option>Math</option>
            <option>Science</option>
            <option>History</option>
          </select>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-gray-50/30">
        {messages.map((message, index) => {
          const isUser = message.role === 'user';
          return (
            <div key={`${message.role}-${index}`} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isUser ? 'bg-indigo-100 text-indigo-700 font-bold' : 'bg-violet-100'
                }`}
              >
                {isUser ? 'ME' : <Bot className="h-6 w-6 text-violet-600" />}
              </div>
              <div
                className={`rounded-2xl p-5 shadow-sm max-w-[80%] ${
                  isUser
                    ? 'bg-violet-600 text-white rounded-tr-none'
                    : 'bg-white border border-gray-200 rounded-tl-none text-gray-700'
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="flex gap-4">
            <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
              <Bot className="h-6 w-6 text-violet-600" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none p-5 shadow-sm">
              <p className="text-gray-500">Thinking...</p>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Ask a question about your studies..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            className="w-full border border-gray-200 rounded-xl pl-6 pr-14 py-4 focus:ring-2 focus:ring-violet-500 outline-none shadow-sm"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-violet-600 text-white p-2 rounded-lg hover:bg-violet-700 transition disabled:opacity-60"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <div className="text-center mt-2 text-xs text-gray-400">
          AI can make mistakes. Please double check important information.
        </div>
      </div>
    </div>
  );
}
