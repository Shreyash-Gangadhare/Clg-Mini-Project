import React, { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'

// Map category key to its accent color token
const CAT_COLORS = {
  all:           '#FF6B35',
  breakfast:     '#F59E0B',
  snacks:        '#10B981',
  meals:         '#FF6B35',
  beverages:     '#3B82F6',
  today_special: '#A855F7',
}

const CATEGORIES = [
  { key: 'all',           label: 'All',             icon: '🍽️', count: null },
  { key: 'breakfast',     label: 'Breakfast',       icon: '🌅', count: null },
  { key: 'snacks',        label: 'Snacks',          icon: '🥟', count: null },
  { key: 'meals',         label: 'Meals',           icon: '🍛', count: null },
  { key: 'beverages',     label: 'Drinks',          icon: '🥤', count: null },
  { key: 'today_special', label: "Chef's Pick",     icon: '⭐', count: null },
]

export function CategoryChipBar({ active, onChange, counts = {} }) {
  const scrollRef = useRef(null)
  const activeRef = useRef(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  // Scroll active chip into view and measure for indicator
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current
      const el = activeRef.current
      const containerRect = container.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()

      // Update sliding indicator position relative to container scroll
      const scrollLeft = container.scrollLeft
      setIndicatorStyle({
        left: elRect.left - containerRect.left + scrollLeft,
        width: elRect.width,
      })

      // Smooth scroll the chip into view with padding
      const targetScroll = el.offsetLeft - container.offsetLeft - 20
      container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' })
    }
  }, [active])

  return (
    <div
      style={{
        position: 'relative',
      }}
      role="tablist"
      aria-label="Menu categories"
    >
      {/* Horizontal scroll container */}
      <div
        ref={scrollRef}
        style={{
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: 4,
        }}
      >
        <style>{`.cat-scroll::-webkit-scrollbar { display: none; }`}</style>
        <div
          className="cat-scroll"
          style={{
            display: 'flex',
            gap: 8,
            padding: '4px 16px 8px',
            width: 'max-content',
            position: 'relative',
          }}
        >
          {CATEGORIES.map(cat => {
            const isActive = active === cat.key
            const accent = CAT_COLORS[cat.key]
            const count = counts[cat.key]

            return (
              <button
                key={cat.key}
                ref={isActive ? activeRef : null}
                onClick={() => onChange(cat.key)}
                role="tab"
                aria-selected={isActive}
                aria-label={`${cat.label} category`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-full)',
                  border: isActive
                    ? `2px solid ${accent}`
                    : '2px solid rgba(255,248,240,0.08)',
                  background: isActive
                    ? `${accent}22`
                    : 'rgba(255,248,240,0.04)',
                  color: isActive ? accent : 'var(--color-text-muted)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                  letterSpacing: isActive ? '-0.01em' : '0',
                  transform: isActive ? 'scale(1.04)' : 'scale(1)',
                  boxShadow: isActive ? `0 2px 12px ${accent}33` : 'none',
                }}
              >
                <span style={{ fontSize: 15 }}>{cat.icon}</span>
                <span>{cat.label}</span>
                {count != null && (
                  <span style={{
                    background: isActive ? accent : 'rgba(255,248,240,0.12)',
                    color: isActive ? '#fff' : 'var(--color-text-muted)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '1px 7px',
                    minWidth: 20,
                    textAlign: 'center',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
