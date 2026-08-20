import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'

/**
 * ConfettiBurst — celebratory confetti on payment success.
 * Renders N colored squares that fly outward.
 */
export function ConfettiBurst({ trigger, onComplete }) {
  const [pieces, setPieces] = useState([])

  useEffect(() => {
    if (!trigger) return
    const colors = [
      '#FF6B35', '#FFD700', '#00A651', '#FF4444', '#4ECDC4',
      '#45B7D1', '#FFA07A', '#98FB98', '#DDA0DD', '#87CEEB',
    ]
    const newPieces = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      x: (Math.random() - 0.5) * 300,
      y: -(Math.random() * 200 + 50),
      rotate: Math.random() * 720,
      delay: Math.random() * 0.3,
    }))
    setPieces(newPieces)
    const timer = setTimeout(() => {
      setPieces([])
      onComplete?.()
    }, 1200)
    return () => clearTimeout(timer)
  }, [trigger])

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        pointerEvents: 'none',
        zIndex: 999,
      }}
    >
      <AnimatePresence>
        {pieces.map(p => (
          <motion.div
            key={p.id}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
            animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.5 }}
            transition={{ duration: 0.9, delay: p.delay, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: 8,
              height: 8,
              borderRadius: 2,
              backgroundColor: p.color,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
