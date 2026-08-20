import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getMenu, getSlots, getSlotCapacities } from '../../api/client'
import { useCartStore } from '../../store/cartStore'
import { VegDot } from '../../components/VegDot'
import { CategoryChipBar } from '../../components/CategoryChipBar'
import { CapacityBadge } from '../../components/CapacityBadge'
import { filterMenuByCategory } from '../../api/mock/fixtures'

// ── Category config ─────────────────────────────────────────
const CAT_META = {
  all:           { label: 'All Items',     icon: '🍽️', color: '#FF6B35', bg: '#FF6B3514' },
  breakfast:     { label: 'Breakfast',     icon: '🌅', color: '#F59E0B', bg: '#F59E0B14' },
  snacks:        { label: 'Snacks',        icon: '🥟', color: '#10B981', bg: '#10B98114' },
  meals:         { label: 'Meals',         icon: '🍛', color: '#FF6B35', bg: '#FF6B3514' },
  beverages:     { label: 'Drinks',        icon: '🥤', color: '#3B82F6', bg: '#3B82F614' },
  today_special: { label: "Chef's Pick",   icon: '⭐', color: '#A855F7', bg: '#A855F714' },
}

// ── Emoji → gradient palette ─────────────────────────────────
const FOOD_GRADIENTS = {
  '☕': ['#2C1A0E', '#4A2C0A'],
  '🌮': ['#1A280A', '#2D4414'],
  '🍚': ['#0E1A28', '#142236'],
  '🍛': ['#281A0A', '#4A2C0A'],
  '🥪': ['#1A1A0A', '#2D2D14'],
  '🥟': ['#1A0E28', '#2C1A40'],
  '🍜': ['#1A280A', '#0A2814'],
  '🍲': ['#280A0A', '#401414'],
  '🥤': ['#0A1A28', '#0E2840'],
  '🧀': ['#28200A', '#4A3C0A'],
  '🍱': ['#0A280A', '#144014'],
  '🥛': ['#1A1A28', '#28283C'],
  '🍞': ['#28180A', '#402C12'],
  '🫓': ['#281A0A', '#402810'],
  '🍩': ['#28100A', '#401810'],
  '🥞': ['#28200A', '#3C3010'],
  '🍳': ['#1A200A', '#283014'],
  '🥡': ['#0A1A20', '#102830'],
  '🥘': ['#200A0A', '#301010'],
  '💧': ['#0A1A28', '#0E2840'],
  default: ['#1E1A14', '#2A2018'],
}

function getGradient(emoji) {
  const [c1, c2] = FOOD_GRADIENTS[emoji] || FOOD_GRADIENTS.default
  return `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`
}

// ── Quantity stepper component ───────────────────────────────
function QtyControl({ item, accent }) {
  const { items: cartItems, addItem, removeItem } = useCartStore()
  const cartEntry = cartItems.find(ci => ci.menuItem.id === item.id)
  const qty = cartEntry?.quantity || 0

  if (qty === 0) {
    return (
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={(e) => { e.stopPropagation(); addItem(item) }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '8px 14px',
          borderRadius: 'var(--radius-full)',
          background: accent || 'var(--color-accent)',
          color: '#fff',
          border: 'none',
          fontWeight: 700,
          fontSize: 'var(--text-sm)',
          cursor: 'pointer',
          letterSpacing: '-0.01em',
          boxShadow: `0 4px 16px ${accent || '#FF6B35'}40`,
          flexShrink: 0,
        }}
        aria-label={`Add ${item.name} to cart`}
      >
        <span style={{ fontSize: 14, fontWeight: 900 }}>+</span>
        <span>Add</span>
      </motion.button>
    )
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0,
        borderRadius: 'var(--radius-full)',
        border: `2px solid ${accent || 'var(--color-accent)'}`,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={(e) => { e.stopPropagation(); removeItem(item.id) }}
        style={{
          width: 32, height: 34,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent',
          color: accent || 'var(--color-accent)',
          fontWeight: 900, fontSize: 18,
          border: 'none', cursor: 'pointer',
        }}
        aria-label={`Remove one ${item.name}`}
      >−</motion.button>

      <motion.span
        key={qty}
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          minWidth: 28,
          textAlign: 'center',
          fontWeight: 800,
          fontSize: 'var(--text-sm)',
          color: accent || 'var(--color-accent)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {qty}
      </motion.span>

      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={(e) => { e.stopPropagation(); addItem(item) }}
        style={{
          width: 32, height: 34,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: accent || 'var(--color-accent)',
          color: '#fff',
          fontWeight: 900, fontSize: 18,
          border: 'none', cursor: 'pointer',
        }}
        aria-label={`Add another ${item.name}`}
      >+</motion.button>
    </motion.div>
  )
}

