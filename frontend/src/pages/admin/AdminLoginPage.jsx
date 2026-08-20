import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { loginStaff } from '../../api/client'
import { useAuthStore } from '../../store/authStore'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await loginStaff(email, password)
      setAuth({ token: data.access, refreshToken: data.refresh, user: data.user, role: 'staff' })
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#111111',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-2xl)',
          border: '1px solid var(--color-border)',
          padding: 40,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🧑‍🍳</div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'var(--text-2xl)',
            marginBottom: 4,
          }}>
            Staff Portal
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            CampusEats · SIES GST Canteen
          </p>
        </div>

        <form id="staff-login-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label" htmlFor="staff-email">Staff Email</label>
            <input
              id="staff-email"
              className="input"
              type="email"
              placeholder="admin@sies.edu.in"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="staff-password">Password</label>
            <input
              id="staff-password"
              className="input"
              type="password"
              placeholder="Staff password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>
              ⚠️ {error}
            </p>
          )}

          <button
            id="staff-login-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: 14 }}
          >
            {loading ? 'Signing in...' : 'Sign In as Staff'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
          Demo: use any email with "admin" or "staff" + any password
        </p>
      </motion.div>
    </div>
  )
}
