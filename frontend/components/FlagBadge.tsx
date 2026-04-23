interface FlagBadgeProps {
  type: "rule" | "similarity" | "ring" | "llm";
  active: boolean;
}

const config: Record<string, { label: string; bg: string; color: string; border: string }> = {
  rule:       { label: "Rule",    bg: "#F5A62318", color: "#F5A623", border: "#F5A62330" },
  similarity: { label: "Similar", bg: "#4A9FD418", color: "#4A9FD4", border: "#4A9FD430" },
  ring:       { label: "Ring",    bg: "#E85D4A18", color: "#E85D4A", border: "#E85D4A30" },
  llm:        { label: "LLM",     bg: "#7B6CF618", color: "#7B6CF6", border: "#7B6CF630" },
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
