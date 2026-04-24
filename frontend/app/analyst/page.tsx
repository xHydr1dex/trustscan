"use client";
import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Terminal } from "lucide-react";
import { sendChatMessage } from "@/lib/api";

const GLASS = {
  background: "rgba(255,255,255,0.07)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "16px",
};
const GLASS_DARK = {
  background: "rgba(0,0,0,0.2)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
};

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
    try {
      const result = await sendChatMessage(text);
      setHistory(prev => [...prev, { ...result, question: text }]);
    } catch {
      setHistory(prev => [...prev, { question: text, error: "Failed to reach API", sql: "", results: [], row_count: 0 }]);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(96,165,250,0.2)", border: "1px solid rgba(96,165,250,0.3)" }}>
          <MessageSquare className="w-4 h-4" style={{ color: "#60A5FA" }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">AI Analyst</h1>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Natural language → SQL → data</p>
        </div>
      </div>

      {history.length === 0 && (
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>Try asking</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map(e => (
              <button key={e} onClick={() => handleSend(e)}
                className="text-xs px-3 py-1.5 rounded-lg transition-all hover:scale-[1.02]"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}>
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 space-y-6 mb-6 overflow-y-auto max-h-[60vh]">
        {history.map((item, i) => (
          <div key={i} className="space-y-3">
            <div className="flex justify-end">
              <div className="max-w-lg px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm"
                style={{ background: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.25)", color: "rgba(255,255,255,0.9)" }}>
                {item.question}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={GLASS_DARK}>
                <Terminal className="w-3 h-3" style={{ color: "rgba(255,255,255,0.5)" }} />
              </div>
              <div className="flex-1 space-y-2">
                {item.sql && (
                  <pre className="text-xs rounded-xl p-3 overflow-x-auto whitespace-pre-wrap"
                    style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.08)", color: "#4ECDC4" }}>
                    {item.sql}
                  </pre>
                )}
                {item.error ? (
                  <div className="p-3 rounded-xl text-xs" style={{ background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.25)", color: "#FF6B6B" }}>{item.error}</div>
                ) : item.results?.length > 0 ? (
                  <div className="rounded-xl overflow-hidden" style={GLASS_DARK}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ background: "rgba(255,255,255,0.05)" }}>
                            {Object.keys(item.results[0]).map((k: string) => (
                              <th key={k} className="px-3 py-2 text-left font-medium whitespace-nowrap" style={{ color: "rgba(255,255,255,0.5)" }}>{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {item.results.slice(0, 10).map((row: any, j: number) => (
                            <tr key={j} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                              {Object.values(row).map((v: any, k: number) => (
                                <td key={k} className="px-3 py-2 max-w-xs truncate" style={{ color: "rgba(255,255,255,0.8)" }}>{String(v ?? "")}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-3 py-2 text-xs" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}>
                      {item.row_count} row{item.row_count !== 1 ? "s" : ""} returned
                    </div>
                  </div>
                ) : (
                  <div className="text-xs px-1" style={{ color: "rgba(255,255,255,0.3)" }}>No results returned.</div>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm animate-pulse" style={{ color: "rgba(255,255,255,0.4)" }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#60A5FA" }} />
            Generating SQL...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 mt-auto">
        <input
          className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "white" }}
          placeholder="Ask a question about the review data..."
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
        />
        <button onClick={() => handleSend()} disabled={loading || !question.trim()}
          className="px-4 py-3 rounded-xl transition-all disabled:opacity-40"
          style={{ background: "linear-gradient(135deg,#7C3AED,#4F46E5)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.35)" }}>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