// ── Horizontal menu card (Zomato-style) ─────────────────────
function MenuCard({ item, index, slotCapacity, slotSelected, categoryColor }) {
  const cap = slotCapacity?.find(c => c.menu_item_id === item.id)
  const remaining = cap ? (cap.max_units - cap.units_booked) : null
  const isSoldOut = slotSelected && remaining === 0
  const isUnavailable = !item.is_available
  const accent = categoryColor || 'var(--color-accent)'

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.35, ease: 'easeOut' }}
      style={{
        display: 'flex',
        gap: 0,
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid rgba(255,248,240,0.07)',
        overflow: 'hidden',
        opacity: (isSoldOut || isUnavailable) ? 0.6 : 1,
        transition: 'box-shadow 0.2s, transform 0.2s',
        boxShadow: 'var(--shadow-card)',
      }}
      whileHover={!(isSoldOut || isUnavailable) ? {
        boxShadow: 'var(--shadow-card-hover)',
        y: -2,
      } : {}}
      itemScope
      itemType="https://schema.org/MenuItem"
    >
      {/* Food image — left column */}
      <div style={{
        position: 'relative',
        width: 110,
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          minHeight: 110,
          background: getGradient(item.emoji),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 44,
          transition: 'transform 0.35s ease',
        }}>
          {item.emoji || '🍽️'}
        </div>

        {/* Veg/NonVeg badge — bottom-left of image */}
        <div style={{ position: 'absolute', bottom: 6, left: 6 }}>
          <VegDot isVeg={item.veg_flag} size={16} />
        </div>

        {/* Prep badge — bottom-right of image */}
        {item.prep_time_minutes > 0 && (
          <div style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px 5px',
            fontSize: 10,
            fontWeight: 600,
            color: 'rgba(255,248,240,0.8)',
          }}>
            🕒 {item.prep_time_minutes}m
          </div>
        )}

        {/* Sold-out overlay */}
        {isSoldOut && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              color: '#fff', fontFamily: 'var(--font-display)',
              fontWeight: 800, fontSize: 11, textAlign: 'center',
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              Gone before<br />you blinked
            </span>
          </div>
        )}
      </div>

      {/* Content — right column */}
      <div style={{
        flex: 1,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 6,
        minWidth: 0,
      }}>
        {/* Top: name + special badge */}
        <div>
          {item.is_today_special && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: '#A855F715',
              border: '1px solid #A855F740',
              borderRadius: 'var(--radius-full)',
              padding: '1px 8px',
              fontSize: 10,
              fontWeight: 700,
              color: '#A855F7',
              marginBottom: 4,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
            }}>
              ⭐ Chef's Pick
            </div>
          )}
          <h3
            itemProp="name"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 'var(--text-sm)',
              lineHeight: 1.25,
              margin: 0,
              color: 'var(--color-text)',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {item.name}
          </h3>
          <p style={{
            fontSize: 11,
            color: 'var(--color-text-faint)',
            lineHeight: 1.4,
            marginTop: 3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {item.description}
          </p>
        </div>

        {/* Capacity warning if slot selected */}
        {slotSelected && remaining !== null && remaining > 0 && remaining <= 5 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, fontWeight: 600,
            color: remaining <= 2 ? '#EF4444' : '#F59E0B',
          }}>
            🔥 Only {remaining} left!
          </div>
        )}

        {/* Bottom: price + add button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            itemProp="offers"
            itemScope
            itemType="https://schema.org/Offer"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 'var(--text-lg)',
              color: 'var(--color-accent)',
              letterSpacing: '-0.02em',
            }}
          >
            <meta itemProp="priceCurrency" content="INR" />
            <meta itemProp="price" content={item.price} />
            ₹{Number(item.price).toLocaleString('en-IN')}
          </span>

          {isUnavailable ? (
            <span style={{ fontSize: 11, color: 'var(--color-text-faint)', fontStyle: 'italic' }}>
              Not available
            </span>
          ) : (
            <QtyControl item={item} accent={accent} />
          )}
        </div>
      </div>
    </motion.article>
  )
}

// ── Specials Feature Strip ───────────────────────────────────
function SpecialsBanner({ specials, slotCapacities, selectedSlot }) {
  if (!specials.length) return null

  return (
    <section
      aria-label="Chef's picks"
      style={{ marginBottom: 28 }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 14, padding: '0 16px',
      }}>
        <div style={{
          width: 3, height: 22,
          background: 'linear-gradient(180deg, #A855F7, #FF6B35)',
          borderRadius: 2, flexShrink: 0,
        }} />
        <h2 style={{
          fontFamily: 'var(--font-hero)',
          fontWeight: 800,
          fontSize: 'var(--text-xl)',
          letterSpacing: '-0.02em',
          margin: 0,
        }}>
          Chef's Pick Today
        </h2>
        <span style={{
          background: '#A855F720',
          border: '1px solid #A855F740',
          borderRadius: 'var(--radius-full)',
          padding: '2px 10px',
          fontSize: 11,
          fontWeight: 700,
          color: '#A855F7',
        }}>
          {specials.length} dishes
        </span>
      </div>

      {/* Horizontal scroll strip */}
      <div style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
        <div style={{
          display: 'flex', gap: 12,
          padding: '4px 16px 8px',
          width: 'max-content',
        }}>
          {specials.map((item, i) => {
            const cap = selectedSlot && slotCapacities[selectedSlot.id]
              ? slotCapacities[selectedSlot.id]?.find(c => c.menu_item_id === item.id)
              : null
            const remaining = cap ? cap.max_units - cap.units_booked : null

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                style={{
                  width: 200,
                  flexShrink: 0,
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid rgba(168,85,247,0.2)',
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(168,85,247,0.1)',
                }}
                itemScope
                itemType="https://schema.org/MenuItem"
              >
                {/* Image area */}
                <div style={{
                  height: 110,
                  background: getGradient(item.emoji),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 50,
                  position: 'relative',
                }}>
                  {item.emoji || '🍽️'}
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    background: '#A855F7',
                    borderRadius: 'var(--radius-full)',
                    padding: '2px 8px',
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#fff',
                  }}>
                    ⭐ Special
                  </div>
                </div>

                <div style={{ padding: '10px 12px 12px' }}>
                  <h3 itemProp="name" style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: 'var(--text-sm)',
                    lineHeight: 1.25,
                    margin: '0 0 4px',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {item.name}
                  </h3>

                  {remaining !== null && remaining > 0 && remaining <= 5 && (
                    <div style={{ fontSize: 10, color: '#EF4444', fontWeight: 600, marginBottom: 6 }}>
                      🔥 Only {remaining} left
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 900,
                      color: 'var(--color-accent)',
                      fontSize: 'var(--text-base)',
                    }}>
                      ₹{Number(item.price).toLocaleString('en-IN')}
                    </span>
                    <QtyControl item={item} accent="#A855F7" />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── Search bar ───────────────────────────────────────────────
function SearchBar({ value, onChange }) {
  return (
    <div style={{
      position: 'relative',
      margin: '0 16px 16px',
    }}>
      <span style={{
        position: 'absolute',
        left: 14,
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: 16,
        pointerEvents: 'none',
      }}>🔍</span>
      <input
        type="search"
        placeholder="Search bhaji, dosa, chai…"
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label="Search menu items"
        style={{
          width: '100%',
          padding: '11px 14px 11px 40px',
          borderRadius: 'var(--radius-xl)',
          border: '1.5px solid rgba(255,248,240,0.1)',
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,248,240,0.1)'}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-muted)',
            fontSize: 18,
            cursor: 'pointer',
            lineHeight: 1,
          }}
          aria-label="Clear search"
        >×</button>
      )}
    </div>
  )
}

