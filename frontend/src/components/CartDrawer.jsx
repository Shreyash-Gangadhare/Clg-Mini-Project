import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '../store/cartStore'
import { NumberFlip } from './NumberFlip'
import { VegDot } from './VegDot'
import { useNavigate } from 'react-router-dom'

const drawerVariants = {
  hidden:  { x: '100%', opacity: 0 },
  visible: { x: 0,      opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 35 } },
  exit:    { x: '100%', opacity: 0, transition: { duration: 0.2 } },
}

const itemVariants = {
  hidden:  { opacity: 0, x: 20 },
  visible: (i) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.05, type: 'spring', stiffness: 400, damping: 30 },
  }),
}

export function CartDrawer({ isOpen, onClose }) {
  const { items, addItem, removeItem, getTotal, clearCart } = useCartStore()
  const navigate = useNavigate()

  const handleCheckout = () => {
    onClose()
    navigate('/checkout')
  }

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 'var(--z-drawer)',
              backdropFilter: 'blur(4px)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Drawer panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              maxWidth: 420,
              background: 'var(--color-surface)',
              zIndex: 'calc(var(--z-drawer) + 1)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-8px 0 32px rgba(0,0,0,0.6)',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid var(--color-border)',
            }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-xl)' }}>
                🛒 Your Cart
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-full)',
                  width: 36, height: 36,
                  color: 'var(--color-text)',
                  fontSize: 18,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Items list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {items.length === 0 ? (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', height: '100%', gap: 16,
                }}>
                  <span style={{ fontSize: 64 }}>🛒</span>
                  <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}>
                    Your cart is empty
                  </p>
                  <p style={{ color: 'var(--color-text-faint)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>
                    Add some delicious items from the menu!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {items.map(({ menuItem, quantity }, i) => (
                    <motion.div
                      key={menuItem.id}
                      custom={i}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        background: 'var(--color-surface-2)',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <VegDot isVeg={menuItem.veg_flag} size={14} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {menuItem.name}
                        </p>
                        <p style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                          ₹{Number(menuItem.price).toLocaleString('en-IN')}
                        </p>
                      </div>

                      {/* Quantity stepper */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'var(--color-surface-3)',
                        borderRadius: 'var(--radius-full)',
                        padding: '4px 8px',
                      }}>
                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={() => removeItem(menuItem.id)}
                          style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: quantity === 1 ? 'rgba(239,68,68,0.2)' : 'var(--color-accent-muted)',
                            border: 'none', color: quantity === 1 ? 'var(--color-error)' : 'var(--color-accent)',
                            fontWeight: 700, fontSize: 16, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {quantity === 1 ? '🗑' : '−'}
                        </motion.button>
                        <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', minWidth: 20, textAlign: 'center' }}>
                          {quantity}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={() => addItem(menuItem)}
                          style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: 'var(--color-accent)',
                            border: 'none', color: '#fff',
                            fontWeight: 700, fontSize: 16, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          +
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer — total + checkout */}
            {items.length > 0 && (
              <div style={{
                padding: '20px 24px',
                borderTop: '1px solid var(--color-border)',
                background: 'var(--color-surface-2)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Total</span>
                  <NumberFlip
                    value={getTotal()}
                    style={{ fontSize: 'var(--text-2xl)', fontWeight: 900, color: 'var(--color-text)' }}
                  />
                </div>
                <button className="btn btn-primary" style={{ width: '100%', padding: '14px' }} onClick={handleCheckout}>
                  Proceed to Checkout →
                </button>
                <button
                  onClick={clearCart}
                  style={{
                    width: '100%', marginTop: 8, padding: '8px',
                    background: 'none', border: 'none', color: 'var(--color-text-faint)',
                    fontSize: 'var(--text-sm)', cursor: 'pointer',
                  }}
                >
                  Clear cart
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
