import React, { useState } from 'react';
import { processNLQuery } from '../services/geminiService';

interface ChatProps {
  context: any;
}

export const ChatReport: React.FC<ChatProps> = ({ context }) => {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<{ role: 'user' | 'bot', text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMsg = query;
    setQuery('');
    setHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const answer = await processNLQuery(userMsg, context);
    setHistory(prev => [...prev, { role: 'bot', text: answer || "No response." }]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[550px] bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl overflow-hidden shadow-sm animate-in zoom-in duration-300">
      <div className="bg-[var(--app-bg)] border-b border-[var(--border-default)] px-5 py-4 font-bold text-slate-800 flex justify-between items-center text-[14px] tracking-wide">
        <span>Electra Intelligence Business Analyst</span>
        <span className="text-[11px] bg-[var(--surface)] text-slate-500 border border-[var(--border-default)] px-4 py-1 rounded-lg shadow-sm tracking-wider uppercase">
          Try asking: "What is my total asset value?"
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-[var(--surface)]">
        {history.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 space-y-2">
            <span className="text-4xl">🤖</span>
            <p className="text-[14px] font-bold text-slate-500">Ask Electra AI about sales, inventory, low stock alert metrics.</p>
            <p className="text-[13px] text-slate-400 max-w-sm text-center">It analyses the state of stock valuation, CGST rates, recent invoices, and variants metadata in real time.</p>
          </div>
        )}
        {history.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed font-medium shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-[var(--app-bg)] text-slate-800 rounded-tl-none border border-[var(--border-default)]'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[var(--app-bg)] text-slate-400 rounded-2xl rounded-tl-none border border-[var(--border-default)] px-4 py-3 text-[13px] font-medium animate-pulse shadow-sm">
              Analysing inventory data, calculating response...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-[var(--app-bg)] border-t border-[var(--border-default)] flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask analytical question (e.g., 'Do I have any low stock items?')"
          className="flex-1 bg-[var(--surface)] border border-[var(--border-default)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 text-slate-800 text-[13px] font-medium outline-none shadow-sm transition-colors"
        />
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl font-bold text-[13px] transition-colors shadow-sm cursor-pointer">
          Send
        </button>
      </form>
    </div>
  );
};
