import React from 'react'

export function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-2xl)',
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Image area */}
      <div className="skeleton" style={{ height: 180, borderRadius: 0 }} />
      {/* Content */}
      <div style={{ padding: '16px' }}>
        <div className="skeleton" style={{ height: 20, width: '70%', marginBottom: 10 }} />
        <div className="skeleton" style={{ height: 14, width: '90%', marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 16 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="skeleton" style={{ height: 24, width: 60 }} />
          <div className="skeleton" style={{ height: 36, width: 80, borderRadius: 999 }} />
        </div>
      </div>
    </div>
  )
}
