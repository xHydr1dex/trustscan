"use client";
import { useState, useEffect } from "react";
import { Package, ArrowLeft, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrustGauge } from "@/components/TrustGauge";
import { FlagBadge } from "@/components/FlagBadge";
import { getProductSummary, getProductReviews, getProducts, getCategories } from "@/lib/api";

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

const trustColor = (s: number) => s >= 0.7 ? "#5BBF8F" : s >= 0.5 ? "#F5A623" : "#E85D4A";

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

  useEffect(() => { getCategories().then(setCategories); }, []);

  async function handleCategoryClick(cat: string) {
    setActiveCategory(cat); setProductsLoading(true);
    const prods = await getProducts(cat);
    setProductList(prods); setProductsLoading(false);
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
          style={{ background: "#4A9FD422", boxShadow: "0 2px 8px #4A9FD433" }}>
          <Package className="w-4 h-4" style={{ color: "#4A9FD4" }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#2C1A0E" }}>Products</h1>
          <p className="text-xs" style={{ color: "#8B6F5E" }}>Browse by category and inspect review health</p>
        </div>
      </div>

      {!summary && (
        <>
          {!activeCategory ? (
            <>
              <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "#B8A090" }}>Browse by category</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categories.map((c: any) => (
                  <button key={c.category} onClick={() => handleCategoryClick(c.category)}
                    className="p-4 rounded-xl text-left transition-all hover:scale-[1.01]" style={NEU_CARD}>
                    <p className="text-sm font-medium" style={{ color: "#2C1A0E" }}>{c.category}</p>
                    <p className="text-xs mt-1" style={{ color: "#8B6F5E" }}>{c.product_count} products</p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button onClick={() => { setActiveCategory(null); setProductList([]); }}
                className="flex items-center gap-1.5 text-xs mb-4" style={{ color: "#8B6F5E" }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back to categories
              </button>
              <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "#B8A090" }}>{activeCategory}</p>
              {productsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "#EDE6DC" }} />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {productList.map((p: any) => (
                    <button key={p.asin} onClick={() => handleProductClick(p.asin)}
                      className="p-4 rounded-xl text-left transition-all hover:scale-[1.01]" style={NEU_CARD}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-mono" style={{ color: "#8B6F5E" }}>{p.asin}</p>
                        <span className="text-xs font-semibold" style={{ color: trustColor(p.avg_trust_score) }}>
                          {Math.round((p.avg_trust_score ?? 1) * 100)}/100
                        </span>
                      </div>
                      <div className="flex gap-3 text-xs" style={{ color: "#B8A090" }}>
                        <span>{p.review_count} reviews</span>
                        <span>{p.avg_rating}★</span>
                        {p.flagged_count > 0 && <span style={{ color: "#E85D4A" }}>{p.flagged_count} flagged</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {loading && <div className="text-sm animate-pulse mt-4" style={{ color: "#B8A090" }}>Loading product data…</div>}

      {summary && (
        <>
          <button onClick={() => { setSummary(null); setReviews([]); setDeepDone(false); }}
            className="flex items-center gap-1.5 text-xs mb-4" style={{ color: "#8B6F5E" }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back to products
          </button>

          <div className="flex items-center gap-3 mb-6">
            <button onClick={handleDeepScan} disabled={deepLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              style={{ background: "#7B6CF618", border: "1px solid #7B6CF630", color: "#7B6CF6" }}>
              <Zap className={`w-4 h-4 ${deepLoading ? "animate-pulse" : ""}`} />
              {deepLoading ? "Running deep scan…" : "Deep Scan"}
            </button>
            {deepDone && <span className="text-xs" style={{ color: "#7B6CF6" }}>✓ Similarity + LLM signals applied</span>}
            {!deepDone && !deepLoading && <span className="text-xs" style={{ color: "#B8A090" }}>Run similarity + LLM analysis on all reviews</span>}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="col-span-1 p-5 flex flex-col items-center justify-center" style={NEU_CARD}>
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#B8A090" }}>Health Score</p>
              <TrustGauge score={summary.avg_trust_score ?? 0} size={110} />
            </div>
            <div className="p-5" style={NEU_CARD}>
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#B8A090" }}>Total Reviews</p>
              <p className="text-3xl font-bold" style={{ color: "#2C1A0E" }}>{summary.total_reviews}</p>
              <p className="text-xs mt-1" style={{ color: "#B8A090" }}>avg {summary.avg_rating}★</p>
            </div>
            <div className="p-5" style={NEU_CARD}>
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#E85D4A" }}>Flagged</p>
              <p className="text-3xl font-bold" style={{ color: "#E85D4A" }}>{summary.flagged_count ?? 0}</p>
              <p className="text-xs mt-1" style={{ color: "#B8A090" }}>
                {summary.total_reviews ? ((summary.flagged_count / summary.total_reviews) * 100).toFixed(1) : 0}% of total
              </p>
            </div>
          </div>

          {reviews.length > 0 && (
            <div className="p-6 mb-6" style={NEU_CARD}>
              <p className="text-sm font-medium mb-4" style={{ color: "#2C1A0E" }}>Authenticity Breakdown</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={chartData} barCategoryGap="40%">
                  <XAxis dataKey="name" tick={{ fill: "#8B6F5E", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#B8A090", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#F4EDE4", border: "none", borderRadius: 10, boxShadow: "0 4px 12px rgba(166,134,110,0.3)", color: "#2C1A0E" }} cursor={{ fill: "rgba(166,134,110,0.06)" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    <Cell fill="#5BBF8F" /><Cell fill="#E85D4A" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {flaggedReviews.length > 0 && (
            <div className="p-6" style={NEU_CARD}>
              <p className="text-sm font-medium mb-4" style={{ color: "#2C1A0E" }}>Flagged Reviews</p>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {flaggedReviews.slice(0, 20).map((r: any) => (
                  <div key={r.review_id} className="p-3 rounded-xl"
                    style={{ background: "#E85D4A0A", border: "1px solid #E85D4A20" }}>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs" style={{ color: "#F5A623" }}>{"★".repeat(Math.round(r.rating ?? 0))}</span>
                      <span className="text-xs font-medium" style={{ color: "#E85D4A" }}>Trust: {Math.round((r.trust_score ?? 0) * 100)}</span>
                      <FlagBadge type="rule" active={r.rule_flagged} />
                      <FlagBadge type="ring" active={r.ring_flagged} />
                      <FlagBadge type="llm" active={r.llm_flagged} />
                    </div>
                    <p className="text-xs line-clamp-2" style={{ color: "#8B6F5E" }}>{r.review_text}</p>
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
