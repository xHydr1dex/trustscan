"use client";
import { useState, useEffect } from "react";
import { ShoppingBag, ChevronDown, ChevronUp, Zap, ArrowLeft } from "lucide-react";
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

const trustColor = (s: number) => s >= 0.7 ? "#4ECDC4" : s >= 0.5 ? "#FFB547" : "#FF6B6B";

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
          style={{ background: "rgba(78,205,196,0.2)", border: "1px solid rgba(78,205,196,0.3)" }}>
          <ShoppingBag className="w-4 h-4" style={{ color: "#4ECDC4" }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Shopper View</h1>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Check if a product&apos;s reviews are trustworthy</p>
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
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {productList.map((p: any) => (
                    <button key={p.asin} onClick={() => handleProductClick(p.asin)}
                      className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.005] flex items-center justify-between" style={GLASS}>
                      <div>
                        <p className="text-xs font-mono mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>{p.asin}</p>
                        <div className="flex gap-3 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                          <span>{p.review_count} reviews</span>
                          <span>{p.avg_rating}★</span>
                          {p.flagged_count > 0 && <span style={{ color: "#FF6B6B" }}>{p.flagged_count} flagged</span>}
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

      {loading && <div className="text-sm animate-pulse mt-4" style={{ color: "rgba(255,255,255,0.4)" }}>Loading product data…</div>}

      {summary && (
        <>
          <button onClick={() => { setSummary(null); setReviews([]); setDeepDone(false); }}
            className="flex items-center gap-1.5 text-xs mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back to products
          </button>

          <div className="flex items-center gap-3 mb-4">
            <button onClick={handleDeepScan} disabled={deepLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#A78BFA" }}>
              <Zap className={`w-4 h-4 ${deepLoading ? "animate-pulse" : ""}`} />
              {deepLoading ? "Running deep scan…" : "Deep Scan"}
            </button>
            {deepDone && <span className="text-xs" style={{ color: "#A78BFA" }}>✓ Similarity + LLM signals applied</span>}
            {!deepDone && !deepLoading && <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Run LLM analysis on each review</span>}
          </div>

          <div className="p-6 mb-6" style={GLASS}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>Trust Score</p>
                <TrustGauge score={summary.avg_trust_score ?? 0} size={140} />
              </div>
              <div className="text-right space-y-3">
                <div>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Total Reviews</p>
                  <p className="text-2xl font-bold text-white">{summary.total_reviews}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Flagged</p>
                  <p className="text-2xl font-bold" style={{ color: "#FF6B6B" }}>{summary.flagged_count ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Avg Rating</p>
                  <p className="text-2xl font-bold" style={{ color: "#FFB547" }}>{summary.avg_rating ?? "—"}★</p>
                </div>
              </div>
            </div>
          </div>

          {reviews.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>Reviews — sorted by trust</p>
              {reviews.map((r: any) => {
                const score = r.trust_score ?? 1;
                const isSuspicious = score < 0.5;
                const isExpanded = expanded === r.review_id;
                return (
                  <div key={r.review_id}
                    className="rounded-xl p-4 cursor-pointer transition-all"
                    style={isSuspicious
                      ? { background: "rgba(255,107,107,0.06)", border: "1px solid rgba(255,107,107,0.2)" }
                      : { background: "rgba(78,205,196,0.06)", border: "1px solid rgba(78,205,196,0.2)" }}
                    onClick={() => setExpanded(isExpanded ? null : r.review_id)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-sm" style={{ color: "#FFB547" }}>{"★".repeat(Math.round(r.rating ?? 0))}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={isSuspicious
                              ? { background: "rgba(255,107,107,0.15)", color: "#FF6B6B", border: "1px solid rgba(255,107,107,0.3)" }
                              : { background: "rgba(78,205,196,0.15)", color: "#4ECDC4", border: "1px solid rgba(78,205,196,0.3)" }}>
                            {Math.round(score * 100)}/100
                          </span>
                          <FlagBadge type="rule" active={r.rule_flagged} />
                          <FlagBadge type="ring" active={r.ring_flagged} />
                          <FlagBadge type="llm" active={r.llm_flagged} />
                        </div>
                        <p className={`text-sm ${isExpanded ? "" : "line-clamp-2"}`} style={{ color: "rgba(255,255,255,0.8)" }}>{r.review_text}</p>
                        {r.llm_explanation && isExpanded && (
                          <p className="mt-2 text-xs italic pt-2" style={{ color: "rgba(255,255,255,0.4)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>AI: {r.llm_explanation}</p>
                        )}
                      </div>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 shrink-0 mt-1" style={{ color: "rgba(255,255,255,0.3)" }} />
                        : <ChevronDown className="w-4 h-4 shrink-0 mt-1" style={{ color: "rgba(255,255,255,0.3)" }} />}
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
