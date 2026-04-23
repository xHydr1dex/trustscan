"use client";
import { useState, useEffect } from "react";
import { User, ArrowLeft, ShieldAlert, AlertTriangle, ShieldCheck, Users } from "lucide-react";
import { listReviewers, getReviewerProfile } from "@/lib/api";

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

const RISK_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  high:    { label: "High",   color: "#E85D4A", dot: "#E85D4A" },
  medium:  { label: "Medium", color: "#F5A623", dot: "#F5A623" },
  low:     { label: "Low",    color: "#5BBF8F", dot: "#5BBF8F" },
  unknown: { label: "—",      color: "#B8A090", dot: "#B8A090" },
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
    const data = await listReviewers(params);
    setReviewers(data);
    setListLoading(false);
  }

  useEffect(() => { fetchList(); }, [risk, ring, sort]);

  async function openProfile(userId: string) {
    setProfileLoading(true);
    const data = await getReviewerProfile(userId);
    setProfile(data);
    setProfileLoading(false);
  }

  const riskCfg = (r: string) => RISK_CONFIG[r] ?? RISK_CONFIG.unknown;

  const selectStyle = {
    background: "#EDE6DC",
    boxShadow: "inset 3px 3px 8px rgba(166,134,110,0.22), inset -3px -3px 8px rgba(255,255,255,0.65)",
    borderRadius: "12px",
    color: "#2C1A0E",
    border: "none",
    padding: "8px 12px",
    fontSize: "12px",
    outline: "none",
  };

  return (
    <div className="min-h-screen p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "#7B6CF622", boxShadow: "0 2px 8px #7B6CF633" }}>
          <Users className="w-4 h-4" style={{ color: "#7B6CF6" }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#2C1A0E" }}>Reviewer Profiles</h1>
          <p className="text-xs" style={{ color: "#8B6F5E" }}>Browse, filter, and inspect reviewers</p>
        </div>
      </div>

      {profile ? (
        <div>
          <button onClick={() => setProfile(null)}
            className="flex items-center gap-1.5 text-xs mb-5 transition-colors" style={{ color: "#8B6F5E" }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back to reviewers
          </button>

          <div className="p-5 flex items-start justify-between gap-4 mb-4" style={NEU_CARD}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={NEU_INSET}>
                <User className="w-5 h-5" style={{ color: "#8B6F5E" }} />
              </div>
              <div>
                <p className="text-lg font-semibold" style={{ color: "#2C1A0E" }}>{profile.user_id}</p>
                <p className="text-xs" style={{ color: "#8B6F5E" }}>{profile.review_count} review{profile.review_count !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: riskCfg(profile.risk_level).color + "18", color: riskCfg(profile.risk_level).color, border: `1px solid ${riskCfg(profile.risk_level).color}30` }}>
              {profile.risk_level === "high" && <ShieldAlert className="w-3.5 h-3.5" />}
              {profile.risk_level === "medium" && <AlertTriangle className="w-3.5 h-3.5" />}
              {profile.risk_level === "low" && <ShieldCheck className="w-3.5 h-3.5" />}
              {riskCfg(profile.risk_level).label} Risk
            </span>
          </div>

          {profile.summary && (
            <div className="p-5 mb-4" style={NEU_CARD}>
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#B8A090" }}>Analysis</p>
              <p className="text-sm leading-relaxed" style={{ color: "#2C1A0E" }}>{profile.summary}</p>
            </div>
          )}

          {profile.reviews?.length > 0 && (
            <div className="p-5" style={NEU_CARD}>
              <p className="text-xs uppercase tracking-wider mb-4" style={{ color: "#B8A090" }}>
                Products Reviewed ({profile.reviews.length})
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {profile.reviews.map((r: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={NEU_INSET}>
                    <span className="text-xs shrink-0 mt-0.5" style={{ color: "#F5A623" }}>{"★".repeat(Math.round(r.rating ?? 0))}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono mb-0.5" style={{ color: "#7B6CF6" }}>{r.asin}</p>
                      <p className="text-xs truncate" style={{ color: "#8B6F5E" }}>{r.review_text || "—"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={r.verified_purchase
                          ? { background: "#5BBF8F18", color: "#5BBF8F", border: "1px solid #5BBF8F30" }
                          : { background: "#B8A09018", color: "#B8A090" }}>
                        {r.verified_purchase ? "verified" : "unverified"}
                      </span>
                      <span className="text-xs" style={{ color: "#B8A090" }}>{Math.round((r.trust_score ?? 1) * 100)}/100</span>
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
            <span className="ml-auto text-xs self-center" style={{ color: "#B8A090" }}>{reviewers.length} reviewers</span>
          </div>

          {listLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#EDE6DC" }} />)}
            </div>
          ) : (
            <div className="space-y-2">
              {reviewers.map((r: any) => {
                const cfg = riskCfg(r.risk_level);
                return (
                  <button key={r.user_id} onClick={() => openProfile(r.user_id)}
                    className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.005] flex items-center gap-4" style={NEU_CARD}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.dot }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-mono" style={{ color: "#2C1A0E" }}>{r.user_id}</p>
                        {r.ring_member && (
                          <span className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: "#E85D4A18", border: "1px solid #E85D4A30", color: "#E85D4A" }}>ring</span>
                        )}
                        <span className="text-xs px-1.5 py-0.5 rounded"
                          style={{ background: cfg.color + "18", color: cfg.color, border: `1px solid ${cfg.color}30` }}>{cfg.label}</span>
                      </div>
                      <div className="flex gap-3 text-xs" style={{ color: "#B8A090" }}>
                        <span>{r.review_count} reviews</span>
                        {r.rule_flags > 0 && <span>{r.rule_flags} rule flags</span>}
                        {r.llm_flags > 0 && <span>{r.llm_flags} LLM flags</span>}
                      </div>
                    </div>
                    <span className="text-sm font-bold shrink-0"
                      style={{ color: r.avg_trust_score >= 0.7 ? "#5BBF8F" : r.avg_trust_score >= 0.5 ? "#F5A623" : "#E85D4A" }}>
                      {Math.round((r.avg_trust_score ?? 1) * 100)}/100
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {profileLoading && (
            <div className="fixed inset-0 bg-black/20 flex items-center justify-center">
              <div className="text-sm animate-pulse" style={{ color: "#2C1A0E" }}>Loading profile…</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
