import React from 'react'

/**
 * QRDisplay — shows generated QR image and token number
 */
export function QRDisplay({ qrImageUrl, tokenNumber, orderId }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      padding: 24,
      background: 'var(--color-surface-2)',
      borderRadius: 'var(--radius-2xl)',
      border: '1px solid var(--color-border)',
    }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>
        Show this QR at the counter
      </p>

      {/* QR Image */}
      <div style={{
        background: '#fff',
        borderRadius: 'var(--radius-xl)',
        padding: 12,
        boxShadow: 'var(--shadow-md)',
      }}>
        {qrImageUrl ? (
          <img
            src={qrImageUrl}
            alt={`QR code for order ${orderId}`}
            style={{ width: 180, height: 180, display: 'block' }}
          />
        ) : (
          <div style={{
            width: 180, height: 180,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#666', fontSize: 14,
          }}>
            Loading QR...
          </div>
        )}
      </div>

      {/* Token Number */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginBottom: 4 }}>
          TOKEN NUMBER
        </p>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-4xl)',
          fontWeight: 900,
          color: 'var(--color-accent)',
          lineHeight: 1,
        }}>
          T-{String(tokenNumber).padStart(2, '0')}
        </p>
      </div>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', textAlign: 'center' }}>
        Order #{orderId} · Screenshot won't work — QR is unique to you
      </p>
    </div>
  )
}
