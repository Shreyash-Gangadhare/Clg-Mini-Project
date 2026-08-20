import React, { useState, useEffect } from 'react'
import { getDashboard } from '../../api/client'

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboard()
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="admin-layout" style={{ minHeight: '100vh', padding: '80px 24px 40px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-2xl)', marginBottom: 8 }}>
          📊 Dashboard
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 32 }}>
          Today's summary — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            {
              label: "Today's Revenue",
              value: loading ? '...' : `₹${Number(data?.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
              icon: '💰',
              color: 'var(--color-accent)',
            },
            {
              label: 'Orders Processed',
              value: loading ? '...' : (data?.orders_processed || 0),
              icon: '✅',
              color: 'var(--color-success)',
            },
            {
              label: 'Orders Pending',
              value: loading ? '...' : (data?.orders_pending || 0),
              icon: '⏳',
              color: 'var(--color-warning)',
            },
          ].map(card => (
            <div
              key={card.label}
              style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-border)',
                padding: 24,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>{card.icon}</div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 'var(--text-2xl)',
                color: card.color,
                marginBottom: 4,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {card.value}
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                {card.label}
              </div>
            </div>
          ))}
        </div>

        {/* Top 5 items table */}
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
            <h3 style={{ fontWeight: 700, fontSize: 'var(--text-base)' }}>
              🏆 Top 5 Items by Volume
            </h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-2)' }}>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Rank
                </th>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Item
                </th>
                <th style={{ padding: '10px 20px', textAlign: 'right', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Units Sold
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={3} style={{ padding: '12px 20px' }}>
                      <div className="skeleton" style={{ height: 16 }} />
                    </td>
                  </tr>
                ))
              ) : (data?.top_items?.length === 0 || !data?.top_items) ? (
                <tr>
                  <td colSpan={3} style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-faint)', fontSize: 'var(--text-sm)' }}>
                    No orders yet today.
                  </td>
                </tr>
              ) : (
                data.top_items.map((item, i) => (
                  <tr key={item.name} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '14px 20px', color: i === 0 ? 'var(--color-warning)' : 'var(--color-text-muted)', fontWeight: 700 }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </td>
                    <td style={{ padding: '14px 20px', fontWeight: 600 }}>{item.name}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                        {/* Mini bar */}
                        <div style={{
                          height: 6, width: 80, background: 'var(--color-surface-3)', borderRadius: 3, overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.round((item.count / (data.top_items[0]?.count || 1)) * 100)}%`,
                            background: 'var(--color-accent)',
                            borderRadius: 3,
                          }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'var(--color-accent)' }}>
                          {item.count}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
