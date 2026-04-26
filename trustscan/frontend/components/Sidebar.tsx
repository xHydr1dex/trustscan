"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, LayoutDashboard, Star, Users, Package, BarChart3, MessageSquare, Bell, FileText, Settings } from "lucide-react";

const NAV = [
  { href: "/",          icon: LayoutDashboard, label: "Overview" },
  { href: "/reviews",   icon: Star,            label: "Reviews" },
  { href: "/reviewer",  icon: Users,           label: "Reviewers" },
  { href: "/products",  icon: Package,         label: "Products" },
  { href: "/platform",  icon: BarChart3,       label: "Analytics" },
  { href: "/analyst",   icon: MessageSquare,   label: "AI Analyst" },
  { href: "/alerts",    icon: Bell,            label: "Alerts" },
  { href: "/reports",   icon: FileText,        label: "Reports" },
  { href: "/settings",  icon: Settings,        label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-56 flex flex-col z-40"
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(30px)",
        WebkitBackdropFilter: "blur(30px)",
        borderRight: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-6 mb-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg,#7C3AED,#4F46E5)",
            boxShadow: "0 4px 14px rgba(124,58,237,0.5)",
          }}
        >
          <Shield className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-bold tracking-tight text-white">TrustScan</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative"
              style={
                active
                  ? {
                      background: "rgba(124,58,237,0.2)",
                      borderLeft: "3px solid #7C3AED",
                      paddingLeft: "calc(0.75rem - 3px)",
                    }
                  : {
                      borderLeft: "3px solid transparent",
                      paddingLeft: "calc(0.75rem - 3px)",
                    }
              }
            >
              <Icon
                className="w-4 h-4 shrink-0"
                style={{ color: active ? "#A78BFA" : "rgba(255,255,255,0.4)" }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: active ? "#F0EEFF" : "rgba(255,255,255,0.5)" }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 mt-auto">
        <div
          className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg,#7C3AED,#4F46E5)" }}
          >
            A
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">Admin</p>
            <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>Platform Ops</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
