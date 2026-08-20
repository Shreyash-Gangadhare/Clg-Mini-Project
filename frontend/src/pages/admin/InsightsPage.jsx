import React, { useState, useEffect, useCallback } from 'react'
import { getInsights } from '../../api/client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'

// ─── Design token aliases ────────────────────────────────────────────────────
const C = {
  accent:   '#FF6B35',
  success:  '#22C55E',
  warning:  '#F59E0B',
  error:    '#EF4444',
  info:     '#3B82F6',
  purple:   '#A855F7',
  surface:  'var(--color-surface)',
  surface2: 'var(--color-surface-2)',
  border:   'var(--color-border)',
  text:     'var(--color-text)',
  muted:    'var(--color-text-muted)',
  faint:    'var(--color-text-faint)',
}

const PIE_COLORS = [C.accent, C.info, C.success, C.purple, C.warning]

// ─── Reusable sub-components ─────────────────────────────────────────────────

/** A card shell matching the existing admin dashboard style. */
function Card({ title, icon, children, style }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      ...style,
    }}>
      {(title || icon) && (
        <div style={{
          padding: '14px 20px',
          borderBottom: `1px solid ${C.border}`,
          background: C.surface2,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          {icon && <span>{icon}</span>}
          <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{title}</span>
        </div>
      )}
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  )
}

/** A single KPI tile. */
function KPITile({ icon, label, value, color, subtext }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 'var(--radius-xl)',
      padding: 20,
    }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 900,
        fontSize: 'var(--text-2xl)',
        color: color || C.accent,
        fontVariantNumeric: 'tabular-nums',
        marginBottom: 2,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 'var(--text-xs)', color: C.muted, fontWeight: 600 }}>{label}</div>
      {subtext && (
        <div style={{ fontSize: 11, color: C.faint, marginTop: 6, lineHeight: 1.5 }}>{subtext}</div>
      )}
    </div>
  )
}

/** Empty / insufficient-data state. */
function Insufficient({ message }) {
  return (
    <div style={{
      padding: '32px 20px',
      textAlign: 'center',
      color: C.faint,
      fontSize: 'var(--text-sm)',
    }}>
      {message || 'Not enough data to estimate this metric.'}
    </div>
  )
}

