import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSlots, bulkUpdateStatus } from '../../api/client'
import { useWebSocket } from '../../hooks/useWebSocket'

// Mock KDS data — aggregated per slot
const MOCK_KDS_DATA = {
  // slot_id -> { slot, aggregated_items: [{item_name, quantity}], orders_count }
}

export default function KDSPage() {
  const [slots, setSlots] = useState([])
  const [kdsData, setKdsData] = useState({})
  const [slotStatuses, setSlotStatuses] = useState({}) // slotId -> 'pending'|'preparing'|'ready'
  const [updating, setUpdating] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadSlots = useCallback(async () => {
    setLoading(true)
    const res = await getSlots()
    const today = new Date().toISOString().split('T')[0]
    const todaySlots = res.data.filter(s => s.date === today)
    setSlots(todaySlots)

    // Initialize KDS with mock aggregated data
    const kds = {}
    const statuses = {}
    todaySlots.forEach(slot => {
      kds[slot.id] = {
        slot,
        aggregated_items: [
          { item_name: 'Vada Pav', quantity: Math.floor(Math.random() * 8) + 2 },
          { item_name: 'Masala Chai', quantity: Math.floor(Math.random() * 12) + 4 },
          { item_name: 'Misal Pav', quantity: Math.floor(Math.random() * 5) + 1 },
        ].filter(i => i.quantity > 0),
        orders_count: Math.floor(Math.random() * 6) + 1,
      }
      statuses[slot.id] = 'pending'
    })
    setKdsData(kds)
    setSlotStatuses(statuses)
    setLoading(false)
  }, [])

  useEffect(() => { loadSlots() }, [loadSlots])

  // WebSocket for live updates
  const handleWsMessage = useCallback((msg) => {
    if (msg.type === 'new_order') {
      setKdsData(prev => {
        const existing = prev[msg.slot_id]
        if (!existing) return prev
        // Merge aggregated items
        const merged = [...existing.aggregated_items]
        msg.aggregated_items?.forEach(newItem => {
          const idx = merged.findIndex(i => i.item_name === newItem.item_name)
          if (idx >= 0) {
            merged[idx] = { ...merged[idx], quantity: merged[idx].quantity + newItem.quantity }
          } else {
            merged.push(newItem)
          }
        })
        return {
          ...prev,
          [msg.slot_id]: {
            ...existing,
            aggregated_items: merged,
            orders_count: (existing.orders_count || 0) + 1,
          },
        }
      })
    }
  }, [])

  useWebSocket('/ws/kds/', handleWsMessage, true)

  const handleBulkUpdate = async (slotId, fromStatus, toStatus) => {
    setUpdating(slotId)
    try {
      await bulkUpdateStatus(slotId, fromStatus, toStatus)
      setSlotStatuses(prev => ({ ...prev, [slotId]: toStatus }))
    } catch (e) {
      console.error('Bulk update failed', e)
    } finally {
      setUpdating(null)
    }
  }

  const now = Date.now()

  return (
    <div className="admin-layout" style={{ minHeight: '100vh', padding: '80px 24px 40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-2xl)' }}>
            📺 Kitchen Display (KDS)
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Live</span>
          </div>
        </div>

        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 24 }}>
          Orders aggregated by slot — bulk-mark all items in a slot at once.
        </p>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 220, borderRadius: 'var(--radius-xl)' }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {slots.map(slot => {
              const data = kdsData[slot.id]
              const status = slotStatuses[slot.id] || 'pending'
              const isPast = new Date(slot.cutoff_time) < now
              const isUpdating = updating === slot.id

              const statusColors = {
                pending:   { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', color: 'var(--color-info)' },
                preparing: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', color: 'var(--color-warning)' },
                ready:     { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', color: 'var(--color-success)' },
              }
              const sc = statusColors[status] || statusColors.pending

              return (
                <motion.div
                  key={slot.id}
                  layout
                  style={{
                    background: sc.bg,
                    border: `1.5px solid ${sc.border}`,
                    borderRadius: 'var(--radius-xl)',
                    padding: 20,
                    opacity: isPast && status !== 'preparing' && status !== 'ready' ? 0.5 : 1,
                  }}
                >
                  {/* Slot header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-lg)', marginBottom: 2 }}>
                        {slot.start_time} – {slot.end_time}
                      </h3>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {data?.orders_count || 0} orders
                      </span>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: sc.color,
                      background: 'rgba(0,0,0,0.2)', borderRadius: 6,
                      padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {status}
                    </span>
                  </div>

                  {/* Aggregated items */}
                  {data?.aggregated_items?.length > 0 ? (
                    <div style={{ marginBottom: 16 }}>
                      {data.aggregated_items.map(item => (
                        <div
                          key={item.item_name}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '6px 0',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{item.item_name}</span>
                          <span style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 900,
                            fontSize: 'var(--text-xl)',
                            color: sc.color,
                          }}>
                            ×{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)', marginBottom: 16 }}>
                      No orders yet
                    </p>
                  )}

                  {/* Bulk action buttons */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {status === 'pending' && (
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={isUpdating || (data?.orders_count || 0) === 0}
                        onClick={() => handleBulkUpdate(slot.id, 'placed', 'preparing')}
                        style={{ flex: 1 }}
                      >
                        {isUpdating ? '...' : '👨‍🍳 Start Preparing'}
                      </button>
                    )}
                    {status === 'preparing' && (
                      <button
                        className="btn btn-sm"
                        disabled={isUpdating}
                        onClick={() => handleBulkUpdate(slot.id, 'preparing', 'ready')}
                        style={{
                          flex: 1, background: 'var(--color-success)', color: '#fff',
                          border: 'none', borderRadius: 'var(--radius-full)', fontWeight: 700,
                          cursor: 'pointer', padding: '8px 16px',
                        }}
                      >
                        {isUpdating ? '...' : '✅ Mark Ready'}
                      </button>
                    )}
                    {status === 'ready' && (
                      <div style={{
                        flex: 1, textAlign: 'center', fontSize: 'var(--text-sm)',
                        color: 'var(--color-success)', fontWeight: 700, padding: '8px 0',
                      }}>
                        ✅ Ready for pickup
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