// ── Skeleton loader (horizontal card shape) ──────────────────
function HorizontalSkeleton() {
  return (
    <div style={{
      display: 'flex',
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      height: 110,
      border: '1px solid rgba(255,248,240,0.05)',
    }}>
      <div className="skeleton" style={{ width: 110, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton" style={{ height: 14, width: '65%', borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 10, width: '90%', borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 10, width: '75%', borderRadius: 6 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <div className="skeleton" style={{ height: 18, width: 50, borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 32, width: 70, borderRadius: 999 }} />
        </div>
      </div>
    </div>
  )
}

// ── Section header ───────────────────────────────────────────
function SectionHeader({ category, itemCount, catMeta }) {
  const meta = catMeta || CAT_META[category] || CAT_META.all

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '4px 16px 12px',
    }}>
      <div style={{
        width: 3, height: 20,
        background: meta.color,
        borderRadius: 2, flexShrink: 0,
      }} />
      <h2 style={{
        fontFamily: 'var(--font-hero)',
        fontWeight: 800,
        fontSize: 'var(--text-xl)',
        letterSpacing: '-0.02em',
        margin: 0,
      }}>
        {meta.icon} {meta.label}
      </h2>
      <span style={{
        marginLeft: 'auto',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--color-text-faint)',
      }}>
        {itemCount} items
      </span>
    </div>
  )
}

