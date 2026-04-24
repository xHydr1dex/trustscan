interface FlagBadgeProps {
  type: "rule" | "similarity" | "ring" | "llm";
  active: boolean;
}

const config: Record<string, { label: string; bg: string; color: string; border: string }> = {
  rule:       { label: "Rule",    bg: "rgba(255,181,71,0.15)",  color: "#FFB547", border: "rgba(255,181,71,0.3)" },
  similarity: { label: "Similar", bg: "rgba(96,165,250,0.15)",  color: "#60A5FA", border: "rgba(96,165,250,0.3)" },
  ring:       { label: "Ring",    bg: "rgba(255,107,107,0.15)", color: "#FF6B6B", border: "rgba(255,107,107,0.3)" },
  llm:        { label: "LLM",     bg: "rgba(167,139,250,0.15)", color: "#A78BFA", border: "rgba(167,139,250,0.3)" },
};

export function FlagBadge({ type, active }: FlagBadgeProps) {
  if (!active) return null;
  const { label, bg, color, border } = config[type];
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: bg, color, border: `1px solid ${border}` }}>
      {label}
    </span>
  );
}
