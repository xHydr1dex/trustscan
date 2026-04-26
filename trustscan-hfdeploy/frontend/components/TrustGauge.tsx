interface TrustGaugeProps {
  score: number; // 0-1
  size?: number;
}

export function TrustGauge({ score, size = 120 }: TrustGaugeProps) {
  const pct = Math.max(0, Math.min(1, score));
  const radius = 40;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  // We use 75% of the circle (270 degrees)
  const arc = circumference * 0.75;
  const offset = arc - arc * pct;
  const rotation = 135; // start bottom-left

  const color = pct > 0.7 ? "#10b981" : pct > 0.4 ? "#f59e0b" : "#ef4444";
  const label = pct > 0.7 ? "Genuine" : pct > 0.4 ? "Uncertain" : "Suspicious";

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth="8"
          strokeDasharray={`${arc} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(${rotation} ${cx} ${cy})`}
        />
        {/* Fill */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${arc} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(${rotation} ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease" }}
        />
        <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize="20" fontWeight="bold">
          {Math.round(pct * 100)}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#64748b" fontSize="9">
          / 100
        </text>
      </svg>
      <span className="text-xs font-medium mt-1" style={{ color }}>{label}</span>
    </div>
  );
}