// ── Main MenuPage ────────────────────────────────────────────
export default function MenuPage() {
  const [category, setCategory] = useState('all')
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [slotCapacities, setSlotCapacities] = useState({})
  const selectedSlot = useCartStore(s => s.selectedSlot)

  // Load all items once, filter client-side for instant tab switching
  useEffect(() => {
    setLoading(true)
    getMenu(null)
      .then(r => setAllItems(r.data))
      .finally(() => setLoading(false))
  }, [])

  // Prefetch slot capacities
  useEffect(() => {
    getSlots().then(r => {
      const now = Date.now()
      const openSlots = r.data.filter(s => new Date(s.cutoff_time) > now).slice(0, 3)
      openSlots.forEach(slot => {
        getSlotCapacities(slot.id)
          .then(cap => setSlotCapacities(prev => ({ ...prev, [slot.id]: cap.data })))
          .catch(() => {})
      })
    }).catch(() => {})
  }, [])

  // Client-side filter: category + search
  const filteredItems = (() => {
    let items = filterMenuByCategory(allItems, category)
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q)
      )
    }
    return items
  })()

  // Category counts for chip badges
  const counts = {
    all:           allItems.length,
    breakfast:     allItems.filter(i => i.ui_category === 'breakfast').length,
    snacks:        allItems.filter(i => i.ui_category === 'snacks').length,
    meals:         allItems.filter(i => i.ui_category === 'meals').length,
    beverages:     allItems.filter(i => i.ui_category === 'beverages').length,
    today_special: allItems.filter(i => i.is_today_special).length,
  }

  const specials = allItems.filter(i => i.is_today_special)
  const currentMeta = CAT_META[category] || CAT_META.all
  const slotCapForSelected = selectedSlot ? slotCapacities[selectedSlot.id] : null

  return (
    <div className="page">
      {/* SEO metadata */}
      <meta name="description" content="Order food online from SIES GST Canteen, Nerul. Browse 70+ items — dosas, sandwiches, Chinese, Indian meals, snacks and beverages. Skip the queue, pre-order your meal." />

      <main
        itemScope
        itemType="https://schema.org/FoodEstablishment"
        style={{ paddingBottom: 100 }}
      >
        <meta itemProp="name" content="SIES GST Canteen" />
        <meta itemProp="servesCuisine" content="Indian, South Indian, Indo-Chinese" />

        {/* ── Specials strip (only on 'all' or 'today_special') ── */}
        <AnimatePresence mode="wait">
          {(category === 'all' || category === 'today_special') && !loading && specials.length > 0 && (
            <motion.div
              key="specials"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SpecialsBanner
                specials={specials}
                slotCapacities={slotCapacities}
                selectedSlot={selectedSlot}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Search ─────────────────────────────────────────── */}
        <SearchBar value={search} onChange={setSearch} />

        {/* ── Category chips ──────────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <CategoryChipBar
            active={category}
            onChange={(cat) => { setCategory(cat); setSearch('') }}
            counts={counts}
          />
        </div>

        {/* ── Section header ──────────────────────────────────── */}
        {!loading && (
          <SectionHeader
            category={category}
            itemCount={filteredItems.length}
            catMeta={currentMeta}
          />
        )}

        {/* ── Items list ──────────────────────────────────────── */}
        <div
          role="list"
          aria-label="Menu items"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: '0 16px',
          }}
        >
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <HorizontalSkeleton key={i} />)
          ) : filteredItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: 'var(--color-text-muted)',
              }}
            >
              <div style={{ fontSize: 52, marginBottom: 16 }}>
                {search ? '🔍' : currentMeta.icon}
              </div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)', marginBottom: 6 }}>
                {search
                  ? `Nothing matches "${search}"`
                  : `The chef's taking a break here.`}
              </p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)' }}>
                {search ? 'Try a different search term.' : 'Try another tab.'}
              </p>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    marginTop: 16,
                    padding: '8px 20px',
                    borderRadius: 'var(--radius-full)',
                    border: '1.5px solid var(--color-accent)',
                    background: 'transparent',
                    color: 'var(--color-accent)',
                    fontWeight: 600,
                    fontSize: 'var(--text-sm)',
                    cursor: 'pointer',
                  }}
                >
                  Clear search
                </button>
              )}
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, i) => (
                <div key={item.id} role="listitem">
                  <MenuCard
                    item={item}
                    index={i}
                    slotCapacity={slotCapForSelected}
                    slotSelected={!!selectedSlot}
                    categoryColor={currentMeta.color}
                  />
                </div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  )
}
