"use client";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { FlagBadge } from "@/components/FlagBadge";
import { getOverviewAlerts } from "@/lib/api";

const GLASS = {
  background: "rgba(255,255,255,0.07)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "16px",
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOverviewAlerts(50)
      .then(data => setReviews(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,107,107,0.2)", border: "1px solid rgba(255,107,107,0.3)" }}>
          <Star className="w-4 h-4" style={{ color: "#FF6B6B" }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Suspicious Reviews</h1>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Reviews with lowest trust scores</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />)}
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r: any, i: number) => (
            <div key={i} className="p-4" style={GLASS}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono" style={{ color: "#A78BFA" }}>{r.user_id}</span>
                  <span className="text-xs font-mono" style={{ color: "#60A5FA" }}>{r.asin}</span>
                  <span className="text-xs" style={{ color: "#FFB547" }}>{"★".repeat(Math.round(r.rating ?? 0))}</span>
                </div>
                <span className="text-xs font-bold shrink-0 px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,107,107,0.15)", color: "#FF6B6B" }}>
                  {Math.round((r.trust_score ?? 0) * 100)}/100
                </span>
              </div>
              <p className="text-sm mb-2" style={{ color: "rgba(255,255,255,0.8)" }}>{r.preview}</p>
              <div className="flex gap-1.5">
                <FlagBadge type="rule" active={r.rule_flagged} />
                <FlagBadge type="ring" active={r.ring_flagged} />
                <FlagBadge type="llm" active={r.llm_flagged} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
