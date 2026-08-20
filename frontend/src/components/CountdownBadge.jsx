import React from 'react'
import { useSlotCountdown } from '../hooks/useSlotCountdown'

/**
 * CountdownBadge — shows live countdown to slot cutoff.
 * Turns red when < 5 minutes remain.
 */
export function CountdownBadge({ cutoffTime, style }) {
  const { label, secondsLeft, expired } = useSlotCountdown(cutoffTime)

  const urgent = !expired && secondsLeft < 300 // < 5 min

  return (
    <span
      className="badge"
      style={{
        background: expired
          ? 'rgba(239,68,68,0.15)'
          : urgent
          ? 'rgba(245,158,11,0.15)'
          : 'rgba(34,197,94,0.15)',
        color: expired
          ? 'var(--color-error)'
          : urgent
          ? 'var(--color-warning)'
          : 'var(--color-success)',
        fontFamily: 'var(--font-body)',
        fontVariantNumeric: 'tabular-nums',
        ...style,
      }}
    >
      {expired ? '⏰ Closed' : `⏱ ${label} left`}
    </span>
  )
}
