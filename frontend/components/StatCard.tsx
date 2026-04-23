const NEU_CARD = {
  background: "#F4EDE4",
  boxShadow: "6px 6px 14px rgba(166,134,110,0.32), -6px -6px 14px rgba(255,255,255,0.82)",
  borderRadius: "16px",
};

const accentMap: Record<string, string> = {
  default: "#2C1A0E",
  red:     "#E85D4A",
  violet:  "#7B6CF6",
  emerald: "#5BBF8F",
  amber:   "#F5A623",
};

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "default" | "red" | "violet" | "emerald" | "amber";
}

export function StatCard({ label, value, sub, accent = "default" }: StatCardProps) {
  return (
    <div className="p-5" style={NEU_CARD}>
      <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#B8A090" }}>{label}</p>
      <p className="text-3xl font-bold tabular-nums" style={{ color: accentMap[accent] }}>{value ?? "—"}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "#8B6F5E" }}>{sub}</p>}
    </div>
  );
}
