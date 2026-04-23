"use client";
import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { RingNetwork } from "@/components/RingNetwork";
import { getStats, getRings } from "@/lib/api";

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

export default function PlatformPage() {
  const [stats, setStats] = useState<any>(null);
  const [rings, setRings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getRings(false)])
      .then(([s, r]) => { setStats(s); setRings(r); })
      .finally(() => setLoading(false));
  }, []);

  const flaggedPct = stats?.total_reviews
    ? ((stats.flagged_reviews / stats.total_reviews) * 100).toFixed(1)
    : "0";

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "#7B6CF622", boxShadow: "0 2px 8px #7B6CF633" }}>
          <Shield className="w-4 h-4" style={{ color: "#7B6CF6" }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#2C1A0E" }}>Analytics</h1>
          <p className="text-xs" style={{ color: "#8B6F5E" }}>Global fake review monitoring</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "#EDE6DC" }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Reviews" value={stats?.total_reviews?.toLocaleString() ?? "—"} />
          <StatCard label="Processed" value={stats?.processed_reviews?.toLocaleString() ?? "—"} sub="scored by pipeline" accent="emerald" />
          <StatCard label="Flagged" value={`${flaggedPct}%`} sub={`${stats?.flagged_reviews?.toLocaleString()} reviews`} accent="red" />
          <StatCard label="Ring Members" value={stats?.ring_members_detected?.toLocaleString() ?? "—"} sub="coordinated reviewers" accent="violet" />
        </div>
      )}

      {/* Ring network */}
      <div className="p-6 mb-6" style={NEU_CARD}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold" style={{ color: "#2C1A0E" }}>Reviewer Ring Network</h2>
            <p className="text-xs mt-0.5" style={{ color: "#8B6F5E" }}>
              Coordinated groups detected across {rings?.total_rings ?? 0} rings
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: "#7B6CF618", border: "1px solid #7B6CF630", color: "#7B6CF6" }}>
            {rings?.total_rings ?? 0} rings
          </span>
        </div>
        <div style={NEU_INSET} className="p-2">
          <RingNetwork rings={rings?.rings ?? []} />
        </div>
      </div>

      {/* Ring list */}
      {rings?.rings?.length > 0 && (
        <div className="p-6" style={NEU_CARD}>
          <h2 className="font-semibold mb-4" style={{ color: "#2C1A0E" }}>Ring Details</h2>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {rings.rings.map((ring: any) => (
              <div key={ring.id} className="flex items-center gap-3 p-3 rounded-xl" style={NEU_INSET}>
                <span className="shrink-0 w-16 text-center text-xs font-semibold px-2 py-1 rounded-lg"
                  style={{ background: "#7B6CF618", color: "#7B6CF6", border: "1px solid #7B6CF630" }}>
                  {ring.size} users
                </span>
                <p className="text-xs truncate" style={{ color: "#8B6F5E" }}>{ring.members.join(" · ")}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
