import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getSlots, getSlotCapacities, placeOrder, createPaymentOrder, verifyPayment } from '../../api/client'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import { SlotPicker } from '../../components/SlotPicker'
import { NumberFlip } from '../../components/NumberFlip'
import { ConfettiBurst } from '../../components/ConfettiBurst'
import { QRDisplay } from '../../components/QRDisplay'
import { VegDot } from '../../components/VegDot'
import { getOrderQR } from '../../api/client'

export default function CheckoutPage() {
  const [slots, setSlots] = useState([])
  const [slotCapacities, setSlotCapacities] = useState({})
  const [step, setStep] = useState('summary') // 'summary' | 'slot' | 'pay' | 'success'
  const [loading, setLoading] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [completedOrder, setCompletedOrder] = useState(null)
  const [qrData, setQrData] = useState(null)
  const [error, setError] = useState('')

  const { items, getTotal, selectedSlot, setSlot, clearCart } = useCartStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    getSlots().then(r => {
      setSlots(r.data)
      const now = Date.now()
      const openSlots = r.data.filter(s => new Date(s.cutoff_time) > now)
      openSlots.forEach(slot => {
        getSlotCapacities(slot.id)
          .then(cap => setSlotCapacities(prev => ({ ...prev, [slot.id]: cap.data })))
          .catch(() => {})
      })
    })
  }, [])

  const handlePayment = async () => {
    if (!selectedSlot) { setError('Please select a pickup slot.'); return }
    setError('')
    setLoading(true)
    try {
      // 1. Create order (placed + pending)
      const orderPayload = {
        slot_id: selectedSlot.id,
        items: items.map(i => ({ menu_item_id: i.menuItem.id, quantity: i.quantity })),
      }
      const orderRes = await placeOrder(orderPayload)
      const order = orderRes.data

      // 2. Create Razorpay payment order
      const paymentRes = await createPaymentOrder(order.id)
      const { razorpay_order_id, amount, key_id } = paymentRes.data

      // In mock mode, skip Razorpay JS SDK and simulate success
      if (key_id === 'rzp_test_mock_key') {
        await simulateMockPayment(order, razorpay_order_id)
        return
      }

      // Real Razorpay checkout
      await openRazorpayCheckout({ order, razorpay_order_id, amount, key_id })
    } catch (err) {
      setError(err.response?.data?.detail || 'Payment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const simulateMockPayment = async (order, razorpayOrderId) => {
    // Simulate Razorpay verify call
    const verifyRes = await verifyPayment({
      order_id: order.id,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: `pay_mock_${Date.now()}`,
      razorpay_signature: 'mock_signature',
    })
    const paidOrder = verifyRes.data.order || order
    setCompletedOrder(paidOrder)

    // Fetch QR
    const qrRes = await getOrderQR(paidOrder.id)
    setQrData(qrRes.data)

    setConfetti(true)
    setStep('success')
    clearCart()
    setLoading(false)
  }

  const openRazorpayCheckout = ({ order, razorpay_order_id, amount, key_id }) => {
    return new Promise((resolve, reject) => {
      const options = {
        key: key_id,
        amount,
        currency: 'INR',
        name: 'CampusEats',
        description: `Order #${order.id} — SIES GST Canteen`,
        order_id: razorpay_order_id,
        handler: async (response) => {
          try {
            setLoading(true)
            const verifyRes = await verifyPayment({
              order_id: order.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            const paidOrder = verifyRes.data.order || order
            setCompletedOrder(paidOrder)
            const qrRes = await getOrderQR(paidOrder.id)
            setQrData(qrRes.data)
            setConfetti(true)
            setStep('success')
            clearCart()
            resolve()
          } catch (e) {
            reject(e)
          } finally {
            setLoading(false)
          }
        },
        modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: '#FF6B35' },
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    })
  }

  if (items.length === 0 && step !== 'success') {
    return (
      <div className="page">
        <div className="page-content" style={{ textAlign: 'center', paddingTop: 80 }}>
          <div style={{ fontSize: 80, marginBottom: 16 }}>🛒</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: 8 }}>Cart is empty</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>Add some items from the menu first.</p>
          <button className="btn btn-primary" onClick={() => navigate('/menu')}>Browse Menu</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-content" style={{ maxWidth: 540 }}>
        {step !== 'success' ? (
          <>
            <h1 className="section-title">Checkout</h1>

            {/* Order Summary */}
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-2xl)',
              border: '1px solid var(--color-border)',
              padding: 20,
              marginBottom: 24,
            }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16, fontSize: 'var(--text-lg)' }}>
                📋 Order Summary
              </h3>
              {items.map(({ menuItem, quantity }) => (
                <div key={menuItem.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  paddingBottom: 12, marginBottom: 12,
                  borderBottom: '1px solid var(--color-border)',
                }}>
                  <VegDot isVeg={menuItem.veg_flag} size={14} />
                  <span style={{ flex: 1, fontWeight: 500, fontSize: 'var(--text-sm)' }}>{menuItem.name}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>×{quantity}</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-accent)', fontSize: 'var(--text-sm)' }}>
                    ₹{(Number(menuItem.price) * quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontWeight: 700 }}>Total</span>
                <NumberFlip value={getTotal()} style={{ fontSize: 'var(--text-2xl)', fontWeight: 900 }} />
              </div>
            </div>

            {/* Slot Picker */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 12, fontSize: 'var(--text-lg)' }}>
                ⏰ Pick a Pickup Slot
              </h3>
              <SlotPicker
                slots={slots}
                cartItems={items}
                slotCapacities={slotCapacities}
                selectedSlot={selectedSlot}
                onSelect={setSlot}
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ color: 'var(--color-error)', marginBottom: 16, textAlign: 'center', fontSize: 'var(--text-sm)' }}
              >
                ⚠️ {error}
              </motion.p>
            )}

            <motion.button
              id="pay-now-btn"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', padding: 16, fontSize: 'var(--text-lg)' }}
              onClick={handlePayment}
              disabled={loading || !selectedSlot}
              whileTap={{ scale: 0.97 }}
            >
              {loading ? 'Processing...' : `Pay ₹${getTotal().toLocaleString('en-IN')} →`}
            </motion.button>

            <p style={{ textAlign: 'center', marginTop: 12, fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
              🔒 Secured by Razorpay (test mode) · UPI, Cards, Netbanking
            </p>
          </>
        ) : (
          /* Success screen */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ position: 'relative', textAlign: 'center' }}
          >
            <ConfettiBurst trigger={confetti} />

            <div style={{ fontSize: 80, marginBottom: 16 }}>🎉</div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontWeight: 900,
              fontSize: 'var(--text-3xl)', color: 'var(--color-accent)', marginBottom: 8,
            }}>
              Order Confirmed!
            </h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 32 }}>
              Slot: {selectedSlot?.start_time} – {selectedSlot?.end_time} · Come at the right time!
            </p>

            {qrData && (
              <div style={{ marginBottom: 32 }}>
                <QRDisplay
                  qrImageUrl={qrData.qr_image_url}
                  tokenNumber={qrData.token_number}
                  orderId={qrData.order_id}
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/orders/${completedOrder?.id}`)}
              >
                Track Order Live →
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/menu')}
              >
                Order More
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
