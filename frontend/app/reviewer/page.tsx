"use client";
import { useState, useEffect } from "react";
import { User, ArrowLeft, ShieldAlert, AlertTriangle, ShieldCheck, Users } from "lucide-react";
import { Nav } from "@/components/Nav";
import { listReviewers, getReviewerProfile } from "@/lib/api";

const RISK_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  high:    { label: "High",   color: "text-red-400 bg-red-500/10 border-red-500/20",        dot: "bg-red-400" },
  medium:  { label: "Medium", color: "text-amber-400 bg-amber-500/10 border-amber-500/20",  dot: "bg-amber-400" },
  low:     { label: "Low",    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-400" },
  unknown: { label: "—",      color: "text-slate-400 bg-slate-700/40 border-slate-600/30",  dot: "bg-slate-500" },
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

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-[#080d1a] p-6 md:p-10 pt-20 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Users className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-100">Reviewer Profiles</h1>
            <p className="text-xs text-slate-500">Browse, filter, and inspect reviewers</p>
          </div>
        </div>

        {/* Profile detail view */}
        {profile ? (
          <div>
            <button onClick={() => setProfile(null)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 mb-5 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to reviewers
            </button>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-100">{profile.user_id}</p>
                  <p className="text-xs text-slate-500">{profile.review_count} review{profile.review_count !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${riskCfg(profile.risk_level).color}`}>
                {profile.risk_level === "high" && <ShieldAlert className="w-3.5 h-3.5" />}
                {profile.risk_level === "medium" && <AlertTriangle className="w-3.5 h-3.5" />}
                {profile.risk_level === "low" && <ShieldCheck className="w-3.5 h-3.5" />}
                {riskCfg(profile.risk_level).label} Risk
              </span>
            </div>

            {profile.summary && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 mb-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Analysis</p>
                <p className="text-sm text-slate-300 leading-relaxed">{profile.summary}</p>
              </div>
            )}

            {profile.reviews?.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-4">
                  Products Reviewed ({profile.reviews.length})
                </p>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {profile.reviews.map((r: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
                      <span className="text-xs text-amber-400 shrink-0 mt-0.5">{"★".repeat(Math.round(r.rating ?? 0))}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-violet-400 font-mono mb-0.5">{r.asin}</p>
                        <p className="text-xs text-slate-400 truncate">{r.review_text || "—"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${r.verified_purchase ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-slate-500 bg-slate-800 border-slate-700"}`}>
                          {r.verified_purchase ? "verified" : "unverified"}
                        </span>
                        <span className="text-xs text-slate-500">{Math.round((r.trust_score ?? 1) * 100)}/100</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-5">
              {/* Sort */}
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs focus:outline-none focus:border-violet-500/50">
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              {/* Risk filter */}
              <select value={risk} onChange={e => setRisk(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs focus:outline-none focus:border-violet-500/50">
                <option value="">All risk levels</option>
                <option value="high">High risk</option>
                <option value="medium">Medium risk</option>
                <option value="low">Low risk</option>
              </select>

              {/* Ring filter */}
              <select value={ring} onChange={e => setRing(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs focus:outline-none focus:border-violet-500/50">
                <option value="">All reviewers</option>
                <option value="true">Ring members only</option>
                <option value="false">Non-ring only</option>
              </select>

              <span className="ml-auto text-xs text-slate-500 self-center">{reviewers.length} reviewers</span>
            </div>

            {/* Reviewer list */}
            {listLoading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-800 animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {reviewers.map((r: any) => {
                  const cfg = riskCfg(r.risk_level);
                  return (
                    <button key={r.user_id} onClick={() => openProfile(r.user_id)}
                      className="w-full p-4 rounded-xl border border-slate-700 bg-slate-900/40 hover:border-violet-500/40 hover:bg-violet-500/5 text-left transition-all flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-mono text-slate-200">{r.user_id}</p>
                          {r.ring_member && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400">ring</span>
                          )}
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        <div className="flex gap-3 text-xs text-slate-500">
                          <span>{r.review_count} reviews</span>
                          {r.rule_flags > 0 && <span>{r.rule_flags} rule flags</span>}
                          {r.llm_flags > 0 && <span>{r.llm_flags} LLM flags</span>}
                        </div>
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${
                        r.avg_trust_score >= 0.7 ? "text-emerald-400" : r.avg_trust_score >= 0.5 ? "text-amber-400" : "text-red-400"
                      }`}>
                        {Math.round((r.avg_trust_score ?? 1) * 100)}/100
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {profileLoading && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
                <div className="text-slate-300 text-sm animate-pulse">Loading profile…</div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
