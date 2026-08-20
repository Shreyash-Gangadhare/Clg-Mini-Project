import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getOrders } from '../../api/client'
import { useCartStore } from '../../store/cartStore'

const STATUS_COLOR = {
  placed:     'var(--color-info)',
  preparing:  'var(--color-warning)',
  ready:      'var(--color-success)',
  picked_up:  'var(--color-text-muted)',
  cancelled:  'var(--color-error)',
}

const STATUS_LABEL = {
  placed:     '📋 Placed',
  preparing:  '👨‍🍳 Preparing',
  ready:      '✅ Ready',
  picked_up:  '🛍️ Picked Up',
  cancelled:  '❌ Cancelled',
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const { addItem } = useCartStore()
  const navigate = useNavigate()

  useEffect(() => {
    getOrders()
      .then(r => setOrders(r.data.reverse()))
      .finally(() => setLoading(false))
  }, [])

  const reorder = (order) => {
    order.items?.forEach(oi => {
      if (oi.menu_item) addItem(oi.menu_item)
    })
    navigate('/checkout')
  }

  return (
    <div className="page">
      <div className="page-content" style={{ maxWidth: 640 }}>
        <h1 className="section-title">📜 My Orders</h1>

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-2xl)', marginBottom: 16 }} />
          ))
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📭</div>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-text-muted)', fontSize: 'var(--text-lg)' }}>
              No orders yet
            </p>
            <p style={{ color: 'var(--color-text-faint)', marginBottom: 24 }}>
              Your order history will appear here.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/menu')}>
              Browse Menu
            </button>
          </div>
        ) : (
          orders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-2xl)',
                border: '1px solid var(--color-border)',
                padding: 20,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: 4 }}>
                    Order #{order.id}
                  </h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                    {new Date(order.created_at).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                    {order.slot && ` · Slot ${order.slot.start_time}`}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: 'var(--text-xs)', fontWeight: 700,
                    color: STATUS_COLOR[order.status] || 'var(--color-text-muted)',
                  }}>
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                  <p style={{ fontSize: 'var(--text-lg)', fontWeight: 900, color: 'var(--color-accent)', fontFamily: 'var(--font-display)', marginTop: 2 }}>
                    ₹{Number(order.total_amount).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Items list */}
              <div style={{ marginBottom: 12 }}>
                {order.items?.slice(0, 3).map(oi => (
                  <span key={oi.id} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginRight: 8 }}>
                    {oi.menu_item?.name} ×{oi.quantity}
                  </span>
                ))}
                {order.items?.length > 3 && (
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                    +{order.items.length - 3} more
                  </span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  View Details
                </button>
                {order.status !== 'cancelled' && (
                  <motion.button
                    className="btn btn-primary btn-sm"
                    onClick={() => reorder(order)}
                    whileTap={{ scale: 0.94 }}
                  >
                    🔄 Reorder
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
