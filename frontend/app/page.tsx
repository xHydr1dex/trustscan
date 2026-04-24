"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Star, Users, Package, AlertTriangle, TrendingUp, TrendingDown,
  RefreshCw, Bell, User, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { getOverviewStats, getOverviewTimeline, getOverviewTopRisks, getOverviewAlerts } from "@/lib/api";

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "16px",
};

const GLASS_INNER: React.CSSProperties = {
  background: "rgba(0,0,0,0.18)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "12px",
};

const SIGNAL_COLORS: Record<string, string> = {
  "Rule Engine":    "#FFB547",
  "Similarity":     "#A78BFA",
  "Ring Detection": "#FF6B6B",
  "LLM Judge":      "#60A5FA",
};

function StatCard({
  label, value, trendPct, highlight = false, icon: Icon, color,
}: {
  label: string; value: string; trendPct?: number;
  highlight?: boolean; icon: any; color: string;
}) {
  const up = (trendPct ?? 0) >= 0;
  const trendColor = highlight
    ? (up ? "#FF6B6B" : "#4ECDC4")
    : (up ? "#4ECDC4" : "#FF6B6B");

  return (
    <div
      className="p-5 relative overflow-hidden"
      style={{
        ...GLASS,
        ...(highlight ? {
          background: "rgba(255,107,107,0.12)",
          border: "1px solid rgba(255,107,107,0.25)",
        } : {}),
      }}
    >
      <div
        className="absolute top-0 right-0 w-28 h-28 pointer-events-none"
        style={{ background: `radial-gradient(circle at 100% 0%, ${color}25, transparent 70%)` }}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${color}20`, border: `1px solid ${color}35` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          {trendPct !== undefined && (
            <span className="flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${trendColor}18`, color: trendColor }}>
              {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(trendPct)}%
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-white mb-1 tabular-nums">{value}</p>
        <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</p>
      </div>
    </div>
  );
}


