"use client";
import { useState, useEffect } from "react";
import { ShoppingBag, ChevronDown, ChevronUp, Zap, ArrowLeft } from "lucide-react";
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

export default function ShopperPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [productList, setProductList] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [asin, setAsin] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepDone, setDeepDone] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

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
      const [s, r] = await Promise.all([getProductSummary(selectedAsin), getProductReviews(selectedAsin, 30)]);
      setSummary(s); setReviews(r);
    } catch {}
    setLoading(false);
  }

  async function handleDeepScan() {
    if (!asin) return;
    setDeepLoading(true);
    try {
      const r = await getProductReviews(asin, 30, true);
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
    <div className="min-h-screen p-6 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "#5BBF8F22", boxShadow: "0 2px 8px #5BBF8F33" }}>
          <ShoppingBag className="w-4 h-4" style={{ color: "#5BBF8F" }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#2C1A0E" }}>Shopper View</h1>
          <p className="text-xs" style={{ color: "#8B6F5E" }}>Check if a product&apos;s reviews are trustworthy</p>
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
                className="flex items-center gap-1.5 text-xs mb-4 transition-colors" style={{ color: "#8B6F5E" }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back to categories
              </button>
              <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "#B8A090" }}>{activeCategory}</p>
              {productsLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#EDE6DC" }} />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {productList.map((p: any) => (
                    <button key={p.asin} onClick={() => handleProductClick(p.asin)}
                      className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.005] flex items-center justify-between" style={NEU_CARD}>
                      <div>
                        <p className="text-xs font-mono mb-1" style={{ color: "#8B6F5E" }}>{p.asin}</p>
                        <div className="flex gap-3 text-xs" style={{ color: "#B8A090" }}>
                          <span>{p.review_count} reviews</span>
                          <span>{p.avg_rating}★</span>
                          {p.flagged_count > 0 && <span style={{ color: "#E85D4A" }}>{p.flagged_count} flagged</span>}
                        </div>
                      </div>
                      <span className="text-sm font-bold" style={{ color: trustColor(p.avg_trust_score) }}>
                        {Math.round((p.avg_trust_score ?? 1) * 100)}/100
                      </span>
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
            className="flex items-center gap-1.5 text-xs mb-4 transition-colors" style={{ color: "#8B6F5E" }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back to products
          </button>

          <div className="flex items-center gap-3 mb-4">
            <button onClick={handleDeepScan} disabled={deepLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              style={{ background: "#7B6CF618", border: "1px solid #7B6CF630", color: "#7B6CF6", boxShadow: "0 2px 8px #7B6CF620" }}>
              <Zap className={`w-4 h-4 ${deepLoading ? "animate-pulse" : ""}`} />
              {deepLoading ? "Running deep scan…" : "Deep Scan"}
            </button>
            {deepDone && <span className="text-xs" style={{ color: "#7B6CF6" }}>✓ Similarity + LLM signals applied</span>}
            {!deepDone && !deepLoading && <span className="text-xs" style={{ color: "#B8A090" }}>Run LLM analysis on each review</span>}
          </div>

          <div className="p-6 mb-6" style={NEU_CARD}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "#B8A090" }}>Trust Score</p>
                <TrustGauge score={summary.avg_trust_score ?? 0} size={140} />
              </div>
              <div className="text-right space-y-3">
                <div>
                  <p className="text-xs" style={{ color: "#B8A090" }}>Total Reviews</p>
                  <p className="text-2xl font-bold" style={{ color: "#2C1A0E" }}>{summary.total_reviews}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "#B8A090" }}>Flagged</p>
                  <p className="text-2xl font-bold" style={{ color: "#E85D4A" }}>{summary.flagged_count ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "#B8A090" }}>Avg Rating</p>
                  <p className="text-2xl font-bold" style={{ color: "#F5A623" }}>{summary.avg_rating ?? "—"}★</p>
                </div>
              </div>
            </div>
          </div>

          {reviews.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "#B8A090" }}>Reviews — sorted by trust</p>
              {reviews.map((r: any) => {
                const score = r.trust_score ?? 1;
                const isSuspicious = score < 0.5;
                const isExpanded = expanded === r.review_id;
                return (
                  <div key={r.review_id}
                    className="rounded-xl p-4 cursor-pointer transition-all"
                    style={isSuspicious
                      ? { background: "#E85D4A08", border: "1px solid #E85D4A25" }
                      : { background: "#5BBF8F08", border: "1px solid #5BBF8F25" }}
                    onClick={() => setExpanded(isExpanded ? null : r.review_id)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-sm" style={{ color: "#F5A623" }}>{"★".repeat(Math.round(r.rating ?? 0))}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={isSuspicious
                              ? { background: "#E85D4A15", color: "#E85D4A", border: "1px solid #E85D4A30" }
                              : { background: "#5BBF8F15", color: "#5BBF8F", border: "1px solid #5BBF8F30" }}>
                            {Math.round(score * 100)}/100
                          </span>
                          <FlagBadge type="rule" active={r.rule_flagged} />
                          <FlagBadge type="ring" active={r.ring_flagged} />
                          <FlagBadge type="llm" active={r.llm_flagged} />
                        </div>
                        <p className={`text-sm ${isExpanded ? "" : "line-clamp-2"}`} style={{ color: "#2C1A0E" }}>{r.review_text}</p>
                        {r.llm_explanation && isExpanded && (
                          <p className="mt-2 text-xs italic pt-2" style={{ color: "#8B6F5E", borderTop: "1px solid rgba(166,134,110,0.2)" }}>AI: {r.llm_explanation}</p>
                        )}
                      </div>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 shrink-0 mt-1" style={{ color: "#B8A090" }} />
                        : <ChevronDown className="w-4 h-4 shrink-0 mt-1" style={{ color: "#B8A090" }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
