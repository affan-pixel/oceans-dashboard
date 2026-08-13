'use client'

import { cn } from '@/lib/utils'

interface ScoreRingProps {
  value: number // 0-100
  size?: number
  strokeWidth?: number
  className?: string
  showLabel?: boolean
  label?: string
}

function colorForScore(score: number) {
  if (score >= 80) return 'oklch(0.55 0.22 264)' // indigo — strong match
  if (score >= 60) return 'oklch(0.42 0.09 244)' // navy — solid match
  if (score >= 35) return 'oklch(0.68 0.18 42)'  // orange — partial match
  return 'oklch(0.65 0.20 25)'                   // red — weak match
}

export function ScoreRing({
  value,
  size = 64,
  strokeWidth = 6,
  className,
  showLabel = true,
  label,
}: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference
  const color = colorForScore(clamped)

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `Score ${clamped} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="oklch(0.92 0 0)"
          strokeWidth={strokeWidth}
          className="dark:opacity-20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-semibold leading-none" style={{ color, fontSize: size * 0.28 }}>
            {Math.round(clamped)}
          </span>
          {label && (
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
