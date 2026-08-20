import React, { useState, useRef, useEffect, useCallback } from 'react'
import jsQR from 'jsqr'
import { scanQR, updateOrderStatus } from '../../api/client'

export default function QRScannerPage() {
  const [mode, setMode] = useState('camera') // 'camera' | 'manual'
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [manualToken, setManualToken] = useState('')
  const [loading, setLoading] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)

  const stopCamera = useCallback(() => {
    setScanning(false)
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  const startCamera = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      videoRef.current.play()
      setScanning(true)
      scanFrame()
    } catch (e) {
      setError('Camera not available. Please use manual entry below.')
    }
  }

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight
      canvas.width = video.videoWidth
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code) {
        stopCamera()
        handleQRData(code.data)
        return
      }
    }
    rafRef.current = requestAnimationFrame(scanFrame)
  }

  const handleQRData = async (qrString) => {
    setLoading(true)
    setError('')
    // Expected format: campuseats:order:{id}:{token}
    const parts = qrString.split(':')
    if (parts.length !== 4 || parts[0] !== 'campuseats' || parts[1] !== 'order') {
      setError('Invalid QR code — not a CampusEats order QR.')
      setLoading(false)
      return
    }
    const orderId = parts[2]
    const token = parts[3]
    try {
      const res = await scanQR(orderId, token)
      setResult({ type: 'qr', order: res.data })
    } catch (e) {
      setError(e.response?.data?.detail || 'QR scan failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!manualToken.trim()) return
    setLoading(true)
    try {
      // Manual token: find order by token number via scan endpoint
      // In mock mode, we'll use a simple approach
      const tokenNum = parseInt(manualToken.replace('T-', '').replace('t-', ''), 10)
      // Find by scanning order ID = tokenNum (simplification for mock)
      const res = await scanQR(tokenNum, 'manual')
      setResult({ type: 'manual', order: res.data })
    } catch (e) {
      setError(`Token T-${manualToken} not found or already picked up.`)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setResult(null)
    setError('')
    setManualToken('')
    setScanning(false)
  }

  return (
    <div className="admin-layout" style={{ minHeight: '100vh', padding: '80px 24px 40px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-2xl)', marginBottom: 8 }}>
          📷 QR Scanner
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 24 }}>
          Scan student QR or enter token number to mark pickup.
        </p>

        {result ? (
          /* Success panel */
          <div style={{
            background: 'rgba(34,197,94,0.1)',
            border: '2px solid var(--color-success)',
            borderRadius: 'var(--radius-2xl)',
            padding: 32,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--color-success)', marginBottom: 8 }}>
              Picked Up!
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 8 }}>
              Order #{result.order.id} marked as picked up.
            </p>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'var(--text-3xl)', color: 'var(--color-text)', marginBottom: 24 }}>
              T-{String(result.order.token_number).padStart(2, '0')}
            </p>
            <button className="btn btn-primary" onClick={reset}>Scan Next</button>
          </div>
        ) : (
          <>
            {/* Mode toggle */}
            <div style={{
              display: 'flex',
              background: 'var(--color-surface-2)',
              borderRadius: 'var(--radius-full)',
              padding: 4,
              marginBottom: 24,
              border: '1px solid var(--color-border)',
            }}>
              {[['camera', '📷 Camera Scan'], ['manual', '⌨️ Manual Entry']].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setMode(key); stopCamera(); setError('') }}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-full)',
                    border: 'none',
                    background: mode === key ? 'var(--color-surface-3)' : 'transparent',
                    color: mode === key ? 'var(--color-text)' : 'var(--color-text-muted)',
                    fontWeight: mode === key ? 700 : 500,
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    transition: 'background 0.2s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Camera mode */}
            {mode === 'camera' && (
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius-2xl)',
                  border: '1px solid var(--color-border)',
                  overflow: 'hidden',
                  aspectRatio: '4/3',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <video
                    ref={videoRef}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: scanning ? 'block' : 'none' }}
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  {!scanning && (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                      <div style={{ fontSize: 64, marginBottom: 16 }}>📷</div>
                      <p style={{ color: 'var(--color-text-muted)', marginBottom: 20, fontSize: 'var(--text-sm)' }}>
                        Camera preview will appear here
                      </p>
                      <button className="btn btn-primary" onClick={startCamera}>
                        Start Camera
                      </button>
                    </div>
                  )}
                  {scanning && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 200,
                      height: 200,
                      border: '3px solid var(--color-accent)',
                      borderRadius: 12,
                      boxShadow: '0 0 0 4000px rgba(0,0,0,0.4)',
                      pointerEvents: 'none',
                    }} />
                  )}
                </div>
                {scanning && (
                  <button className="btn btn-secondary" onClick={stopCamera} style={{ width: '100%', marginTop: 12 }}>
                    Stop Camera
                  </button>
                )}
              </div>
            )}

            {/* Manual entry (always shown below camera, or as primary in manual mode) */}
            {(mode === 'manual' || mode === 'camera') && (
              <div style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-2xl)',
                border: mode === 'manual' ? '1px solid var(--color-border)' : '1px dashed var(--color-border)',
                padding: 20,
              }}>
                {mode === 'camera' && (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 12 }}>
                    Camera not working? Enter token manually:
                  </p>
                )}
                <form id="manual-token-form" onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <input
                      className="input"
                      placeholder="Token number (e.g. 1 or T-01)"
                      value={manualToken}
                      onChange={e => setManualToken(e.target.value)}
                      id="manual-token-input"
                    />
                  </div>
                  <button
                    id="manual-token-submit"
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || !manualToken.trim()}
                  >
                    {loading ? '...' : 'Mark ✓'}
                  </button>
                </form>
              </div>
            )}

            {error && (
              <div style={{
                marginTop: 16,
                padding: '12px 16px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 'var(--radius-xl)',
                color: 'var(--color-error)',
                fontSize: 'var(--text-sm)',
              }}>
                ⚠️ {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
