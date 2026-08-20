import { useState, useEffect } from 'react'

/**
 * useSlotCountdown — live countdown to a slot's cutoff time.
 * Returns { secondsLeft, expired, label }
 */
export function useSlotCountdown(cutoffTime) {
  const getSecondsLeft = () => {
    if (!cutoffTime) return 0
    return Math.max(0, Math.floor((new Date(cutoffTime) - Date.now()) / 1000))
  }

  const [secondsLeft, setSecondsLeft] = useState(getSecondsLeft)

  useEffect(() => {
    if (!cutoffTime) return
    const tick = setInterval(() => {
      const left = getSecondsLeft()
      setSecondsLeft(left)
      if (left === 0) clearInterval(tick)
    }, 1000)
    return () => clearInterval(tick)
  }, [cutoffTime])

  const expired = secondsLeft === 0
  const h = Math.floor(secondsLeft / 3600)
  const m = Math.floor((secondsLeft % 3600) / 60)
  const s = secondsLeft % 60

  let label
  if (expired) {
    label = 'Closed'
  } else if (h > 0) {
    label = `${h}h ${String(m).padStart(2, '0')}m`
  } else if (m > 0) {
    label = `${m}m ${String(s).padStart(2, '0')}s`
  } else {
    label = `${s}s`
  }

  return { secondsLeft, expired, label }
}
