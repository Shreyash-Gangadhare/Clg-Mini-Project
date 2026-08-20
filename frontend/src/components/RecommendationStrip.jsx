import React from 'react'
import { motion } from 'framer-motion'
import { useCartStore } from '../store/cartStore'
import { VegDot } from './VegDot'

/**
 * RecommendationStrip
 *
 * A compact horizontal strip of recommended menu items.
 * Reuses the existing design token system — no new colours or fonts.
 *
 * Props:
 *   items      {Array}   — list of item objects from the recommendations API
 *   label      {string}  — section label (e.g. "Also ordered" / "Add to your order")
 *   source     {string}  — 'cosine_similarity' | 'fallback_category' | 'fallback_popularity'
 *   loading    {bool}    — show skeleton state
 *   accent     {string}  — optional accent colour override
 */
export function RecommendationStrip({
  items = [],
  label = 'Also ordered',
  source,
  loading = false,
  accent = 'var(--color-accent)',
}) {
  const { addItem, removeItem, items: cartItems } = useCartStore()

  const getQty = (itemId) =>
    cartItems.find(ci => ci.menuItem.id === itemId)?.quantity || 0

  // Show nothing if not loading and no items (graceful empty state)
  if (!loading && items.length === 0) return null

  const isFallback = source && source !== 'cosine_similarity'

  return (
    <section aria-label={label} style={{ marginTop: 8 }}>
      {/* Label row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
        padding: '0 2px',
      }}>
        <span style={{ fontSize: 11 }}>
          {isFallback ? '🔥' : '🤝'}
        </span>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
        }}>
          {isFallback ? 'Popular picks' : label}
        </span>
      </div>

      {/* Horizontal scroll strip */}
      <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        paddingBottom: 4,
      }}>
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{
                  flexShrink: 0,
                  width: 140,
                  height: 64,
                  borderRadius: 'var(--radius-lg)',
                }}
              />
            ))
          : items.map((item, idx) => {
              const qty = getQty(item.id)
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  style={{
                    flexShrink: 0,
                    width: 148,
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  {/* Top row: veg dot + name */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                    <VegDot isVeg={item.veg_flag} size={10} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: 1.3,
                      color: 'var(--color-text)',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {item.name}
                    </span>
                  </div>

                  {/* Bottom row: price + stepper */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 2,
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 900,
                      fontSize: 12,
                      color: accent,
                    }}>
                      ₹{Number(item.price).toLocaleString('en-IN')}
                    </span>

                    {qty === 0 ? (
                      <motion.button
                        id={`rec-add-${item.id}`}
                        whileTap={{ scale: 0.88 }}
                        onClick={() => addItem(item)}
                        aria-label={`Add ${item.name}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '4px 9px',
                          borderRadius: 'var(--radius-full)',
                          background: accent,
                          color: '#fff',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: 11,
                          cursor: 'pointer',
                          boxShadow: `0 2px 8px ${accent}40`,
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ fontWeight: 900, fontSize: 13 }}>+</span>
                        Add
                      </motion.button>
                    ) : (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        border: `1.5px solid ${accent}`,
                        borderRadius: 'var(--radius-full)',
                        overflow: 'hidden',
                      }}>
                        <button
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.name}`}
                          style={{
                            width: 24, height: 24,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'transparent', border: 'none',
                            color: accent, fontWeight: 900, fontSize: 15, cursor: 'pointer',
                          }}
                        >−</button>
                        <span style={{
                          minWidth: 20, textAlign: 'center',
                          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11,
                          color: accent,
                        }}>{qty}</span>
                        <button
                          onClick={() => addItem(item)}
                          aria-label={`Add another ${item.name}`}
                          style={{
                            width: 24, height: 24,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: accent, border: 'none',
                            color: '#fff', fontWeight: 900, fontSize: 15, cursor: 'pointer',
                          }}
                        >+</button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })
        }
      </div>
    </section>
  )
}
