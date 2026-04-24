"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell,
} from "recharts";
import { Shield, Star, Users, Package, AlertTriangle, TrendingUp, TrendingDown, ArrowRight, Zap, RefreshCw } from "lucide-react";
import { getOverviewStats, getOverviewTimeline, getOverviewTopRisks, getOverviewAlerts } from "@/lib/api";

const GLASS = {
  background: "rgba(255,255,255,0.07)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "16px",
} as React.CSSProperties;

const GLASS_DARK = {
  background: "rgba(0,0,0,0.2)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
} as React.CSSProperties;

function StatCard({
  label, value, sub, icon: Icon, color, trend, trendVal,
}: {
  label: string; value: string | number; sub?: string;
  icon: any; color: string; trend?: "up" | "down"; trendVal?: number;
}) {
  return (
    <div className="p-5 relative overflow-hidden" style={GLASS}>
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ background: `radial-gradient(circle at 80% 20%, ${color}, transparent 60%)` }}
      />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${color}22`, border: `1px solid ${color}40` }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          {trend && trendVal !== undefined && (
            <span
              className="flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full"
              style={trend === "up"
                ? { background: "rgba(255,107,107,0.15)", color: "#FF6B6B" }
                : { background: "rgba(78,205,196,0.15)", color: "#4ECDC4" }}
            >
              {trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trendVal)}%
            </span>
          )}
        </div>
        <p className="text-2xl font-bold mb-0.5 text-white">{value}</p>
        <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</p>
        {sub && <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>{sub}</p>}
      </div>
    </div>
  );
}

function TrustPill({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.7 ? "#4ECDC4" : score >= 0.5 ? "#FFB547" : "#FF6B6B";
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color, border: `1px solid ${color}40` }}>
      {pct}/100
    </span>
  );
}

const SIGNAL_COLORS: Record<string, string> = {
  "Rule Engine":    "#FFB547",
  "Similarity":     "#A78BFA",
  "Ring Detection": "#FF6B6B",
  "LLM Judge":      "#60A5FA",
};

function Skeleton() {
  return (
    <div className="p-6 lg:p-8 max-w-6xl animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl" style={{ background: "rgba(255,255,255,0.06)" }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2 h-64 rounded-2xl" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="h-64 rounded-2xl" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-72 rounded-2xl" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="h-72 rounded-2xl" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [stats, setStats]       = useState<any>({});
  const [timeline, setTimeline] = useState<any[]>([]);
  const [topRisks, setTopRisks] = useState<any>({});
  const [alerts, setAlerts]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    Promise.all([
      getOverviewStats(),
      getOverviewTimeline(),
      getOverviewTopRisks(),
      getOverviewAlerts(6),
    ]).then(([s, t, r, a]) => {
      setStats(s ?? {});
      setTimeline(Array.isArray(t) ? t : []);
      setTopRisks(r ?? {});
      setAlerts(Array.isArray(a) ? a : []);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      setError(true);
    });
  }

  useEffect(() => { load(); }, []);

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,107,107,0.15)", border: "1px solid rgba(255,107,107,0.3)" }}>
          <AlertTriangle className="w-7 h-7" style={{ color: "#FF6B6B" }} />
        </div>
        <p className="text-lg font-semibold text-white">Backend unavailable</p>
        <p className="text-sm text-center max-w-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
          Could not reach the API. The backend may still be starting up.
        </p>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white mt-1"
          style={{ background: "rgba(124,58,237,0.3)", border: "1px solid rgba(124,58,237,0.5)" }}>
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const total     = stats.total_reviews     ?? 0;
  const flagged   = stats.suspicious_reviews ?? 0;
  const reviewers = stats.reviewers_flagged  ?? 0;
  const products  = stats.products_affected  ?? 0;

  const signalBreakdown = topRisks?.signal_breakdown
    ? Object.entries(topRisks.signal_breakdown).map(([name, count]) => ({ name, count }))
    : [];

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Overview</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>Platform-wide trust signals and detection summary</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl transition-all" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <RefreshCw className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Reviews Scanned"    value={total.toLocaleString()}     icon={Star}          color="#A78BFA" />
        <StatCard label="Suspicious Reviews" value={flagged.toLocaleString()}
          sub={total ? `${((flagged / total) * 100).toFixed(1)}% of total` : undefined}
          icon={AlertTriangle} color="#FF6B6B"
          trend={(stats.pct_suspicious ?? 0) > 0 ? "up" : "down"} trendVal={Math.abs(stats.pct_suspicious ?? 0)} />
        <StatCard label="Reviewers Flagged"  value={reviewers.toLocaleString()} icon={Users}         color="#FFB547"
          trend={(stats.pct_ring ?? 0) > 0 ? "up" : "down"} trendVal={Math.abs(stats.pct_ring ?? 0)} />
        <StatCard label="Products Affected"  value={products.toLocaleString()}  icon={Package}       color="#60A5FA"
          trend={(stats.pct_products ?? 0) > 0 ? "up" : "down"} trendVal={Math.abs(stats.pct_products ?? 0)} />
      </div>

      {/* Timeline + Signal Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Timeline */}
        <div className="lg:col-span-2 p-5" style={GLASS}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-white">Suspicious Activity Over Time</p>
          </div>
          <div className="rounded-xl px-2 py-3" style={GLASS_DARK}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={timeline} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
                  tickFormatter={(v: string) => v.slice(5)} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(20,15,40,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12, color: "white" }}
                  cursor={{ stroke: "#7C3AED", strokeWidth: 1, strokeDasharray: "4 4" }}
                />
                <Area type="monotone" dataKey="flagged" stroke="#A78BFA" strokeWidth={2} fill="url(#areaGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Signal breakdown */}
        <div className="p-5" style={GLASS}>
          <p className="text-sm font-semibold text-white mb-4">Top Risk Indicators</p>
          <div className="rounded-xl px-2 py-3" style={GLASS_DARK}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={signalBreakdown} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }} axisLine={false} tickLine={false} width={85} />
                <Tooltip
                  contentStyle={{ background: "rgba(20,15,40,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12, color: "white" }}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {signalBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={SIGNAL_COLORS[entry.name] ?? "#A78BFA"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Products + Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Top risk products */}
        <div className="p-5" style={GLASS}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-white">Top Risk Products</p>
            <Link href="/products" className="text-xs flex items-center gap-1" style={{ color: "#A78BFA" }}>
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {(topRisks?.top_products ?? []).map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={GLASS_DARK}>
                <span className="text-xs font-bold w-5 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>#{i + 1}</span>
                <span className="text-xs font-mono flex-1 truncate" style={{ color: "#A78BFA" }}>{p.asin}</span>
                <span className="text-xs shrink-0" style={{ color: "#FF6B6B" }}>{p.flagged_count} flagged</span>
                <TrustPill score={p.avg_trust} />
              </div>
            ))}
            {(topRisks?.top_products ?? []).length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: "rgba(255,255,255,0.25)" }}>No data</p>
            )}
          </div>
        </div>

        {/* Recent alerts */}
        <div className="p-5" style={GLASS}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-white">Recent Alerts</p>
            <Link href="/reviews" className="text-xs flex items-center gap-1" style={{ color: "#A78BFA" }}>
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {alerts.map((a: any, i: number) => (
              <div key={i} className="px-3 py-2.5 rounded-xl" style={GLASS_DARK}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono" style={{ color: "#A78BFA" }}>{a.user_id}</span>
                  <div className="flex gap-1">
                    {a.ring_flagged  && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,107,107,0.15)", color: "#FF6B6B" }}>ring</span>}
                    {a.rule_flagged  && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,181,71,0.15)",  color: "#FFB547" }}>rule</span>}
                    {a.llm_flagged   && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(96,165,250,0.15)",   color: "#60A5FA" }}>llm</span>}
                  </div>
                </div>
                <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{a.preview || "—"}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>{a.asin}</span>
                  <TrustPill score={a.trust_score ?? 0} />
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: "rgba(255,255,255,0.25)" }}>No alerts</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-5" style={GLASS}>
        <p className="text-sm font-semibold text-white mb-4">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/products", label: "Browse Products",  icon: Package,      color: "#60A5FA" },
            { href: "/reviewer", label: "Check Reviewers",  icon: Users,        color: "#A78BFA" },
            { href: "/platform", label: "Ring Detection",   icon: Shield,       color: "#FF6B6B" },
            { href: "/analyst",  label: "Ask AI Analyst",   icon: Zap,          color: "#FFB547" },
          ].map(({ href, label, icon: Icon, color }) => (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:scale-[1.03]"
              style={GLASS_DARK}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span className="text-xs font-medium text-center leading-tight" style={{ color: "rgba(255,255,255,0.6)" }}>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
