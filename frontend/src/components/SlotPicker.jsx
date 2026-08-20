import React from 'react'
import { CountdownBadge } from './CountdownBadge'

/**
 * SlotPicker — shows available slots with live capacity warnings per cart item.
 * Only shows slots whose cutoff_time hasn't passed.
 */
export function SlotPicker({ slots, cartItems, slotCapacities, selectedSlot, onSelect }) {
  const now = Date.now()
  const openSlots = slots.filter(s => new Date(s.cutoff_time) > now)

  // For a given slot, get the remaining capacity for each cart item
  const getCapacityInfo = (slotId, menuItemId) => {
    if (!slotCapacities[slotId]) return null
    return slotCapacities[slotId]?.find(c => c.menu_item_id === menuItemId)
  }

  // Check if any cart item is sold out for a slot
  const hasCapacityIssue = (slotId) => {
    return cartItems.some(({ menuItem, quantity }) => {
      const cap = getCapacityInfo(slotId, menuItem.id)
      if (!cap) return false
      return (cap.max_units - cap.units_booked) < quantity
    })
  }

  if (openSlots.length === 0) {
    return (
      <div style={{
        padding: 24,
        background: 'var(--color-surface-2)',
        borderRadius: 'var(--radius-xl)',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
      }}>
        <p style={{ fontSize: 'var(--text-lg)', marginBottom: 8 }}>😕 No open slots right now</p>
        <p style={{ fontSize: 'var(--text-sm)' }}>All slots for today have passed their order cutoff.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {openSlots.map(slot => {
        const isSelected = selectedSlot?.id === slot.id
        const issue = hasCapacityIssue(slot.id)

        return (
          <button
            key={slot.id}
            onClick={() => !issue && onSelect(slot)}
            disabled={issue}
            style={{
              textAlign: 'left',
              padding: 16,
              background: isSelected ? 'var(--color-accent-muted)' : 'var(--color-surface-2)',
              border: `2px solid ${isSelected ? 'var(--color-accent)' : issue ? 'rgba(239,68,68,0.3)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-xl)',
              cursor: issue ? 'not-allowed' : 'pointer',
              opacity: issue ? 0.7 : 1,
              transition: 'border-color 0.2s, background 0.2s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 'var(--text-lg)',
                color: isSelected ? 'var(--color-accent)' : 'var(--color-text)',
              }}>
                {slot.start_time} – {slot.end_time}
              </span>
              <CountdownBadge cutoffTime={slot.cutoff_time} />
            </div>

            {/* Per-item capacity warnings */}
            {cartItems.map(({ menuItem, quantity }) => {
              const cap = getCapacityInfo(slot.id, menuItem.id)
              if (!cap) return null
              const remaining = cap.max_units - cap.units_booked
              if (remaining === 0) {
                return (
                  <div key={menuItem.id} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', marginTop: 4 }}>
                    🚫 {menuItem.name} — Sold out for this slot
                  </div>
                )
              }
              if (remaining < quantity) {
                return (
                  <div key={menuItem.id} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)', marginTop: 4 }}>
                    ⚠️ {menuItem.name} — Only {remaining} left (you want {quantity})
                  </div>
                )
              }
              if (remaining <= 3) {
                return (
                  <div key={menuItem.id} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)', marginTop: 4 }}>
                    🔥 {menuItem.name} — Only {remaining} remaining
                  </div>
                )
              }
              return null
            })}

            {isSelected && (
              <div style={{ marginTop: 8, color: 'var(--color-accent)', fontSize: 'var(--text-xs)', fontWeight: 700 }}>
                ✓ Selected
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
