'use client';

import { motion } from 'framer-motion';

interface Ring {
  color: string;
  trackOpacity?: number;
  progress: number;
}

interface ActivityRingsProps {
  size?: number;
  stroke?: number;
  gap?: number;
  rings: Ring[];
}

export function ActivityRings({
  size = 200,
  stroke = 18,
  gap = 4,
  rings,
}: ActivityRingsProps) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <defs>
        {rings.map((r, i) => (
          <linearGradient
            key={`grad-${i}`}
            id={`activity-ring-grad-${i}`}
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0%" stopColor={r.color} stopOpacity="0.85" />
            <stop offset="100%" stopColor={r.color} stopOpacity="1" />
          </linearGradient>
        ))}
      </defs>
      {rings.map((r, i) => {
        const radius = (size - stroke) / 2 - i * (stroke + gap);
        if (radius <= 0) return null;
        const c = 2 * Math.PI * radius;
        const offset = c * (1 - Math.min(1, r.progress));
        return (
          <g key={i}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={r.color}
              strokeOpacity={r.trackOpacity ?? 0.16}
              strokeWidth={stroke}
              fill="none"
            />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={`url(#activity-ring-grad-${i})`}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={c}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              initial={{ strokeDashoffset: c }}
              animate={{ strokeDashoffset: offset }}
              transition={{
                duration: 1.2,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.12 + i * 0.08,
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}
