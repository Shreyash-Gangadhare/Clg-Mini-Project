import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getCanteenStatus } from '../../api/client'

export default function HeroPage() {
  const [status, setStatus] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    getCanteenStatus()
      .then(r => setStatus(r.data))
      .catch(() => setStatus({ is_open: true, message: 'Kitchen is live 🔥', orders_today: 0 }))
  }, [])

  return (
    <section
      id="hero-section"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #1A1A1A 0%, #2A1A0A 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px 40px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 600,
        height: 400,
        background: 'radial-gradient(ellipse at center, rgba(255,107,53,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Hero content */}
      <div style={{ maxWidth: 680, width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        {/* Status Badge */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ marginBottom: 24 }}
        >
          {status ? (
            <span
              id="canteen-status-badge"
              className={`badge ${status.is_open ? 'badge-open' : 'badge-closed'}`}
              style={{ fontSize: 'var(--text-sm)', padding: '8px 20px' }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor', display: 'inline-block', marginRight: 6, animation: status.is_open ? 'pulse 2s infinite' : 'none' }} />
              {status.is_open ? '● Open Now' : '○ Closed'}
              {' — '}{status.message}
              {status.orders_today > 0 && ` · ${status.orders_today} orders today`}
            </span>
          ) : (
            <span className="skeleton" style={{ display: 'inline-block', width: 200, height: 32 }} />
          )}
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          style={{
            fontFamily: 'var(--font-hero)',
            fontWeight: 800,
            fontSize: 'clamp(2.6rem, 9vw, 5rem)',
            lineHeight: 1.0,
            marginBottom: 20,
            letterSpacing: '-0.035em',
            background: 'linear-gradient(135deg, #FFF8F0 0%, #FF6B35 65%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Skip the queue.<br />
          <span style={{ fontStyle: 'italic' }}>Order ahead.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          style={{
            fontSize: 'clamp(1rem, 3vw, 1.25rem)',
            color: 'var(--color-text-muted)',
            marginBottom: 40,
            maxWidth: 480,
            margin: '0 auto 40px',
            lineHeight: 1.7,
          }}
        >
          Order from SIES GST Canteen in seconds. Pick up hot, freshly made food — zero wait.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}
        >
          <motion.button
            id="hero-order-now-btn"
            className="btn btn-primary btn-lg"
            onClick={() => navigate('/menu')}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            style={{
              padding: '16px 36px',
              fontSize: 'var(--text-lg)',
              boxShadow: 'var(--shadow-accent)',
            }}
          >
            🍽️ Order Now
          </motion.button>
          <motion.button
            className="btn btn-ghost btn-lg"
            onClick={() => navigate('/orders')}
            whileTap={{ scale: 0.95 }}
            style={{ padding: '16px 28px', fontSize: 'var(--text-lg)' }}
          >
            My Orders
          </motion.button>
        </motion.div>

        {/* Hero image with steam */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 32 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.55, type: 'spring', stiffness: 120 }}
          style={{
            position: 'relative',
            display: 'inline-block',
            borderRadius: 'var(--radius-3xl)',
            overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(255,107,53,0.2)',
            maxWidth: 600,
            width: '100%',
          }}
        >
          <img
            src="/hero-food.png"
            alt="SIES GST Canteen spread — vada pav, chai, pav bhaji and more"
            style={{ width: '100%', display: 'block', objectFit: 'cover', maxHeight: 400 }}
          />
          {/* Steam loop overlay */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '60%',
            pointerEvents: 'none',
          }}>
            <div className="steam-particle" />
            <div className="steam-particle" />
            <div className="steam-particle" />
            <div className="steam-particle" />
          </div>

          {/* Gradient overlay for readability */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40%',
            background: 'linear-gradient(to bottom, transparent, rgba(26,26,26,0.8))',
          }} />
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 40,
            marginTop: 48,
            flexWrap: 'wrap',
          }}
        >
          {[
            { value: '72+', label: 'Menu items' },
            { value: '0 min', label: 'Queue wait' },
            { value: '₹5', label: 'Starts at' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-hero)',
                fontWeight: 800,
                fontSize: 'var(--text-3xl)',
                color: 'var(--color-accent)',
                letterSpacing: '-0.03em',
              }}>
                {stat.value}
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </section>
  )
}