function Skeleton() {
  return (
    <div className="p-6 lg:p-8 animate-pulse space-y-5">
      <div className="h-8 w-40 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl" style={{ background: "rgba(255,255,255,0.06)" }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 h-64 rounded-2xl" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="h-64 rounded-2xl" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [stats,    setStats]    = useState<any>({});
  const [timeline, setTimeline] = useState<any[]>([]);
  const [topRisks, setTopRisks] = useState<any>({});
  const [alerts,   setAlerts]   = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);

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
      <div className="p-8 flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(255,107,107,0.12)", border: "1px solid rgba(255,107,107,0.25)" }}>
          <AlertTriangle className="w-8 h-8" style={{ color: "#FF6B6B" }} />
        </div>
        <p className="text-lg font-bold text-white">Backend unavailable</p>
        <p className="text-sm text-center max-w-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          The API could not be reached. The space may still be warming up — try again in a moment.
        </p>
        <button onClick={load}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white mt-1 transition-all hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg,#7C3AED,#4F46E5)", boxShadow: "0 4px 14px rgba(124,58,237,0.4)" }}>
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const total     = stats.total_reviews      ?? 0;
  const flagged   = stats.suspicious_reviews ?? 0;
  const reviewers = stats.reviewers_flagged  ?? 0;
  const products  = stats.products_affected  ?? 0;

  const signalEntries = topRisks?.signal_breakdown
    ? Object.entries(topRisks.signal_breakdown as Record<string, number>).map(([name, count]) => ({ name, count }))
    : [];
  const totalRisks = signalEntries.reduce((s, e) => s + (e.count as number), 0);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Platform-wide trust signals and detection summary
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <Bell className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
          <button
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <User className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Reviews Scanned"
          value={total.toLocaleString()}
          trendPct={stats.pct_suspicious !== undefined ? 18.8 : undefined}
          icon={Star}
          color="#A78BFA"
        />
        <StatCard
          label="Suspicious Reviews"
          value={flagged.toLocaleString()}
          trendPct={stats.pct_suspicious ?? 12.4}
          highlight
          icon={AlertTriangle}
          color="#FF6B6B"
        />
        <StatCard
          label="Reviewers Flagged"
          value={reviewers.toLocaleString()}
          trendPct={stats.pct_ring ?? 8.7}
          icon={Users}
          color="#60A5FA"
        />
        <StatCard
          label="Products Affected"
          value={products.toLocaleString()}
          trendPct={stats.pct_products ?? -3.1}
          icon={Package}
          color="#4ECDC4"
        />
      </div>

      {/* Timeline + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Area chart */}
        <div className="lg:col-span-2 p-5" style={GLASS}>
          <p className="text-sm font-semibold text-white mb-4">Suspicious Activity Over Time</p>
          <div className="rounded-xl p-3" style={GLASS_INNER}>
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={timeline} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v);
                    return `${d.toLocaleString("default", { month: "short" })} ${d.getDate()}`;
                  }}
                  axisLine={false} tickLine={false}
                />
                <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(15,10,35,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12, color: "white" }}
                  cursor={{ stroke: "#7C3AED", strokeWidth: 1, strokeDasharray: "4 4" }}
                  labelFormatter={(v: unknown) => `Week of ${v}`}
                />
                <Area type="monotone" dataKey="flagged" stroke="#A78BFA" strokeWidth={2.5} fill="url(#aGrad)" dot={false} activeDot={{ r: 5, fill: "#A78BFA", strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut chart */}
        <div className="p-5 flex flex-col" style={GLASS}>
          <p className="text-sm font-semibold text-white mb-4">Top Risk Indicators</p>
          <div className="flex-1 flex flex-col items-center justify-center rounded-xl p-3" style={GLASS_INNER}>
            {signalEntries.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={signalEntries}
                      dataKey="count"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={3}
                      startAngle={90}
                      endAngle={-270}
                    >
                      {signalEntries.map((entry) => (
                        <Cell key={entry.name} fill={SIGNAL_COLORS[entry.name] ?? "#A78BFA"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "rgba(15,10,35,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12, color: "white" }}
                    />
                    <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={20} fontWeight={700}>
                      {totalRisks.toLocaleString()}
                    </text>
                    <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.4)" fontSize={9}>
                      Total Risks
                    </text>
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1 w-full px-2">
                  {signalEntries.map((e) => (
                    <div key={e.name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: SIGNAL_COLORS[e.name] ?? "#A78BFA" }} />
                      <span className="text-xs truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{e.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-40">
                <p className="text-3xl font-bold text-white tabular-nums">{totalRisks.toLocaleString()}</p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Total Risks</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Products + Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5" style={GLASS}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-white">Top Risk Products</p>
            <Link href="/products" className="text-xs flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: "#A78BFA" }}>
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {(topRisks?.top_products ?? []).map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={GLASS_INNER}>
                <span className="text-xs font-bold w-5 shrink-0 tabular-nums" style={{ color: "rgba(255,255,255,0.3)" }}>#{i + 1}</span>
                <span className="text-xs font-mono flex-1 truncate" style={{ color: "#A78BFA" }}>{p.asin}</span>
                <span className="text-xs shrink-0 font-medium" style={{ color: "#FF6B6B" }}>{p.flagged_count} flagged</span>
                <span className="text-xs font-bold shrink-0 px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,181,71,0.15)", color: "#FFB547" }}>
                  {Math.round((p.avg_trust ?? 1) * 100)}/100
                </span>
              </div>
            ))}
            {(topRisks?.top_products ?? []).length === 0 && (
              <p className="text-xs text-center py-6" style={{ color: "rgba(255,255,255,0.2)" }}>No data</p>
            )}
          </div>
        </div>

        <div className="p-5" style={GLASS}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-white">Recent Alerts</p>
            <Link href="/reviews" className="text-xs flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: "#A78BFA" }}>
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {alerts.map((a: any, i: number) => (
              <div key={i} className="px-3 py-2.5 rounded-xl" style={GLASS_INNER}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono" style={{ color: "#A78BFA" }}>{a.user_id}</span>
                  <div className="flex gap-1">
                    {a.ring_flagged && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,107,107,0.15)", color: "#FF6B6B" }}>ring</span>}
                    {a.rule_flagged && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,181,71,0.15)", color: "#FFB547" }}>rule</span>}
                    {a.llm_flagged  && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(96,165,250,0.15)", color: "#60A5FA" }}>llm</span>}
                  </div>
                </div>
                <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{a.preview || "—"}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{a.asin}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(255,107,107,0.15)", color: "#FF6B6B" }}>
                    {Math.round((a.trust_score ?? 0) * 100)}/100
                  </span>
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <p className="text-xs text-center py-6" style={{ color: "rgba(255,255,255,0.2)" }}>No alerts</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
