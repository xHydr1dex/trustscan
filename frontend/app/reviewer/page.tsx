"use client";
import { useState, useEffect } from "react";
import { User, ArrowLeft, ShieldAlert, AlertTriangle, ShieldCheck, Users } from "lucide-react";
import { listReviewers, getReviewerProfile } from "@/lib/api";

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

const RISK_CONFIG: Record<string, { label: string; color: string }> = {
  high:    { label: "High",   color: "#FF6B6B" },
  medium:  { label: "Medium", color: "#FFB547" },
  low:     { label: "Low",    color: "#4ECDC4" },
  unknown: { label: "—",      color: "rgba(255,255,255,0.3)" },
};

const SORT_OPTIONS = [
  { value: "trust_asc",    label: "Lowest trust first" },
  { value: "trust_desc",   label: "Highest trust first" },
  { value: "reviews_desc", label: "Most reviews first" },
];

export default function ReviewerPage() {
  const [reviewers, setReviewers] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [risk, setRisk] = useState("");
  const [ring, setRing] = useState<string>("");
  const [sort, setSort] = useState("trust_asc");
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  async function fetchList() {
    setListLoading(true);
    const params: any = { sort };
    if (risk) params.risk = risk;
    if (ring === "true") params.ring = true;
    if (ring === "false") params.ring = false;
    try {
      const data = await listReviewers(params);
      setReviewers(data);
    } catch {}
    setListLoading(false);
  }

  useEffect(() => { fetchList(); }, [risk, ring, sort]);

  async function openProfile(userId: string) {
    setProfileLoading(true);
    try {
      const data = await getReviewerProfile(userId);
      setProfile(data);
    } catch {}
    setProfileLoading(false);
  }

  const riskCfg = (r: string) => RISK_CONFIG[r] ?? RISK_CONFIG.unknown;

  const selectStyle = {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "10px",
    color: "rgba(255,255,255,0.8)",
    padding: "8px 12px",
    fontSize: "12px",
    outline: "none",
  };

  return (
    <div className="min-h-screen p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)" }}>
          <Users className="w-4 h-4" style={{ color: "#A78BFA" }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Reviewer Profiles</h1>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Browse, filter, and inspect reviewers</p>
        </div>
      </div>

      {profile ? (
        <div>
          <button onClick={() => setProfile(null)}
            className="flex items-center gap-1.5 text-xs mb-5 transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back to reviewers
          </button>

          <div className="p-5 flex items-start justify-between gap-4 mb-4" style={GLASS}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={GLASS_DARK}>
                <User className="w-5 h-5" style={{ color: "rgba(255,255,255,0.5)" }} />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">{profile.user_id}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{profile.review_count} review{profile.review_count !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: riskCfg(profile.risk_level).color + "20", color: riskCfg(profile.risk_level).color, border: `1px solid ${riskCfg(profile.risk_level).color}40` }}>
              {profile.risk_level === "high" && <ShieldAlert className="w-3.5 h-3.5" />}
              {profile.risk_level === "medium" && <AlertTriangle className="w-3.5 h-3.5" />}
              {profile.risk_level === "low" && <ShieldCheck className="w-3.5 h-3.5" />}
              {riskCfg(profile.risk_level).label} Risk
            </span>
          </div>

          {profile.summary && (
            <div className="p-5 mb-4" style={GLASS}>
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Analysis</p>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>{profile.summary}</p>
            </div>
          )}

          {profile.reviews?.length > 0 && (
            <div className="p-5" style={GLASS}>
              <p className="text-xs uppercase tracking-wider mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
                Products Reviewed ({profile.reviews.length})
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {profile.reviews.map((r: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={GLASS_DARK}>
                    <span className="text-xs shrink-0 mt-0.5" style={{ color: "#FFB547" }}>{"★".repeat(Math.round(r.rating ?? 0))}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono mb-0.5" style={{ color: "#A78BFA" }}>{r.asin}</p>
                      <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{r.review_text || "—"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={r.verified_purchase
                          ? { background: "rgba(78,205,196,0.15)", color: "#4ECDC4", border: "1px solid rgba(78,205,196,0.3)" }
                          : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}>
                        {r.verified_purchase ? "verified" : "unverified"}
                      </span>
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{Math.round((r.trust_score ?? 1) * 100)}/100</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-5">
            <select value={sort} onChange={e => setSort(e.target.value)} style={selectStyle as any}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={risk} onChange={e => setRisk(e.target.value)} style={selectStyle as any}>
              <option value="">All risk levels</option>
              <option value="high">High risk</option>
              <option value="medium">Medium risk</option>
              <option value="low">Low risk</option>
            </select>
            <select value={ring} onChange={e => setRing(e.target.value)} style={selectStyle as any}>
              <option value="">All reviewers</option>
              <option value="true">Ring members only</option>
              <option value="false">Non-ring only</option>
            </select>
            <span className="ml-auto text-xs self-center" style={{ color: "rgba(255,255,255,0.3)" }}>{reviewers.length} reviewers</span>
          </div>

          {listLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />)}
            </div>
          ) : (
            <div className="space-y-2">
              {reviewers.map((r: any) => {
                const cfg = riskCfg(r.risk_level);
                return (
                  <button key={r.user_id} onClick={() => openProfile(r.user_id)}
                    className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.005] flex items-center gap-4"
                    style={GLASS}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-mono text-white">{r.user_id}</p>
                        {r.ring_member && (
                          <span className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(255,107,107,0.15)", border: "1px solid rgba(255,107,107,0.3)", color: "#FF6B6B" }}>ring</span>
                        )}
                        <span className="text-xs px-1.5 py-0.5 rounded"
                          style={{ background: cfg.color + "20", color: cfg.color, border: `1px solid ${cfg.color}40` }}>{cfg.label}</span>
                      </div>
                      <div className="flex gap-3 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                        <span>{r.review_count} reviews</span>
                        {r.rule_flags > 0 && <span>{r.rule_flags} rule flags</span>}
                        {r.llm_flags > 0 && <span>{r.llm_flags} LLM flags</span>}
                      </div>
                    </div>
                    <span className="text-sm font-bold shrink-0"
                      style={{ color: r.avg_trust_score >= 0.7 ? "#4ECDC4" : r.avg_trust_score >= 0.5 ? "#FFB547" : "#FF6B6B" }}>
                      {Math.round((r.avg_trust_score ?? 1) * 100)}/100
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {profileLoading && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
              <div className="text-sm animate-pulse text-white">Loading profile…</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
