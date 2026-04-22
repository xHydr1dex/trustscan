import Link from "next/link";
import { Shield, ShoppingBag, BarChart3, MessageSquare, User } from "lucide-react";

const roles = [
  {
    href: "/platform",
    icon: Shield,
    label: "Platform Ops",
    description: "Monitor fake review activity, reviewer rings, and platform-wide trust metrics.",
    accent: "from-indigo-500/20 to-violet-500/10 border-indigo-500/30 hover:border-indigo-400/60",
    iconColor: "text-indigo-400",
    badge: "Admin",
  },
  {
    href: "/seller",
    icon: BarChart3,
    label: "Seller",
    description: "Analyse your product's review health score and spot suspicious activity on your listings.",
    accent: "from-amber-500/20 to-orange-500/10 border-amber-500/30 hover:border-amber-400/60",
    iconColor: "text-amber-400",
    badge: "Seller",
  },
  {
    href: "/shopper",
    icon: ShoppingBag,
    label: "Shopper",
    description: "Check if a product's reviews are genuine before you buy. See the trust score instantly.",
    accent: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 hover:border-emerald-400/60",
    iconColor: "text-emerald-400",
    badge: "Consumer",
  },
  {
    href: "/reviewer",
    icon: User,
    label: "Reviewer Profile",
    description: "Look up any reviewer by ID — see their risk level, reviewed products, and behaviour signals.",
    accent: "from-violet-500/20 to-purple-500/10 border-violet-500/30 hover:border-violet-400/60",
    iconColor: "text-violet-400",
    badge: "Lookup",
  },
  {
    href: "/analyst",
    icon: MessageSquare,
    label: "Analyst",
    description: "Query the full review dataset in plain English. Ask anything, get SQL-backed answers.",
    accent: "from-sky-500/20 to-blue-500/10 border-sky-500/30 hover:border-sky-400/60",
    iconColor: "text-sky-400",
    badge: "Research",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      {/* Logo / hero */}
      <div className="mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <span className="text-2xl font-bold tracking-tight">TrustScan</span>
      </div>
      <p className="text-slate-400 text-center max-w-md mb-3 text-sm">
        AI-powered fake review detection across 208,000+ Amazon reviews
      </p>
      <div className="flex gap-2 mb-12">
        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          5-stage pipeline
        </span>
        <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
          LLM-powered
        </span>
        <span className="px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium">
          Ring detection
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <Link
              key={role.href}
              href={role.href}
              className={`group relative rounded-2xl border bg-gradient-to-br p-6 transition-all duration-200 ${role.accent}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${role.iconColor}`} />
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800/60 text-slate-400 border border-slate-700/50">
                  {role.badge}
                </span>
              </div>
              <h2 className="font-semibold text-slate-100 mb-1">{role.label}</h2>
              <p className="text-sm text-slate-400 leading-relaxed">{role.description}</p>
              <div className="mt-4 text-xs text-slate-500 group-hover:text-slate-300 transition-colors flex items-center gap-1">
                Open dashboard →
              </div>
            </Link>
          );
        })}
      </div>

      <p className="mt-12 text-xs text-slate-600">
        Powered by BGE-small · Groq Llama 3.3 70B · DuckDB · ChromaDB
      </p>
    </main>
  );
}
