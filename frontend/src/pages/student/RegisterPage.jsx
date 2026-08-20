import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { registerStudent } from '../../api/client'

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '', email: '', roll_number: '', phone: '', password: '', confirm: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.email.endsWith('@sies.edu.in')) {
      setError('Please use your SIES college email (@sies.edu.in)')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await registerStudent({
        name: form.name,
        email: form.email,
        roll_number: form.roll_number,
        phone: form.phone,
        password: form.password,
      })
      navigate('/login', { state: { registered: true } })
    } catch (err) {
      const data = err.response?.data
      setError(
        typeof data === 'object'
          ? Object.values(data).flat().join(' ')
          : 'Registration failed. Please try again.'
      )
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
          maxWidth: 480,
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-3xl)',
          border: '1px solid var(--color-border)',
          padding: 'var(--space-10)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎓</div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 'var(--text-2xl)',
            color: 'var(--color-text)',
            marginBottom: 4,
          }}>
            Join CampusEats
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Register with your SIES college email
          </p>
        </div>

        <form id="student-register-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label" htmlFor="reg-name">Full Name</label>
            <input id="reg-name" className="input" type="text" placeholder="Arjun Sharma" value={form.name} onChange={set('name')} required />
          </div>
          <div>
            <label className="label" htmlFor="reg-email">College Email</label>
            <input id="reg-email" className="input" type="email" placeholder="yourname@sies.edu.in" value={form.email} onChange={set('email')} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label" htmlFor="reg-roll">Roll Number</label>
              <input id="reg-roll" className="input" type="text" placeholder="CS2021001" value={form.roll_number} onChange={set('roll_number')} required />
            </div>
            <div>
              <label className="label" htmlFor="reg-phone">Phone</label>
              <input id="reg-phone" className="input" type="tel" placeholder="9876543210" value={form.phone} onChange={set('phone')} required />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="reg-password">Password</label>
            <input id="reg-password" className="input" type="password" placeholder="Create a password" value={form.password} onChange={set('password')} required />
          </div>
          <div>
            <label className="label" htmlFor="reg-confirm">Confirm Password</label>
            <input id="reg-confirm" className="input" type="password" placeholder="Repeat password" value={form.confirm} onChange={set('confirm')} required />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)', textAlign: 'center' }}
            >
              ⚠️ {error}
            </motion.p>
          )}

          <motion.button
            id="register-submit"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </motion.button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 'var(--space-5)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
