interface FlagBadgeProps {
  type: "rule" | "similarity" | "ring" | "llm";
  active: boolean;
}

const config = {
  rule: { label: "Rule", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  similarity: { label: "Similar", color: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  ring: { label: "Ring", color: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  llm: { label: "LLM", color: "bg-red-500/15 text-red-400 border-red-500/30" },
};

export function FlagBadge({ type, active }: FlagBadgeProps) {
  if (!active) return null;
  const { label, color } = config[type];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>
      {label}
    </span>
  );
}
