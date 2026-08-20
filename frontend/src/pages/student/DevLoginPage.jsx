// DEV-ONLY auto-login page for browser testing
// Accessible at /dev-login?role=student or /dev-login?role=staff
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function DevLoginPage() {
  const { setAuth, logout } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!import.meta.env.DEV) {
      navigate('/')
      return
    }
    const params = new URLSearchParams(window.location.search)
    const role = params.get('role') || 'student'
    const redirect = params.get('redirect') || (role === 'staff' ? '/admin/dashboard' : '/')

    // Always clear existing auth first to avoid stale role conflicts
    logout()

    if (role === 'staff') {
      setAuth({
        token: 'mock-staff-access-token',
        refreshToken: 'mock-staff-refresh-token',
        user: { id: 1, name: 'Canteen Admin', email: 'admin@sies.edu.in', role: 'admin' },
        role: 'staff',
      })
    } else {
      setAuth({
        token: 'mock-student-access-token',
        refreshToken: 'mock-student-refresh-token',
        user: { id: 1, name: 'Arjun Sharma', email: 'arjun@sies.edu.in', roll_number: 'CS2021001', phone: '9876543210' },
        role: 'student',
      })
    }
    navigate(redirect, { replace: true })
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-text-muted)' }}>
      Auto-logging in...
    </div>
  )
}
