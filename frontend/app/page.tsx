"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Star, Users, Package, AlertTriangle, RefreshCw, Bell, User, ArrowUpRight, ArrowDownRight,
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

const DEMO_STATS = {
  total_reviews: 208142, suspicious_reviews: 4781,
  reviewers_flagged: 1209, products_affected: 312,
  pct_suspicious: 12.4, pct_ring: 8.7, pct_products: -3.1,
};
const DEMO_TIMELINE = [
  { week: "2024-05-10", flagged: 500 }, { week: "2024-05-11", flagged: 620 },
  { week: "2024-05-12", flagged: 580 }, { week: "2024-05-13", flagged: 890 },
  { week: "2024-05-14", flagged: 750 }, { week: "2024-05-15", flagged: 1100 },
  { week: "2024-05-16", flagged: 980 }, { week: "2024-05-17", flagged: 1340 },
];
const DEMO_TOP_RISKS = {
  top_products: [
    { asin: "B08N5WRWNW", flagged_count: 312, avg_trust: 0.28 },
    { asin: "B07XJ8C8F5", flagged_count: 278, avg_trust: 0.31 },
    { asin: "B09G9FPHY6", flagged_count: 245, avg_trust: 0.35 },
    { asin: "B0BSHF7WHW", flagged_count: 198, avg_trust: 0.42 },
    { asin: "B0C1H26C46", flagged_count: 167, avg_trust: 0.48 },
  ],
  signal_breakdown: { "Rule Engine": 2841, "Similarity": 1205, "Ring Detection": 987, "LLM Judge": 1309 },
};
const DEMO_ALERTS = [
  { user_id: "A2XVF8HTQB9K3M", asin: "B08N5WRWNW", preview: "Amazing product! Best purchase ever made. Highly recommend to everyone.", trust_score: 0.12, ring_flagged: true, rule_flagged: true, llm_flagged: false, rating: 5 },
  { user_id: "A1ZNKEXAMPLE1", asin: "B07XJ8C8F5", preview: "Absolutely fantastic. Changed my life. Five stars no doubt.", trust_score: 0.18, ring_flagged: false, rule_flagged: true, llm_flagged: true, rating: 5 },
  { user_id: "A3MPLGEXAMP2", asin: "B09G9FPHY6", preview: "Perfect in every way. Must buy immediately do not hesitate.", trust_score: 0.21, ring_flagged: true, rule_flagged: false, llm_flagged: true, rating: 5 },
  { user_id: "AEX4MPLEUSER3", asin: "B0BSHF7WHW", preview: "Great quality fast shipping would buy again 100 percent.", trust_score: 0.24, ring_flagged: false, rule_flagged: true, llm_flagged: false, rating: 5 },
  { user_id: "A5XMPL3USER4Z", asin: "B0C1H26C46", preview: "This is genuinely the best product in its category bar none.", trust_score: 0.29, ring_flagged: true, rule_flagged: true, llm_flagged: true, rating: 5 },
];

export default function OverviewPage() {
  const [stats,    setStats]    = useState<any>(DEMO_STATS);
  const [timeline, setTimeline] = useState<any[]>(DEMO_TIMELINE);
  const [topRisks, setTopRisks] = useState<any>(DEMO_TOP_RISKS);
  const [alerts,   setAlerts]   = useState<any[]>(DEMO_ALERTS);
  const [loading,  setLoading]  = useState(true);
  const [offline,  setOffline]  = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      getOverviewStats(),
      getOverviewTimeline(),
      getOverviewTopRisks(),
      getOverviewAlerts(6),
    ]).then(([s, t, r, a]) => {
      setStats(s ?? DEMO_STATS);
      setTimeline(Array.isArray(t) && t.length ? t : DEMO_TIMELINE);
      setTopRisks(r ?? DEMO_TOP_RISKS);
      setAlerts(Array.isArray(a) && a.length ? a : DEMO_ALERTS);
      setOffline(false);
    }).catch(() => {
      setStats(DEMO_STATS);
      setTimeline(DEMO_TIMELINE);
      setTopRisks(DEMO_TOP_RISKS);
      setAlerts(DEMO_ALERTS);
      setOffline(true);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

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
          {offline && (
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium"
              style={{ background: "rgba(255,181,71,0.15)", border: "1px solid rgba(255,181,71,0.3)", color: "#FFB547" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse inline-block" />
              Demo data
            </span>
          )}
          {loading && !offline && (
            <span className="text-xs px-3 py-1.5 rounded-full animate-pulse"
              style={{ background: "rgba(167,139,250,0.1)", color: "#A78BFA" }}>
              Loading…
            </span>
          )}
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
          trendPct={18.8}
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
