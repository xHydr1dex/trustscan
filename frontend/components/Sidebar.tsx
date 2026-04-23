"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, LayoutDashboard, Star, Users, Package, BarChart3, MessageSquare, Bell } from "lucide-react";

const NAV = [
  { href: "/",           icon: LayoutDashboard, label: "Overview" },
  { href: "/reviews",    icon: Star,             label: "Reviews" },
  { href: "/reviewer",   icon: Users,            label: "Reviewers" },
  { href: "/products",   icon: Package,          label: "Products" },
  { href: "/platform",   icon: BarChart3,        label: "Analytics" },
  { href: "/analyst",    icon: MessageSquare,    label: "AI Analyst" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-56 flex flex-col z-40"
      style={{
        background: "#EDE6DC",
        boxShadow: "4px 0 20px rgba(166,134,110,0.18)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-6 mb-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#E85D4A,#F5A623)", boxShadow: "0 4px 12px rgba(232,93,74,0.35)" }}
        >
          <Shield className="w-4 h-4 text-white" />
        </div>
        <span className="text-base font-bold tracking-tight" style={{ color: "#2C1A0E" }}>
          TrustScan
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group"
              style={
                active
                  ? {
                      background: "#F4EDE4",
                      boxShadow: "4px 4px 10px rgba(166,134,110,0.3), -4px -4px 10px rgba(255,255,255,0.75)",
                      color: "#E85D4A",
                      fontWeight: 600,
                    }
                  : { color: "#8B6F5E" }
              }
            >
              <Icon
                className="w-4 h-4 shrink-0 transition-colors"
                style={{ color: active ? "#E85D4A" : "#B8A090" }}
              />
              <span className="text-sm">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-5">
        <div
          className="rounded-xl px-3 py-2.5"
          style={{ background: "#F4EDE4", boxShadow: "inset 3px 3px 8px rgba(166,134,110,0.25), inset -3px -3px 8px rgba(255,255,255,0.7)" }}
        >
          <p className="text-xs font-medium" style={{ color: "#8B6F5E" }}>AI-Powered</p>
          <p className="text-xs mt-0.5" style={{ color: "#B8A090" }}>Groq · DuckDB · BGE</p>
        </div>
      </div>
    </aside>
  );
}
