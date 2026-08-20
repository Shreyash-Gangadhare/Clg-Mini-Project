import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * NumberFlip — animates digit changes with a flip/roll effect.
 * Used for running cart total.
 */
export function NumberFlip({ value, prefix = '₹', style }) {
  const [displayValue, setDisplayValue] = useState(value)
  const [flipping, setFlipping] = useState(false)
  const prevRef = useRef(value)

  useEffect(() => {
    if (value !== prevRef.current) {
      setFlipping(true)
      const timer = setTimeout(() => {
        setDisplayValue(value)
        setFlipping(false)
      }, 150)
      prevRef.current = value
      return () => clearTimeout(timer)
    }
  }, [value])

  // Format Indian number style
  const formatted = Number(displayValue).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return (
    <motion.span
      animate={flipping ? { y: [-6, 0], opacity: [0.5, 1] } : {}}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-display)',
        fontVariantNumeric: 'tabular-nums',
        ...style,
      }}
    >
      {prefix}{formatted}
    </motion.span>
  )
}