/** Custom Recharts tooltip matching dark theme. */
function DarkTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1E1E1E',
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: '8px 14px',
      fontSize: 12,
    }}>
      <div style={{ color: C.muted, marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.fill || C.accent, fontWeight: 700 }}>
          {formatter ? formatter(p.value) : p.value}
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [showDemo, setShowDemo] = useState(true)  // auto-request demo on first load

  const fetchInsights = useCallback((demo) => {
    setLoading(true)
    setError(null)
    getInsights(demo)
      .then(r => setData(r.data))
      .catch(e => setError(e?.response?.data?.detail || 'Failed to load insights.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchInsights(showDemo)
  }, [fetchInsights, showDemo])

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '40px 32px', maxWidth: 1000, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 32, width: 200, marginBottom: 32, borderRadius: 8 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 110, borderRadius: 16 }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 240, borderRadius: 16 }} />
          ))}
        </div>
      </div>
    )
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ padding: '80px 32px', maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ color: C.error, fontWeight: 700, marginBottom: 8 }}>{error}</div>
        <button
          id="insights-retry-btn"
          className="btn btn-primary"
          onClick={() => fetchInsights(showDemo)}
          style={{ marginTop: 16 }}
        >
          Retry
        </button>
      </div>
    )
  }

  // ── No data at all ────────────────────────────────────────────────────────
  if (!data) return null

  const op  = data.orders_processed || {}
  const wr  = data.waste_reduction  || {}
  const wt  = data.wait_time        || {}

  return (
    <div style={{ padding: '40px 32px', maxWidth: 1000, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 id="insights-heading" style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'var(--text-2xl)',
            marginBottom: 4,
          }}>
            📈 Insights
          </h1>
          <p style={{ color: C.muted, fontSize: 'var(--text-sm)' }}>
            Historical order analytics · All time
          </p>
        </div>

        {/* Demo toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 'var(--text-xs)', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              id="insights-demo-toggle"
              type="checkbox"
              checked={showDemo}
              onChange={e => setShowDemo(e.target.checked)}
              style={{ accentColor: C.accent }}
            />
            Show sample data
          </label>
        </div>
      </div>

      {/* ── Sample data banner ── */}
      {data.is_sample_data && (
        <div id="insights-sample-banner" style={{
          background: 'rgba(245,158,11,0.12)',
          border: `1px solid rgba(245,158,11,0.35)`,
          borderRadius: 'var(--radius-lg)',
          padding: '10px 16px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 'var(--text-sm)',
          color: C.warning,
        }}>
          ⚠️ <strong>Sample data</strong> — these analytics are for demonstration purposes.
          Uncheck "Show sample data" or place real orders to see live analytics.
        </div>
      )}

      {/* ── KPI tiles ── */}
      <div id="insights-kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KPITile
          icon="✅"
          label="Orders Processed"
          value={op.total ?? '—'}
          color={C.success}
        />
        <KPITile
          icon="🛍️"
          label="Picked Up"
          value={op.picked_up ?? '—'}
          color={C.accent}
          subtext={op.total ? `${Math.round((op.picked_up / op.total) * 100)}% fulfilment rate` : null}
        />
        <KPITile
          icon="🗑️"
          label="Cancelled"
          value={op.cancelled ?? '—'}
          color={C.error}
          subtext={op.total ? `${Math.round((op.cancelled / op.total) * 100)}% cancellation rate` : null}
        />
        <KPITile
          icon="⏳"
          label="Pending"
          value={op.pending ?? '—'}
          color={C.warning}
        />
      </div>

      {/* ── Reduction metrics ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        {/* Waste reduction */}
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 'var(--radius-xl)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          <div style={{ fontSize: 28 }}>♻️</div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 'var(--text-2xl)',
            color: C.success,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {wr.reduction_pct != null ? `${wr.reduction_pct}%` : '—'}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: C.muted, fontWeight: 600 }}>
            Estimated Food-Waste Reduction
          </div>
          <div style={{ fontSize: 11, color: C.faint, marginTop: 4, lineHeight: 1.6 }}>
            {wr.note || 'Not enough data to estimate.'}
          </div>
          {wr.baseline_units != null && (
            <div style={{ fontSize: 11, color: C.faint }}>
              Baseline: {wr.baseline_units} units → Actual: {wr.actual_units} units
            </div>
          )}
        </div>

        {/* Wait-time reduction */}
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 'var(--radius-xl)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          <div style={{ fontSize: 28 }}>⚡</div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 'var(--text-2xl)',
            color: C.info,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {wt.reduction_pct != null ? `${wt.reduction_pct}%` : '—'}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: C.muted, fontWeight: 600 }}>
            Estimated Pickup Wait-Time Reduction
          </div>
          <div style={{ fontSize: 11, color: C.faint, marginTop: 4, lineHeight: 1.6 }}>
            {wt.note || 'Not enough data to estimate.'}
          </div>
          {wt.actual_minutes != null && (
            <div style={{ fontSize: 11, color: C.faint }}>
              Actual: {wt.actual_minutes} min · Baseline: {wt.baseline_minutes} min
            </div>
          )}
        </div>
      </div>

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>

        {/* Peak ordering hours */}
        <Card title="Peak Ordering Hours" icon="🕐">
          {!data.peak_hours?.length
            ? <Insufficient message="No order data yet." />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.peak_hours} margin={{ top: 4, right: 4, bottom: 4, left: -24 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: C.muted }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: C.muted }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,107,53,0.08)' }} />
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {data.peak_hours.map((entry, i) => {
                      const max = Math.max(...data.peak_hours.map(h => h.count))
                      return (
                        <Cell
                          key={i}
                          fill={entry.count === max ? C.accent : 'rgba(255,107,53,0.4)'}
                        />
                      )
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </Card>

        {/* Peak ordering days */}
        <Card title="Peak Ordering Days" icon="📅">
          {!data.peak_days?.length
            ? <Insufficient message="No order data yet." />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.peak_days} margin={{ top: 4, right: 4, bottom: 4, left: -24 }}>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: C.muted }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: C.muted }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(168,85,247,0.08)' }} />
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {data.peak_days.map((entry, i) => {
                      const max = Math.max(...data.peak_days.map(d => d.count))
                      return (
                        <Cell
                          key={i}
                          fill={entry.count === max ? C.purple : 'rgba(168,85,247,0.45)'}
                        />
                      )
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </Card>

        {/* Revenue by category */}
        <Card title="Revenue by Category" icon="💰">
          {!data.revenue_by_category?.length
            ? <Insufficient message="No paid order revenue data yet." />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.revenue_by_category.map(r => ({
                      ...r,
                      revenue: parseFloat(r.revenue),
                    }))}
                    dataKey="revenue"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={72}
                    label={({ label, percent }) =>
                      `${label} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={{ stroke: C.muted }}
                  >
                    {data.revenue_by_category.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={v => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                    contentStyle={{ background: '#1E1E1E', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                    itemStyle={{ color: C.text }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )
          }
        </Card>

        {/* Most cancelled items */}
        <Card title="Most Cancelled Items" icon="🚫">
          {!data.cancelled_items?.length
            ? <Insufficient message="No cancelled orders on record." />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {/* Table header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: '0 12px',
                  padding: '0 0 8px',
                  borderBottom: `1px solid ${C.border}`,
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: C.faint,
                }}>
                  <span>Item</span>
                  <span style={{ textAlign: 'right' }}>Units</span>
                  <span style={{ textAlign: 'right' }}>₹ Lost</span>
                </div>
                {data.cancelled_items.map((item, i) => (
                  <div key={item.name} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    gap: '0 12px',
                    padding: '9px 0',
                    borderBottom: i < data.cancelled_items.length - 1 ? `1px solid ${C.border}` : 'none',
                    alignItems: 'center',
                  }}>
                    <span style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>{item.name}</span>
                    <span style={{
                      textAlign: 'right',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      color: C.error,
                      fontSize: 'var(--text-sm)',
                    }}>{item.count}</span>
                    <span style={{
                      textAlign: 'right',
                      fontSize: 'var(--text-xs)',
                      color: C.muted,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      ₹{Number(item.value).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </div>
            )
          }
        </Card>

      </div>

      {/* ── Methodology note ── */}
      <div style={{
        background: C.surface2,
        border: `1px solid ${C.border}`,
        borderRadius: 'var(--radius-lg)',
        padding: '12px 16px',
        fontSize: 11,
        color: C.faint,
        lineHeight: 1.7,
      }}>
        <strong style={{ color: C.muted }}>Methodology:</strong>{' '}
        Waste reduction compares pre-committed order quantities (what was actually prepared)
        vs. slot capacity maximums (what would have been cooked in a walk-up scenario).
        Wait-time reduction compares median order-to-pickup duration against a 15-min
        walk-up queue baseline. Both metrics require ≥5 real orders.
      </div>

    </div>
  )
}
