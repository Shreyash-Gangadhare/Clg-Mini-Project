import React from 'react'

/**
 * CapacityBadge — shows remaining units or "Sold out for this slot"
 */
export function CapacityBadge({ remaining, max, slotSelected }) {
  if (!slotSelected) return null

  if (remaining === 0) {
    return (
      <span className="badge badge-sold" style={{ fontSize: '0.7rem' }}>
        🚫 Sold out for this slot
      </span>
    )
  }

  if (remaining <= 3) {
    return (
      <span className="badge badge-warn" style={{ fontSize: '0.7rem' }}>
        🔥 Only {remaining} left!
      </span>
    )
  }

  if (remaining <= Math.ceil(max * 0.2)) {
    return (
      <span className="badge badge-warn" style={{ fontSize: '0.7rem' }}>
        Only {remaining} left
      </span>
    )
  }

  return null
}
