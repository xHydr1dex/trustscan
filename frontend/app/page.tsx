"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell,
} from "recharts";
import { Shield, Star, Users, Package, AlertTriangle, TrendingUp, TrendingDown, ArrowRight, Zap } from "lucide-react";
import { getOverviewStats, getOverviewTimeline, getOverviewTopRisks, getOverviewAlerts } from "@/lib/api";

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

function StatCard({
  label, value, sub, icon: Icon, color, trend, trendVal,
}: {
  label: string; value: string | number; sub?: string;
  icon: any; color: string; trend?: "up" | "down"; trendVal?: number;
}) {
  return (
    <div className="p-5" style={NEU_CARD}>
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: color + "22", boxShadow: `0 2px 8px ${color}33` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {trend && trendVal !== undefined && (
          <span
            className="flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full"
            style={trend === "up"
              ? { background: "#E85D4A18", color: "#E85D4A" }
              : { background: "#5BBF8F18", color: "#5BBF8F" }}
          >
            {trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trendVal)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold mb-0.5" style={{ color: "#2C1A0E" }}>{value}</p>
      <p className="text-sm font-medium" style={{ color: "#8B6F5E" }}>{label}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "#B8A090" }}>{sub}</p>}
    </div>
  );
}

function TrustBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.7 ? "#5BBF8F" : score >= 0.5 ? "#F5A623" : "#E85D4A";
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: color + "20", color }}>
      {pct}/100
    </span>
  );
}

const SIGNAL_COLORS: Record<string, string> = {
  "Rule Engine":     "#F5A623",
  "Similarity":      "#7B6CF6",
  "Ring Detection":  "#E85D4A",
  "LLM Judge":       "#4A9FD4",
};

