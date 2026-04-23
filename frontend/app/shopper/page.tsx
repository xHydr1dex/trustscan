"use client";
import { useState } from "react";
import { ShoppingBag, Search, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { TrustGauge } from "@/components/TrustGauge";
import { FlagBadge } from "@/components/FlagBadge";
import { Nav } from "@/components/Nav";
import { getProductSummary, getProductReviews } from "@/lib/api";

export default function ShopperPage() {
  const [asin, setAsin] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepDone, setDeepDone] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function handleSearch() {
    if (!asin.trim()) return;
    setLoading(true); setError(""); setSummary(null); setReviews([]); setDeepDone(false);
    try {
      const [s, r] = await Promise.all([
        getProductSummary(asin.trim()),
        getProductReviews(asin.trim(), 30),
      ]);
      setSummary(s); setReviews(r);
    } catch { setError("Product not found. Check the ASIN and try again."); }
    setLoading(false);
  }

  async function handleDeepScan() {
    if (!asin.trim()) return;
    setDeepLoading(true);
    try {
      const r = await getProductReviews(asin.trim(), 30, true);
      setReviews(r);
      const scores = r.map((rev: any) => rev.trust_score ?? 1);
      const flagged = r.filter((rev: any) => (rev.trust_score ?? 1) < 0.7).length;
      setSummary((prev: any) => ({
        ...prev,
        avg_trust_score: scores.length ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 100) / 100 : prev.avg_trust_score,
        flagged_count: flagged,
      }));
      setDeepDone(true);
    } catch {}
    setDeepLoading(false);
  }

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-[#080d1a] p-6 md:p-10 pt-20 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-100">Shopper View</h1>
            <p className="text-xs text-slate-500">Check if a product&apos;s reviews are trustworthy</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
              placeholder="Enter Amazon ASIN (e.g. B07GNNGXNK)"
              value={asin}
              onChange={e => setAsin(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {loading ? "Checking..." : "Check"}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        {summary && (
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleDeepScan}
              disabled={deepLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 hover:border-violet-500/50 text-violet-300 text-sm font-medium transition-all disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 ${deepLoading ? "animate-pulse" : ""}`} />
              {deepLoading ? "Running deep scan…" : "Deep Scan"}
            </button>
            {deepDone && <span className="text-xs text-violet-400">✓ Similarity + LLM signals applied</span>}
            {!deepDone && !deepLoading && <span className="text-xs text-slate-500">Run LLM analysis on each review</span>}
          </div>
        )}

        {summary && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Trust Score</p>
                <TrustGauge score={summary.avg_trust_score ?? 0} size={140} />
              </div>
              <div className="text-right space-y-3">
                <div>
                  <p className="text-xs text-slate-500">Total Reviews</p>
                  <p className="text-2xl font-bold text-slate-100">{summary.total_reviews}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Flagged</p>
                  <p className="text-2xl font-bold text-red-400">{summary.flagged_count ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Avg Rating</p>
                  <p className="text-2xl font-bold text-amber-400">{summary.avg_rating ?? "—"}★</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {reviews.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Reviews — sorted by trust</p>
            {reviews.map((r: any) => {
              const score = r.trust_score ?? 1;
              const isSuspicious = score < 0.5;
              const isExpanded = expanded === r.review_id;
              return (
                <div
                  key={r.review_id}
                  className={`rounded-xl border p-4 cursor-pointer transition-all ${
                    isSuspicious
                      ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40"
                      : "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40"
                  }`}
                  onClick={() => setExpanded(isExpanded ? null : r.review_id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-amber-400 text-sm">{"★".repeat(Math.round(r.rating ?? 0))}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                          isSuspicious ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}>
                          {Math.round(score * 100)}/100
                        </span>
                        <FlagBadge type="rule" active={r.rule_flagged} />
                        <FlagBadge type="ring" active={r.ring_flagged} />
                        <FlagBadge type="llm" active={r.llm_flagged} />
                      </div>
                      <p className={`text-sm text-slate-300 ${isExpanded ? "" : "line-clamp-2"}`}>{r.review_text}</p>
                      {r.llm_explanation && isExpanded && (
                        <p className="mt-2 text-xs text-slate-500 italic border-t border-slate-700/50 pt-2">
                          AI: {r.llm_explanation}
                        </p>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 mt-1" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
