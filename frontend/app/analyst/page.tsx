"use client";
import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Terminal } from "lucide-react";
import { sendChatMessage } from "@/lib/api";

const NEU_CARD = {
  background: "#F4EDE4",
  boxShadow: "6px 6px 14px rgba(166,134,110,0.32), -6px -6px 14px rgba(255,255,255,0.82)",
  borderRadius: "16px",
};
const NEU_INSET = {
  background: "#EDE6DC",
  boxShadow: "inset 4px 4px 10px rgba(166,134,110,0.28), inset -4px -4px 10px rgba(255,255,255,0.75)",
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
    const result = await sendChatMessage(text);
    setHistory(prev => [...prev, { ...result, question: text }]);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "#4A9FD422", boxShadow: "0 2px 8px #4A9FD433" }}>
          <MessageSquare className="w-4 h-4" style={{ color: "#4A9FD4" }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#2C1A0E" }}>AI Analyst</h1>
          <p className="text-xs" style={{ color: "#8B6F5E" }}>Natural language → SQL → data</p>
        </div>
      </div>

      {/* Example prompts */}
      {history.length === 0 && (
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "#B8A090" }}>Try asking</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map(e => (
              <button key={e} onClick={() => handleSend(e)}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: "#EDE6DC", color: "#8B6F5E", boxShadow: "2px 2px 6px rgba(166,134,110,0.25), -2px -2px 6px rgba(255,255,255,0.7)" }}>
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
            <div className="flex justify-end">
              <div className="max-w-lg px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm"
                style={{ background: "#4A9FD418", border: "1px solid #4A9FD430", color: "#2C1A0E" }}>
                {item.question}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "#EDE6DC", boxShadow: "2px 2px 5px rgba(166,134,110,0.2), -2px -2px 5px rgba(255,255,255,0.65)" }}>
                <Terminal className="w-3 h-3" style={{ color: "#8B6F5E" }} />
              </div>
              <div className="flex-1 space-y-2">
                <pre className="text-xs rounded-xl p-3 overflow-x-auto whitespace-pre-wrap"
                  style={{ background: "#EDE6DC", color: "#5BBF8F", boxShadow: "inset 3px 3px 8px rgba(166,134,110,0.22), inset -3px -3px 8px rgba(255,255,255,0.65)" }}>
                  {item.sql}
                </pre>
                {item.error ? (
                  <div className="p-3 rounded-xl text-xs" style={{ background: "#E85D4A15", border: "1px solid #E85D4A30", color: "#E85D4A" }}>{item.error}</div>
                ) : item.results?.length > 0 ? (
                  <div className="rounded-xl overflow-hidden" style={NEU_INSET}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ background: "rgba(166,134,110,0.12)" }}>
                            {Object.keys(item.results[0]).map((k: string) => (
                              <th key={k} className="px-3 py-2 text-left font-medium whitespace-nowrap" style={{ color: "#8B6F5E" }}>{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {item.results.slice(0, 10).map((row: any, j: number) => (
                            <tr key={j} style={{ borderTop: "1px solid rgba(166,134,110,0.12)" }}>
                              {Object.values(row).map((v: any, k: number) => (
                                <td key={k} className="px-3 py-2 max-w-xs truncate" style={{ color: "#2C1A0E" }}>{String(v ?? "")}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-3 py-2 text-xs" style={{ borderTop: "1px solid rgba(166,134,110,0.12)", color: "#B8A090" }}>
                      {item.row_count} row{item.row_count !== 1 ? "s" : ""} returned
                    </div>
                  </div>
                ) : (
                  <div className="text-xs px-1" style={{ color: "#B8A090" }}>No results returned.</div>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm animate-pulse" style={{ color: "#B8A090" }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#4A9FD4" }} />
            Generating SQL...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-auto">
        <input
          className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all"
          style={{ background: "#EDE6DC", boxShadow: "inset 4px 4px 10px rgba(166,134,110,0.28), inset -4px -4px 10px rgba(255,255,255,0.75)", color: "#2C1A0E" }}
          placeholder="Ask a question about the review data..."
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
        />
        <button onClick={() => handleSend()} disabled={loading || !question.trim()}
          className="px-4 py-3 rounded-xl transition-all disabled:opacity-40"
          style={{ background: "#4A9FD4", color: "white", boxShadow: "0 4px 12px rgba(74,159,212,0.35)" }}>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
