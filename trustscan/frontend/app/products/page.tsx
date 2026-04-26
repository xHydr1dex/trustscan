"use client";
import { useState, useEffect } from "react";
import { Package, ArrowLeft, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrustGauge } from "@/components/TrustGauge";
import { FlagBadge } from "@/components/FlagBadge";
import { getProductSummary, getProductReviews, getProducts, getCategories } from "@/lib/api";

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

const trustColor = (s: number) => s >= 0.7 ? "#4ECDC4" : s >= 0.5 ? "#FFB547" : "#FF6B6B";

export default function ProductsPage() {
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

  useEffect(() => { getCategories().then(setCategories).catch(() => {}); }, []);

  async function handleCategoryClick(cat: string) {
    setActiveCategory(cat); setProductsLoading(true);
    try {
      const prods = await getProducts(cat);
      setProductList(prods);
    } catch {}
    setProductsLoading(false);
    setSummary(null); setReviews([]); setAsin(""); setDeepDone(false);
  }

  async function handleProductClick(selectedAsin: string) {
    setAsin(selectedAsin); setLoading(true); setSummary(null); setReviews([]); setDeepDone(false);
    try {
      const [s, r] = await Promise.all([getProductSummary(selectedAsin), getProductReviews(selectedAsin, 100)]);
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
    <div className="min-h-screen p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(96,165,250,0.2)", border: "1px solid rgba(96,165,250,0.3)" }}>
          <Package className="w-4 h-4" style={{ color: "#60A5FA" }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Products</h1>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Browse by category and inspect review health</p>
        </div>
      </div>

      {!summary && (
        <>
          {!activeCategory ? (
            <>
              <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>Browse by category</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categories.map((c: any) => (
                  <button key={c.category} onClick={() => handleCategoryClick(c.category)}
                    className="p-4 rounded-xl text-left transition-all hover:scale-[1.01]" style={GLASS}>
                    <p className="text-sm font-medium text-white">{c.category}</p>
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{c.product_count} products</p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button onClick={() => { setActiveCategory(null); setProductList([]); }}
                className="flex items-center gap-1.5 text-xs mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back to categories
              </button>
              <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>{activeCategory}</p>
              {productsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {productList.map((p: any) => (
                    <button key={p.asin} onClick={() => handleProductClick(p.asin)}
                      className="p-4 rounded-xl text-left transition-all hover:scale-[1.01]" style={GLASS}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>{p.asin}</p>
                        <span className="text-xs font-semibold" style={{ color: trustColor(p.avg_trust_score) }}>
                          {Math.round((p.avg_trust_score ?? 1) * 100)}/100
                        </span>
                      </div>
                      <div className="flex gap-3 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                        <span>{p.review_count} reviews</span>
                        <span>{p.avg_rating}★</span>
                        {p.flagged_count > 0 && <span style={{ color: "#FF6B6B" }}>{p.flagged_count} flagged</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {loading && <div className="text-sm animate-pulse mt-4" style={{ color: "rgba(255,255,255,0.4)" }}>Loading product data…</div>}

      {summary && (
        <>
          <button onClick={() => { setSummary(null); setReviews([]); setDeepDone(false); }}
            className="flex items-center gap-1.5 text-xs mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back to products
          </button>

          <div className="flex items-center gap-3 mb-6">
            <button onClick={handleDeepScan} disabled={deepLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#A78BFA" }}>
              <Zap className={`w-4 h-4 ${deepLoading ? "animate-pulse" : ""}`} />
              {deepLoading ? "Running deep scan…" : "Deep Scan"}
            </button>
            {deepDone && <span className="text-xs" style={{ color: "#A78BFA" }}>✓ Similarity + LLM signals applied</span>}
            {!deepDone && !deepLoading && <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Run similarity + LLM analysis on all reviews</span>}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="col-span-1 p-5 flex flex-col items-center justify-center" style={GLASS}>
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Health Score</p>
              <TrustGauge score={summary.avg_trust_score ?? 0} size={110} />
            </div>
            <div className="p-5" style={GLASS}>
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Total Reviews</p>
              <p className="text-3xl font-bold text-white">{summary.total_reviews}</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>avg {summary.avg_rating}★</p>
            </div>
            <div className="p-5" style={GLASS}>
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#FF6B6B" }}>Flagged</p>
              <p className="text-3xl font-bold" style={{ color: "#FF6B6B" }}>{summary.flagged_count ?? 0}</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                {summary.total_reviews ? ((summary.flagged_count / summary.total_reviews) * 100).toFixed(1) : 0}% of total
              </p>
            </div>
          </div>

          {reviews.length > 0 && (
            <div className="p-6 mb-6" style={GLASS}>
              <p className="text-sm font-medium mb-4 text-white">Authenticity Breakdown</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={chartData} barCategoryGap="40%">
                  <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "rgba(13,11,30,0.9)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "white" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    <Cell fill="#4ECDC4" /><Cell fill="#FF6B6B" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {flaggedReviews.length > 0 && (
            <div className="p-6" style={GLASS}>
              <p className="text-sm font-medium mb-4 text-white">Flagged Reviews</p>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {flaggedReviews.slice(0, 20).map((r: any) => (
                  <div key={r.review_id} className="p-3 rounded-xl"
                    style={{ background: "rgba(255,107,107,0.06)", border: "1px solid rgba(255,107,107,0.15)" }}>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs" style={{ color: "#FFB547" }}>{"★".repeat(Math.round(r.rating ?? 0))}</span>
                      <span className="text-xs font-medium" style={{ color: "#FF6B6B" }}>Trust: {Math.round((r.trust_score ?? 0) * 100)}</span>
                      <FlagBadge type="rule" active={r.rule_flagged} />
                      <FlagBadge type="ring" active={r.ring_flagged} />
                      <FlagBadge type="llm" active={r.llm_flagged} />
                    </div>
                    <p className="text-xs line-clamp-2" style={{ color: "rgba(255,255,255,0.5)" }}>{r.review_text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
