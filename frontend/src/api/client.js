import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token on every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 — log out
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

// --- Auth ---
export const loginStudent = (email, password) =>
  api.post('/auth/student/', { email, password })

export const loginStaff = (email, password) =>
  api.post('/auth/staff/', { email, password })

export const registerStudent = (data) =>
  api.post('/register/', data)

// --- Menu ---
export const getMenu = (category) =>
  api.get('/menu/', { params: category ? { category } : {} })

export const createMenuItem = (data) => api.post('/menu/', data)
export const updateMenuItem = (id, data) => api.patch(`/menu/${id}/`, data)
export const deleteMenuItem = (id) => api.delete(`/menu/${id}/`)

// --- Slots ---
export const getSlots = () => api.get('/slots/')
export const createSlot = (data) => api.post('/slots/', data)
export const bulkGenerateSlots = () => api.post('/slots/generate_today/')
export const getSlotCapacities = (slotId) => api.get(`/slots/${slotId}/capacity/`)
export const setCapacity = (slotId, data) => api.post(`/slots/${slotId}/capacity/`, data)
export const updateCapacity = (slotId, capId, data) => api.patch(`/slots/${slotId}/capacity/${capId}/`, data)

// --- Orders ---
export const placeOrder = (data) => api.post('/orders/', data)
export const getOrders = () => api.get('/orders/')
export const getOrder = (id) => api.get(`/orders/${id}/`)
export const getOrderQR = (id) => api.get(`/orders/${id}/qr/`)
export const scanQR = (id, token) => api.post(`/orders/${id}/scan/`, { token })
export const updateOrderStatus = (id, status) => api.patch(`/orders/${id}/status/`, { status })
export const bulkUpdateStatus = (slotId, fromStatus, toStatus) =>
  api.post('/orders/bulk-status/', { slot_id: slotId, from_status: fromStatus, to_status: toStatus })

// --- Payments ---
export const createPaymentOrder = (orderId) =>
  api.post('/payments/create-order/', { order_id: orderId })

export const verifyPayment = (data) =>
  api.post('/payments/verify/', data)

// --- Dashboard ---
export const getDashboard = () => api.get('/dashboard/')

// --- Insights (analytics) ---
// Pass demo=true to request sample data when the real DB is sparse.
export const getInsights = (demo = false) =>
  api.get('/insights/', { params: demo ? { demo: 1 } : {} })

// --- Canteen status ---
export const getCanteenStatus = () => api.get('/canteen-status/')
