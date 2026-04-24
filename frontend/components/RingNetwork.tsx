"use client";
import { useMemo } from "react";

interface Ring {
  id: number;
  members: string[];
  size: number;
}

interface RingNetworkProps {
  rings: Ring[];
  maxRings?: number;
}

export function RingNetwork({ rings, maxRings = 8 }: RingNetworkProps) {
  const visible = rings.slice(0, maxRings);
  const W = 600, H = 320;

  const nodes = useMemo(() => {
    const result: { id: string; ring: number; x: number; y: number }[] = [];
    visible.forEach((ring, ri) => {
      const cx = (W / (visible.length + 1)) * (ri + 1);
      const cy = H / 2;
      const r = Math.min(60, 20 + ring.size * 6);
      ring.members.forEach((m, mi) => {
        const angle = (2 * Math.PI * mi) / ring.members.length - Math.PI / 2;
        result.push({
          id: m,
          ring: ri,
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
        });
      });
    });
    return result;
  }, [visible]);

  const edges = useMemo(() => {
    const result: { x1: number; y1: number; x2: number; y2: number; ring: number }[] = [];
    visible.forEach((ring, ri) => {
      const ringNodes = nodes.filter((n) => n.ring === ri);
      for (let i = 0; i < ringNodes.length; i++) {
        for (let j = i + 1; j < ringNodes.length; j++) {
          result.push({ x1: ringNodes[i].x, y1: ringNodes[i].y, x2: ringNodes[j].x, y2: ringNodes[j].y, ring: ri });
        }
      }
    });
    return result;
  }, [nodes, visible]);

  const colors = ["#FF6B6B", "#A78BFA", "#4ECDC4", "#FFB547", "#60A5FA", "#F472B6", "#FB923C", "#34D399"];

  if (rings.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
        No rings detected yet. Run precompute to detect rings.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H} className="w-full">
        {edges.map((e, i) => (
          <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke={colors[e.ring % colors.length]} strokeOpacity={0.3} strokeWidth={1} />
        ))}
        {nodes.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={5} fill={colors[n.ring % colors.length]} fillOpacity={0.9} />
            <title>{n.id}</title>
          </g>
        ))}
        {visible.map((ring, ri) => {
          const cx = (W / (visible.length + 1)) * (ri + 1);
          return (
            <text key={ri} x={cx} y={H - 12} textAnchor="middle" fill={colors[ri % colors.length]}
              fontSize="10" opacity={0.7}>
              Ring {ri + 1} ({ring.size})
            </text>
          );
        })}
      </svg>
    </div>
  );
}
