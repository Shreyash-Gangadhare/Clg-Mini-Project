import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getOrder } from '../../api/client'
import { useWebSocket } from '../../hooks/useWebSocket'
import { OrderStatusStepper } from '../../components/OrderStatusStepper'
import { QRDisplay } from '../../components/QRDisplay'
import { getOrderQR } from '../../api/client'

// Demo: simulate status progression in mock mode
const MOCK_STATUS_PROGRESSION = ['placed', 'preparing', 'ready', 'picked_up']

// ── Browser Notification helpers ─────────────────────────────────────────────
// No-op gracefully if the Notification API is unsupported or permission denied.

function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {})
  }
}

function fireReadyNotification(orderToken) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  try {
    new Notification('🍽️ Order Ready!', {
      body: `Token #${orderToken} — head to the counter to pick up your order.`,
      icon: '/favicon.ico',
      tag: `campus-eats-order-${orderToken}`,   // prevent duplicate toasts
    })
  } catch (_) {
    // Firefox/iOS may throw even with permission — silently ignore
  }
}

export default function OrderStatusPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [qrData, setQrData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showReadyBanner, setShowReadyBanner] = useState(false)
  const [mockStep, setMockStep] = useState(0)

  const fetchOrder = useCallback(async () => {
    try {
      const res = await getOrder(id)
      setOrder(res.data)
    } catch (e) {
      console.error('Failed to fetch order', e)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchOrder() }, [fetchOrder])

  // Request notification permission once the order is loaded
  useEffect(() => {
    if (order) requestNotificationPermission()
  }, [!!order]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (order?.payment_status === 'paid') {
      getOrderQR(id).then(r => setQrData(r.data)).catch(() => {})
    }
  }, [order, id])

  // WebSocket subscription
  const handleWsMessage = useCallback((msg) => {
    if (msg.type === 'status_update') {
      setOrder(prev => prev ? { ...prev, status: msg.status } : prev)
      if (msg.status === 'ready') {
        setShowReadyBanner(true)
        fireReadyNotification(order?.token_number ?? msg.token_number ?? '?')
      }
    }
    if (msg.type === 'refund_issued') {
      alert(`Refund of ₹${msg.amount} issued: ${msg.reason}`)
    }
  }, [order?.token_number])

  useWebSocket(
    order ? `/ws/orders/${id}/` : null,
    handleWsMessage,
    !!order
  )

  // Mock mode: simulate status progression on button click
  const simulateNext = () => {
    const nextStep = mockStep + 1
    if (nextStep >= MOCK_STATUS_PROGRESSION.length) return
    setMockStep(nextStep)
    const nextStatus = MOCK_STATUS_PROGRESSION[nextStep]
    setOrder(prev => prev ? { ...prev, status: nextStatus } : prev)
    if (nextStatus === 'ready') {
      setShowReadyBanner(true)
      fireReadyNotification(order?.token_number ?? '?')
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-content" style={{ textAlign: 'center', paddingTop: 80 }}>
          <div className="skeleton" style={{ height: 40, width: '60%', margin: '0 auto 20px' }} />
          <div className="skeleton" style={{ height: 20, width: '80%', margin: '0 auto' }} />
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="page">
        <div className="page-content" style={{ textAlign: 'center', paddingTop: 80 }}>
          <p style={{ color: 'var(--color-text-muted)' }}>Order not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      {/* Ready Banner */}
      <AnimatePresence>
        {showReadyBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="toast ready"
            style={{ bottom: 80 }}
          >
            <span style={{ fontSize: 24 }}>✅</span>
            <span>Your order is ready! Head to the counter 🎉</span>
            <button
              onClick={() => setShowReadyBanner(false)}
              style={{ background: 'none', border: 'none', color: 'currentColor', cursor: 'pointer', fontWeight: 700 }}
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="page-content" style={{ maxWidth: 540 }}>
        <h1 className="section-title">
          Order #{order.id}
        </h1>

        {/* Status badge */}
        <div style={{ marginBottom: 24 }}>
          <span className={`badge ${
            order.status === 'ready' ? 'badge-open' :
            order.status === 'picked_up' ? '' :
            order.status === 'cancelled' ? 'badge-closed' : 'badge-accent'
          }`} style={{ fontSize: 'var(--text-sm)', padding: '8px 20px' }}>
            {order.status === 'placed' ? '📋 Order Placed' :
             order.status === 'preparing' ? '👨‍🍳 Being Prepared' :
             order.status === 'ready' ? '✅ Ready for Pickup!' :
             order.status === 'picked_up' ? '🛍️ Picked Up' :
             order.status === 'cancelled' ? '❌ Cancelled' : order.status}
          </span>
        </div>

        {/* Status stepper */}
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-2xl)',
          border: '1px solid var(--color-border)',
          padding: 20,
          marginBottom: 24,
        }}>
          <OrderStatusStepper status={order.status} />
        </div>

        {/* QR code */}
        {qrData && order.status !== 'cancelled' && (
          <div style={{ marginBottom: 24 }}>
            <QRDisplay
              qrImageUrl={qrData.qr_image_url}
              tokenNumber={qrData.token_number}
              orderId={order.id}
            />
          </div>
        )}

        {/* Order items */}
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-2xl)',
          border: '1px solid var(--color-border)',
          padding: 20,
          marginBottom: 24,
        }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 12 }}>Items</h3>
          {order.items?.map(oi => (
            <div key={oi.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 'var(--text-sm)' }}>
              <span>{oi.menu_item?.name} × {oi.quantity}</span>
              <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
                ₹{(Number(oi.price_at_order) * oi.quantity).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
          <div className="divider" style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>Total</span>
            <span style={{ color: 'var(--color-accent)' }}>₹{Number(order.total_amount).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Mock controls (demo only) */}
        {import.meta.env.DEV && order.status !== 'picked_up' && order.status !== 'cancelled' && (
          <div style={{
            background: 'rgba(255,107,53,0.05)',
            border: '1px dashed var(--color-accent)',
            borderRadius: 'var(--radius-xl)',
            padding: 16,
            marginBottom: 24,
          }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 8 }}>
              🛠️ Dev Mode — simulate status progression:
            </p>
            <button
              className="btn btn-ghost btn-sm"
              onClick={simulateNext}
              disabled={order.status === 'picked_up'}
            >
              Next Status: {MOCK_STATUS_PROGRESSION[mockStep + 1] || 'Done'} →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
