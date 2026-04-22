"use client";
import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Terminal } from "lucide-react";
import { Nav } from "@/components/Nav";
import { sendChatMessage } from "@/lib/api";

const EXAMPLES = [
  "Which product has the most flagged reviews?",
  "Show me all reviewers with high risk level",
  "How many unverified 5-star reviews are there?",
  "List the top 10 products by average trust score",
];

export default function AnalystPage() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);

  async function handleSend(q?: string) {
    const text = (q ?? question).trim();
    if (!text || loading) return;
    setQuestion(""); setLoading(true);
    const result = await sendChatMessage(text);
    setHistory(prev => [...prev, { ...result, question: text }]);
    setLoading(false);
  }

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-[#080d1a] flex flex-col p-6 md:p-10 pt-20 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-100">Analyst Chat</h1>
            <p className="text-xs text-slate-500">Natural language → SQL → data</p>
          </div>
        </div>

        {/* Example prompts */}
        {history.length === 0 && (
          <div className="mb-6">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Try asking</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map(e => (
                <button key={e} onClick={() => handleSend(e)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-sky-500/40 hover:text-sky-300 transition-colors">
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat history */}
        <div className="flex-1 space-y-6 mb-6 overflow-y-auto max-h-[60vh]">
          {history.map((item, i) => (
            <div key={i} className="space-y-3">
              {/* Question */}
              <div className="flex justify-end">
                <div className="max-w-lg px-4 py-2.5 rounded-2xl rounded-tr-sm bg-sky-600/20 border border-sky-500/20 text-sm text-sky-100">
                  {item.question}
                </div>
              </div>
              {/* SQL */}
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Terminal className="w-3 h-3 text-slate-400" />
                </div>
                <div className="flex-1 space-y-2">
                  <pre className="text-xs bg-slate-900 border border-slate-700/50 rounded-xl p-3 text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                    {item.sql}
                  </pre>
                  {item.error ? (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{item.error}</div>
                  ) : item.results?.length > 0 ? (
                    <div className="rounded-xl border border-slate-700/50 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-800/80">
                            <tr>
                              {Object.keys(item.results[0]).map((k: string) => (
                                <th key={k} className="px-3 py-2 text-left text-slate-400 font-medium whitespace-nowrap">{k}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {item.results.slice(0, 10).map((row: any, j: number) => (
                              <tr key={j} className="border-t border-slate-800 hover:bg-slate-800/30">
                                {Object.values(row).map((v: any, k: number) => (
                                  <td key={k} className="px-3 py-2 text-slate-300 max-w-xs truncate">{String(v ?? "")}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="px-3 py-2 bg-slate-900/60 border-t border-slate-800 text-xs text-slate-500">
                        {item.row_count} row{item.row_count !== 1 ? "s" : ""} returned
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 px-1">No results returned.</div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              Generating SQL...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 mt-auto">
          <input
            className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors"
            placeholder="Ask a question about the review data..."
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
          />
          <button onClick={() => handleSend()} disabled={loading || !question.trim()}
            className="px-4 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
