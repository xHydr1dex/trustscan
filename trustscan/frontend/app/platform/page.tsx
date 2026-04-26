"use client";
import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { RingNetwork } from "@/components/RingNetwork";
import { getStats, getRings } from "@/lib/api";

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

export default function PlatformPage() {
  const [stats, setStats] = useState<any>(null);
  const [rings, setRings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getRings(false)])
      .then(([s, r]) => { setStats(s); setRings(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const flaggedPct = stats?.total_reviews
    ? ((stats.flagged_reviews / stats.total_reviews) * 100).toFixed(1)
    : "0";

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)" }}>
          <Shield className="w-4 h-4" style={{ color: "#A78BFA" }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Analytics</h1>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Global fake review monitoring</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
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

      <div className="p-6 mb-6" style={GLASS}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-white">Reviewer Ring Network</h2>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              Coordinated groups detected across {rings?.total_rings ?? 0} rings
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#A78BFA" }}>
            {rings?.total_rings ?? 0} rings
          </span>
        </div>
        <div style={GLASS_DARK} className="p-2">
          <RingNetwork rings={rings?.rings ?? []} />
        </div>
      </div>

      {rings?.rings?.length > 0 && (
        <div className="p-6" style={GLASS}>
          <h2 className="font-semibold mb-4 text-white">Ring Details</h2>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {rings.rings.map((ring: any) => (
              <div key={ring.id} className="flex items-center gap-3 p-3 rounded-xl" style={GLASS_DARK}>
                <span className="shrink-0 w-16 text-center text-xs font-semibold px-2 py-1 rounded-lg"
                  style={{ background: "rgba(167,139,250,0.15)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.3)" }}>
                  {ring.size} users
                </span>
                <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{ring.members.join(" · ")}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
