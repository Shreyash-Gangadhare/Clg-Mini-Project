import React from 'react'

const STATUS_STEPS = [
  { key: 'placed',    label: 'Order Placed',   icon: '📋' },
  { key: 'preparing', label: 'Preparing',       icon: '👨‍🍳' },
  { key: 'ready',     label: 'Ready! 🎉',       icon: '✅' },
  { key: 'picked_up', label: 'Picked Up',       icon: '🛍️' },
]

export function OrderStatusStepper({ status }) {
  const currentIdx = STATUS_STEPS.findIndex(s => s.key === status)

  return (
    <div style={{ padding: '24px 0' }}>
      <div className="stepper" style={{ overflowX: 'auto' }}>
        {STATUS_STEPS.map((step, idx) => {
          const done = idx < currentIdx
          const active = idx === currentIdx
          return (
            <React.Fragment key={step.key}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 72 }}>
                <div
                  className={`step-node ${done ? 'done' : active ? 'active' : ''}`}
                  style={{ fontSize: active || done ? '1rem' : '0.75rem' }}
                >
                  {done ? '✓' : step.icon}
                </div>
                <span style={{
                  fontSize: 'var(--text-xs)',
                  color: active ? 'var(--color-accent)' : done ? 'var(--color-success)' : 'var(--color-text-muted)',
                  fontWeight: active ? 700 : 400,
                  textAlign: 'center',
                  lineHeight: 1.3,
                }}>
                  {step.label}
                </span>
              </div>
              {idx < STATUS_STEPS.length - 1 && (
                <div className={`step-line ${done ? 'done' : ''}`} />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
