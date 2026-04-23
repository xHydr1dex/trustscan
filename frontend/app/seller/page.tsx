"use client";
import { useState, useEffect } from "react";
import { BarChart3, Zap, ArrowLeft } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrustGauge } from "@/components/TrustGauge";
import { FlagBadge } from "@/components/FlagBadge";
import { Nav } from "@/components/Nav";
import { getProductSummary, getProductReviews, getProducts, getCategories } from "@/lib/api";

const TRUST_COLOR = (s: number) => s >= 0.7 ? "text-emerald-400" : s >= 0.5 ? "text-amber-400" : "text-red-400";

export default function SellerPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [productList, setProductList] = useState<any[]>([]);
  const [asin, setAsin] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepDone, setDeepDone] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  async function handleCategoryClick(cat: string) {
    setActiveCategory(cat); setProductsLoading(true);
    const prods = await getProducts(cat);
    setProductList(prods);
    setProductsLoading(false);
    setSummary(null); setReviews([]); setAsin(""); setDeepDone(false);
  }

  async function handleProductClick(selectedAsin: string) {
    setAsin(selectedAsin); setLoading(true); setSummary(null); setReviews([]); setDeepDone(false);
    try {
      const [s, r] = await Promise.all([
        getProductSummary(selectedAsin),
        getProductReviews(selectedAsin, 100),
      ]);
      setSummary(s); setReviews(r);
    } catch {}
    setLoading(false);
  }

  async function handleDeepScan() {
    if (!asin) return;
    setDeepLoading(true);
    try {
      const r = await getProductReviews(asin, 100, true);
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

  const genuine = reviews.filter(r => (r.trust_score ?? 1) >= 0.7).length;
  const suspicious = reviews.filter(r => (r.trust_score ?? 1) < 0.7).length;
  const chartData = [{ name: "Genuine", count: genuine }, { name: "Suspicious", count: suspicious }];
  const flaggedReviews = reviews.filter(r => (r.trust_score ?? 1) < 0.7);

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-[#080d1a] p-6 md:p-10 pt-20 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-100">Seller Dashboard</h1>
            <p className="text-xs text-slate-500">Monitor your product&apos;s review health</p>
          </div>
        </div>

        {/* Category browser */}
        {!summary && (
          <>
            {!activeCategory ? (
              <>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Browse by category</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categories.map((c: any) => (
                    <button key={c.category} onClick={() => handleCategoryClick(c.category)}
                      className="p-4 rounded-xl border border-slate-700 bg-slate-900/40 hover:border-amber-500/40 hover:bg-amber-500/5 text-left transition-all">
                      <p className="text-sm font-medium text-slate-200">{c.category}</p>
                      <p className="text-xs text-slate-500 mt-1">{c.product_count} products</p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <button onClick={() => { setActiveCategory(null); setProductList([]); }}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 mb-4 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to categories
                </button>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">{activeCategory}</p>
                {productsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-slate-800 animate-pulse" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {productList.map((p: any) => (
                      <button key={p.asin} onClick={() => handleProductClick(p.asin)}
                        className="p-4 rounded-xl border border-slate-700 bg-slate-900/40 hover:border-amber-500/40 hover:bg-amber-500/5 text-left transition-all">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-mono text-slate-400">{p.asin}</p>
                          <span className={`text-xs font-semibold ${TRUST_COLOR(p.avg_trust_score)}`}>
                            {Math.round((p.avg_trust_score ?? 1) * 100)}/100
                          </span>
                        </div>
                        <div className="flex gap-3 text-xs text-slate-500">
                          <span>{p.review_count} reviews</span>
                          <span>{p.avg_rating}★</span>
                          {p.flagged_count > 0 && <span className="text-red-400">{p.flagged_count} flagged</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {loading && <div className="text-slate-400 text-sm animate-pulse mt-4">Loading product data…</div>}

        {summary && (
          <>
            <button onClick={() => { setSummary(null); setReviews([]); setDeepDone(false); }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 mb-4 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to products
            </button>

            <div className="flex items-center gap-3 mb-6">
              <button onClick={handleDeepScan} disabled={deepLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 hover:border-violet-500/50 text-violet-300 text-sm font-medium transition-all disabled:opacity-50">
                <Zap className={`w-4 h-4 ${deepLoading ? "animate-pulse" : ""}`} />
                {deepLoading ? "Running deep scan…" : "Deep Scan"}
              </button>
              {deepDone && <span className="text-xs text-violet-400">✓ Similarity + LLM signals applied</span>}
              {!deepDone && !deepLoading && <span className="text-xs text-slate-500">Run similarity + LLM analysis on all reviews</span>}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="col-span-1 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col items-center justify-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Health Score</p>
                <TrustGauge score={summary.avg_trust_score ?? 0} size={110} />
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Total Reviews</p>
                <p className="text-3xl font-bold text-slate-100">{summary.total_reviews}</p>
                <p className="text-xs text-slate-500 mt-1">avg {summary.avg_rating}★</p>
              </div>
              <div className="rounded-2xl border border-red-500/10 bg-red-500/5 p-5">
                <p className="text-xs text-red-400/70 uppercase tracking-wider mb-2">Flagged</p>
                <p className="text-3xl font-bold text-red-400">{summary.flagged_count ?? 0}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {summary.total_reviews ? ((summary.flagged_count / summary.total_reviews) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
            </div>

            {reviews.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 mb-6">
                <p className="text-sm font-medium text-slate-300 mb-4">Authenticity Breakdown</p>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={chartData} barCategoryGap="40%">
                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9" }} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      <Cell fill="#10b981" /><Cell fill="#ef4444" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {flaggedReviews.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                <p className="text-sm font-medium text-slate-300 mb-4">Flagged Reviews to Watch</p>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {flaggedReviews.slice(0, 20).map((r: any) => (
                    <div key={r.review_id} className="p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-amber-400 text-xs">{"★".repeat(Math.round(r.rating ?? 0))}</span>
                        <span className="text-xs text-red-400 font-medium">Trust: {Math.round((r.trust_score ?? 0) * 100)}</span>
                        <FlagBadge type="rule" active={r.rule_flagged} />
                        <FlagBadge type="ring" active={r.ring_flagged} />
                        <FlagBadge type="llm" active={r.llm_flagged} />
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">{r.review_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
