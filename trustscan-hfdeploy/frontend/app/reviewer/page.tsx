"use client";
import { useState } from "react";
import { Search, User, AlertTriangle, ShieldCheck, ShieldAlert, Star } from "lucide-react";
import { Nav } from "@/components/Nav";
import { getReviewerProfile } from "@/lib/api";

const RISK_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  high:    { label: "High Risk",   color: "text-red-400 bg-red-500/10 border-red-500/20",     icon: ShieldAlert },
  medium:  { label: "Medium Risk", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: AlertTriangle },
  low:     { label: "Low Risk",    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: ShieldCheck },
  unknown: { label: "Unknown",     color: "text-slate-400 bg-slate-700/40 border-slate-600/30", icon: User },
};

export default function ReviewerPage() {
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function lookup(id?: string) {
    const uid = (id ?? userId).trim();
    if (!uid) return;
    setLoading(true); setError(""); setProfile(null);
    try {
      const data = await getReviewerProfile(uid);
      setProfile(data);
    } catch {
      setError(`Reviewer "${uid}" not found.`);
    } finally {
      setLoading(false);
    }
  }

  const risk = RISK_CONFIG[profile?.risk_level ?? "unknown"] ?? RISK_CONFIG.unknown;
  const RiskIcon = risk.icon;

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-[#080d1a] p-6 md:p-10 pt-20 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <User className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-100">Reviewer Profile</h1>
            <p className="text-xs text-slate-500">Look up any reviewer by user ID</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-8">
          <input
            className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors"
            placeholder="Enter user ID, e.g. U10921"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            onKeyDown={e => e.key === "Enter" && lookup()}
          />
          <button
            onClick={() => lookup()}
            disabled={loading || !userId.trim()}
            className="px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Search className="w-4 h-4" />
            {loading ? "Looking up…" : "Look up"}
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">{error}</div>
        )}

        {profile && (
          <div className="space-y-4">
            {/* Identity + risk */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-100">{profile.user_id}</p>
                  <p className="text-xs text-slate-500">{profile.review_count} review{profile.review_count !== 1 ? "s" : ""} on record</p>
                </div>
              </div>
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${risk.color}`}>
                <RiskIcon className="w-3.5 h-3.5" />
                {risk.label}
              </span>
            </div>

            {/* Summary */}
            {profile.summary && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Analysis</p>
                <p className="text-sm text-slate-300 leading-relaxed">{profile.summary}</p>
              </div>
            )}

            {/* Reviewed products */}
            {profile.reviews?.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-4">
                  Products Reviewed ({profile.reviews.length})
                </p>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {profile.reviews.map((r: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
                      <div className="shrink-0 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-amber-400">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {r.rating ?? "—"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-violet-400 font-mono mb-0.5">{r.asin}</p>
                        <p className="text-xs text-slate-400 truncate">{r.review_text ?? r.review ?? "—"}</p>
                      </div>
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${r.verified_purchase ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-slate-500 bg-slate-800 border-slate-700"}`}>
                        {r.verified_purchase ? "verified" : "unverified"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick examples */}
        {!profile && !error && (
          <div className="mt-4">
            <p className="text-xs text-slate-500 mb-3">Try a sample reviewer</p>
            <div className="flex flex-wrap gap-2">
              {["U10921", "U72637", "U45020"].map(uid => (
                <button key={uid} onClick={() => { setUserId(uid); lookup(uid); }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-violet-500/40 hover:text-violet-300 transition-colors font-mono">
                  {uid}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
