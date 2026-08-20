import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

// Student pages
import LoginPage from './pages/student/LoginPage'
import RegisterPage from './pages/student/RegisterPage'
import HeroPage from './pages/student/HeroPage'
import MenuPage from './pages/student/MenuPage'
import CheckoutPage from './pages/student/CheckoutPage'
import OrderStatusPage from './pages/student/OrderStatusPage'
import OrderHistoryPage from './pages/student/OrderHistoryPage'
import DevLoginPage from './pages/student/DevLoginPage'

// Admin pages
import AdminLoginPage from './pages/admin/AdminLoginPage'
import MenuManagementPage from './pages/admin/MenuManagementPage'
import SlotManagementPage from './pages/admin/SlotManagementPage'
import KDSPage from './pages/admin/KDSPage'
import QRScannerPage from './pages/admin/QRScannerPage'
import DashboardPage from './pages/admin/DashboardPage'
import InsightsPage from './pages/admin/InsightsPage'
import { AdminLayout } from './pages/admin/AdminLayout'

// Shared
import { StickyNav } from './components/StickyNav'

// ---- Route guards ----

function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    // useAuthStore.persist.hasHydrated() may not exist; just tick
    setHydrated(true)
  }, [])
  return hydrated
}

function StudentRoute({ children }) {
  const token = useAuthStore(s => s.token)
  const role = useAuthStore(s => s.role)
  const hydrated = useHydrated()
  if (!hydrated) return null  // wait for persist rehydration
  if (!token) return <Navigate to="/login" replace />
  if (role === 'staff') return <Navigate to="/admin/dashboard" replace />
  return children
}

function StaffRoute({ children }) {
  const token = useAuthStore(s => s.token)
  const role = useAuthStore(s => s.role)
  const hydrated = useHydrated()
  if (!hydrated) return null
  if (!token) return <Navigate to="/admin/login" replace />
  if (role !== 'staff') return <Navigate to="/" replace />
  return <AdminLayout>{children}</AdminLayout>
}

function StudentLayout({ children }) {
  return (
    <>
      <StickyNav />
      {children}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public student auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Staff auth */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Student protected routes */}
        <Route path="/" element={
          <StudentRoute>
            <StudentLayout><HeroPage /></StudentLayout>
          </StudentRoute>
        } />
        <Route path="/menu" element={
          <StudentRoute>
            <StudentLayout><MenuPage /></StudentLayout>
          </StudentRoute>
        } />
        <Route path="/checkout" element={
          <StudentRoute>
            <StudentLayout><CheckoutPage /></StudentLayout>
          </StudentRoute>
        } />
        <Route path="/orders" element={
          <StudentRoute>
            <StudentLayout><OrderHistoryPage /></StudentLayout>
          </StudentRoute>
        } />
        <Route path="/orders/:id" element={
          <StudentRoute>
            <StudentLayout><OrderStatusPage /></StudentLayout>
          </StudentRoute>
        } />

        {/* Admin/Staff protected routes */}
        <Route path="/admin/dashboard" element={<StaffRoute><DashboardPage /></StaffRoute>} />
        <Route path="/admin/insights"  element={<StaffRoute><InsightsPage /></StaffRoute>} />
        <Route path="/admin/menu" element={<StaffRoute><MenuManagementPage /></StaffRoute>} />
        <Route path="/admin/slots" element={<StaffRoute><SlotManagementPage /></StaffRoute>} />
        <Route path="/admin/kds" element={<StaffRoute><KDSPage /></StaffRoute>} />
        <Route path="/admin/scanner" element={<StaffRoute><QRScannerPage /></StaffRoute>} />

        {/* Dev auto-login (DEV only) */}
        {import.meta.env.DEV && <Route path="/dev-login" element={<DevLoginPage />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
