import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'
import { CartDrawer } from './CartDrawer'

export function StickyNav() {
  const [scrolled, setScrolled] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const { user, role, logout } = useAuthStore()
  const count = useCartStore(s => s.getCount())
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isAdmin = role === 'staff'

  return (
    <>
      <motion.nav
        animate={{
          height: scrolled ? 52 : 64,
          backgroundColor: scrolled ? 'rgba(26,26,26,0.92)' : 'rgba(26,26,26,0)',
          backdropFilter: scrolled ? 'blur(16px)' : 'blur(0px)',
        }}
        transition={{ duration: 0.25 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 'var(--z-nav)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          borderBottom: scrolled ? '1px solid var(--color-border)' : 'none',
        }}
      >
        <div style={{
          maxWidth: 'var(--max-width)',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <Link to={isAdmin ? '/admin/dashboard' : '/'} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 'var(--text-xl)',
              color: 'var(--color-accent)',
              letterSpacing: '-0.5px',
            }}>
              🍱 CampusEats
            </span>
          </Link>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user && !isAdmin && (
              <motion.button
                onClick={() => setCartOpen(true)}
                whileTap={{ scale: 0.92 }}
                style={{
                  position: 'relative',
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-full)',
                  padding: '8px 16px',
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                🛒 Cart
                {count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 0.6 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    style={{
                      background: 'var(--color-accent)',
                      color: '#fff',
                      borderRadius: '50%',
                      width: 20,
                      height: 20,
                      fontSize: 11,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                    }}
                  >
                    {count}
                  </motion.span>
                )}
              </motion.button>
            )}

            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  {user.name?.split(' ')[0]}
                </span>
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '6px 12px' }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.nav>

      {/* Cart Drawer */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}
