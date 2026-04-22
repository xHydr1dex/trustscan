import Link from "next/link";
import { Shield } from "lucide-react";

const links = [
  { href: "/platform", label: "Platform" },
  { href: "/seller", label: "Seller" },
  { href: "/shopper", label: "Shopper" },
  { href: "/reviewer", label: "Reviewer" },
  { href: "/analyst", label: "Analyst" },
];

export function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-slate-800/60 bg-[#080d1a]/80 backdrop-blur-sm flex items-center px-6 gap-6">
      <Link href="/" className="flex items-center gap-2 mr-4">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <Shield className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-semibold text-sm text-slate-100">TrustScan</span>
      </Link>
      {links.map(l => (
        <Link key={l.href} href={l.href} className="text-sm text-slate-400 hover:text-slate-100 transition-colors">
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
