import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { loginStudent } from '../../api/client'
import { useAuthStore } from '../../store/authStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.endsWith('@sies.edu.in')) {
      setError('Please use your SIES college email (@sies.edu.in)')
      return
    }
    setLoading(true)
    try {
      const { data } = await loginStudent(email, password)
      setAuth({ token: data.access, refreshToken: data.refresh, user: data.user, role: 'student' })
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-4)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-3xl)',
          border: '1px solid var(--color-border)',
          padding: 'var(--space-10)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🍱</div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 'var(--text-3xl)',
            color: 'var(--color-accent)',
            marginBottom: 4,
          }}>
            CampusEats
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            SIES GST Canteen — Skip the queue
          </p>
        </div>

        <form id="student-login-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label" htmlFor="login-email">College Email</label>
            <input
              id="login-email"
              className={`input ${error && error.includes('email') ? 'error' : ''}`}
              type="email"
              placeholder="yourname@sies.edu.in"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="input"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)', textAlign: 'center' }}
            >
              ⚠️ {error}
            </motion.p>
          )}

          <motion.button
            id="student-login-submit"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </motion.button>
        </form>

        <div style={{
          marginTop: 'var(--space-6)',
          paddingTop: 'var(--space-6)',
          borderTop: '1px solid var(--color-border)',
          textAlign: 'center',
        }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 12 }}>
            New student?{' '}
            <Link to="/register" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
              Create account
            </Link>
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Canteen staff?{' '}
            <Link to="/admin/login" style={{ color: 'var(--color-text-muted)' }}>
              Staff login →
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
