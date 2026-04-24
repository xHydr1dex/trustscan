const GLASS = {
  background: "rgba(255,255,255,0.07)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "16px",
};

const accentMap: Record<string, string> = {
  default: "white",
  red:     "#FF6B6B",
  violet:  "#A78BFA",
  emerald: "#4ECDC4",
  amber:   "#FFB547",
};

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "default" | "red" | "violet" | "emerald" | "amber";
}

export function StatCard({ label, value, sub, accent = "default" }: StatCardProps) {
  return (
    <div className="p-5" style={GLASS}>
      <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</p>
      <p className="text-3xl font-bold tabular-nums" style={{ color: accentMap[accent] }}>{value ?? "—"}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{sub}</p>}
    </div>
  );
}