export default function OverviewPage() {
  const [stats, setStats]     = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [topRisks, setTopRisks] = useState<any>(null);
  const [alerts, setAlerts]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getOverviewStats(),
      getOverviewTimeline(),
      getOverviewTopRisks(),
      getOverviewAlerts(6),
    ]).then(([s, t, r, a]) => {
      setStats(s);
      setTimeline(t);
      setTopRisks(r);
      setAlerts(a);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: "#EDE6DC" }} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 h-64 rounded-2xl animate-pulse" style={{ background: "#EDE6DC" }} />
          <div className="h-64 rounded-2xl animate-pulse" style={{ background: "#EDE6DC" }} />
        </div>
      </div>
    );
  }

  const signalBreakdown = topRisks?.signal_breakdown
    ? Object.entries(topRisks.signal_breakdown).map(([name, count]) => ({ name, count }))
    : [];

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#2C1A0E" }}>Overview</h1>
        <p className="text-sm" style={{ color: "#8B6F5E" }}>Platform-wide trust signals and detection summary</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Reviews Scanned"
          value={stats.total_reviews.toLocaleString()}
          icon={Star}
          color="#7B6CF6"
        />
        <StatCard
          label="Suspicious Reviews"
          value={stats.suspicious_reviews.toLocaleString()}
          sub={`${((stats.suspicious_reviews / stats.total_reviews) * 100).toFixed(1)}% of total`}
          icon={AlertTriangle}
          color="#E85D4A"
          trend={stats.pct_suspicious > 0 ? "up" : "down"}
          trendVal={stats.pct_suspicious}
        />
        <StatCard
          label="Reviewers Flagged"
          value={stats.reviewers_flagged.toLocaleString()}
          icon={Users}
          color="#F5A623"
          trend={stats.pct_ring > 0 ? "up" : "down"}
          trendVal={stats.pct_ring}
        />
        <StatCard
          label="Products Affected"
          value={stats.products_affected.toLocaleString()}
          icon={Package}
          color="#4A9FD4"
          trend={stats.pct_products > 0 ? "up" : "down"}
          trendVal={stats.pct_products}
        />
      </div>

      {/* Timeline + Signal Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Timeline chart */}
        <div className="lg:col-span-2 p-5" style={NEU_CARD}>
          <p className="text-sm font-semibold mb-4" style={{ color: "#2C1A0E" }}>Suspicious Activity Over Time</p>
          <div style={NEU_INSET} className="px-2 py-3">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={timeline} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="flagGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E85D4A" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#E85D4A" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(166,134,110,0.15)" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: "#B8A090" }}
                  tickFormatter={(v: string) => v.slice(5)}
                  axisLine={false} tickLine={false}
                />
                <YAxis tick={{ fontSize: 10, fill: "#B8A090" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#F4EDE4", border: "none", borderRadius: 10, boxShadow: "0 4px 12px rgba(166,134,110,0.3)", fontSize: 12, color: "#2C1A0E" }}
                  cursor={{ stroke: "#E85D4A", strokeWidth: 1, strokeDasharray: "4 4" }}
                />
                <Area type="monotone" dataKey="flagged" stroke="#E85D4A" strokeWidth={2} fill="url(#flagGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Signal breakdown */}
        <div className="p-5" style={NEU_CARD}>
          <p className="text-sm font-semibold mb-4" style={{ color: "#2C1A0E" }}>Detection Signals</p>
          <div style={NEU_INSET} className="px-2 py-3">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={signalBreakdown} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "#B8A090" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#8B6F5E" }} axisLine={false} tickLine={false} width={85} />
                <Tooltip
                  contentStyle={{ background: "#F4EDE4", border: "none", borderRadius: 10, boxShadow: "0 4px 12px rgba(166,134,110,0.3)", fontSize: 12, color: "#2C1A0E" }}
                  cursor={{ fill: "rgba(166,134,110,0.08)" }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {signalBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={SIGNAL_COLORS[entry.name] ?? "#B8A090"} />
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
        <div className="p-5" style={NEU_CARD}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold" style={{ color: "#2C1A0E" }}>Top Risk Products</p>
            <Link href="/products" className="text-xs flex items-center gap-1" style={{ color: "#E85D4A" }}>
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {topRisks?.top_products?.map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={NEU_INSET}>
                <span className="text-xs font-bold w-5 shrink-0" style={{ color: "#B8A090" }}>#{i + 1}</span>
                <span className="text-xs font-mono flex-1 truncate" style={{ color: "#7B6CF6" }}>{p.asin}</span>
                <span className="text-xs shrink-0" style={{ color: "#E85D4A" }}>{p.flagged_count} flagged</span>
                <TrustBadge score={p.avg_trust} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent alerts */}
        <div className="p-5" style={NEU_CARD}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold" style={{ color: "#2C1A0E" }}>Recent Alerts</p>
            <Link href="/reviews" className="text-xs flex items-center gap-1" style={{ color: "#E85D4A" }}>
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {alerts.map((a: any, i: number) => (
              <div key={i} className="px-3 py-2.5 rounded-xl" style={NEU_INSET}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono" style={{ color: "#7B6CF6" }}>{a.user_id}</span>
                  <div className="flex gap-1">
                    {a.ring_flagged && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#E85D4A18", color: "#E85D4A" }}>ring</span>
                    )}
                    {a.rule_flagged && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#F5A62318", color: "#F5A623" }}>rule</span>
                    )}
                    {a.llm_flagged && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#4A9FD418", color: "#4A9FD4" }}>llm</span>
                    )}
                  </div>
                </div>
                <p className="text-xs truncate" style={{ color: "#8B6F5E" }}>{a.preview || "—"}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-mono" style={{ color: "#B8A090" }}>{a.asin}</span>
                  <TrustBadge score={a.trust_score} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-5" style={NEU_CARD}>
        <p className="text-sm font-semibold mb-4" style={{ color: "#2C1A0E" }}>Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/products",  label: "Browse Products",   icon: Package,    color: "#4A9FD4" },
            { href: "/reviewer",  label: "Check Reviewers",   icon: Users,      color: "#7B6CF6" },
            { href: "/platform",  label: "Ring Detection",    icon: Shield,     color: "#E85D4A" },
            { href: "/analyst",   label: "Ask AI Analyst",    icon: Zap,        color: "#F5A623" },
          ].map(({ href, label, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-150 hover:scale-[1.02]"
              style={NEU_INSET}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: color + "1A", boxShadow: `0 2px 6px ${color}2A` }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span className="text-xs font-medium text-center leading-tight" style={{ color: "#8B6F5E" }}>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
