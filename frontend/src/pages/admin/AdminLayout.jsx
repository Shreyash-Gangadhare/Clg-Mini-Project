import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const NAV_LINKS = [
  { to: '/admin/dashboard',  label: 'Dashboard',  icon: '📊' },
  { to: '/admin/insights',   label: 'Insights',    icon: '📈' },
  { to: '/admin/menu',       label: 'Menu',        icon: '🍽️' },
  { to: '/admin/slots',      label: 'Slots',       icon: '⏰' },
  { to: '/admin/kds',        label: 'KDS Queue',   icon: '📺' },
  { to: '/admin/scanner',    label: 'Scanner',     icon: '📷' },
]

export function AdminLayout({ children }) {
  const location = useLocation()
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#111' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'var(--text-base)', color: 'var(--color-accent)' }}>
            🍱 CampusEats
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 2 }}>Staff Portal</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {NAV_LINKS.map(link => {
            const isActive = location.pathname === link.to
            return (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 20px',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 'var(--text-sm)',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  background: isActive ? 'var(--color-accent-muted)' : 'transparent',
                  borderLeft: `3px solid ${isActive ? 'var(--color-accent)' : 'transparent'}`,
                  transition: 'background 0.15s, color 0.15s',
                  textDecoration: 'none',
                }}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>{user?.name}</p>
          <button
            onClick={handleLogout}
            style={{
              background: 'none', border: 'none', color: 'var(--color-text-faint)',
              fontSize: 12, cursor: 'pointer', padding: 0,
            }}
          >
            Logout →
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
