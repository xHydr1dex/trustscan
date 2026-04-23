"use client";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { FlagBadge } from "@/components/FlagBadge";
import { getOverviewAlerts } from "@/lib/api";

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

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOverviewAlerts(50).then(data => { setReviews(data); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "#E85D4A22", boxShadow: "0 2px 8px #E85D4A33" }}>
          <Star className="w-4 h-4" style={{ color: "#E85D4A" }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#2C1A0E" }}>Suspicious Reviews</h1>
          <p className="text-xs" style={{ color: "#8B6F5E" }}>Reviews with lowest trust scores</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "#EDE6DC" }} />)}
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r: any, i: number) => (
            <div key={i} className="p-4" style={NEU_CARD}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono" style={{ color: "#7B6CF6" }}>{r.user_id}</span>
                  <span className="text-xs font-mono" style={{ color: "#4A9FD4" }}>{r.asin}</span>
                  <span className="text-xs" style={{ color: "#F5A623" }}>{"★".repeat(Math.round(r.rating ?? 0))}</span>
                </div>
                <span className="text-xs font-bold shrink-0 px-2 py-0.5 rounded-full"
                  style={{ background: "#E85D4A18", color: "#E85D4A" }}>
                  {Math.round((r.trust_score ?? 0) * 100)}/100
                </span>
              </div>
              <p className="text-sm mb-2" style={{ color: "#2C1A0E" }}>{r.preview}</p>
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
