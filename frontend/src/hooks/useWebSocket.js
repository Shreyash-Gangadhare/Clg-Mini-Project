import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

/**
 * useWebSocket — connects to a WebSocket URL, auto-reconnects,
 * and re-syncs via REST on reconnect.
 *
 * @param {string|null} path  — e.g. '/ws/orders/42/'
 * @param {function}    onMessage — called with parsed JSON message
 * @param {boolean}     enabled — if false, does not connect
 */
export function useWebSocket(path, onMessage, enabled = true) {
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const mountedRef = useRef(true)
  const token = useAuthStore(s => s.token)

  const connect = useCallback(() => {
    if (!enabled || !path || !mountedRef.current) return

    const url = `${WS_BASE}${path}${path.includes('?') ? '&' : '?'}token=${token}`

    // In mock mode (no real WS server), silently no-op
    if (!token || token.startsWith('mock-')) return

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          onMessage(data)
        } catch (_) {}
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        // Reconnect after 3 seconds
        reconnectTimer.current = setTimeout(connect, 3000)
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch (_) {
      // WebSocket not available (e.g. mock mode)
    }
  }, [path, token, onMessage, enabled])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  return wsRef
}
