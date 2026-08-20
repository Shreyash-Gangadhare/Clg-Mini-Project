import React, { useState, useEffect } from 'react'
import { getSlots, createSlot, bulkGenerateSlots, getMenu, getSlotCapacities, setCapacity, updateCapacity } from '../../api/client'

export default function SlotManagementPage() {
  const [slots, setSlots] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [capacities, setCapacities] = useState([])
  const [capLoading, setCapLoading] = useState(false)
  const [message, setMessage] = useState('')

  // New slot form
  const [newSlot, setNewSlot] = useState({ date: '', start_time: '', end_time: '' })

  const loadSlots = () => {
    setLoading(true)
    getSlots().then(r => setSlots(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadSlots()
    getMenu().then(r => setMenuItems(r.data))
  }, [])

  const handleGenerateToday = async () => {
    setGenerating(true)
    await bulkGenerateSlots()
    loadSlots()
    setGenerating(false)
    setMessage('Slots generated for today.')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleCreateSlot = async (e) => {
    e.preventDefault()
    await createSlot({
      ...newSlot,
      cutoff_time: new Date(
        `${newSlot.date}T${newSlot.start_time}`
      ).toISOString(),
    })
    loadSlots()
    setNewSlot({ date: '', start_time: '', end_time: '' })
    setMessage('Slot created.')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleSelectSlot = async (slot) => {
    setSelectedSlot(slot)
    setCapLoading(true)
    const res = await getSlotCapacities(slot.id)
    setCapacities(res.data)
    setCapLoading(false)
  }

  const handleCapChange = async (cap, newMax) => {
    if (!cap || !newMax) return
    await updateCapacity(selectedSlot.id, cap.id, { max_units: Number(newMax) })
    const res = await getSlotCapacities(selectedSlot.id)
    setCapacities(res.data)
  }

  const handleAddCap = async (menuItemId, maxUnits) => {
    await setCapacity(selectedSlot.id, { menu_item_id: menuItemId, max_units: maxUnits })
    const res = await getSlotCapacities(selectedSlot.id)
    setCapacities(res.data)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="admin-layout" style={{ minHeight: '100vh', padding: '80px 24px 40px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-2xl)' }}>
            ⏰ Slot & Capacity Management
          </h1>
          <button
            className="btn btn-primary"
            onClick={handleGenerateToday}
            disabled={generating}
          >
            {generating ? 'Generating...' : '⚡ Generate Today\'s Slots'}
          </button>
        </div>

        {message && (
          <div style={{ padding: '10px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid var(--color-success)', borderRadius: 8, color: 'var(--color-success)', marginBottom: 16, fontSize: 'var(--text-sm)' }}>
            ✓ {message}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24 }}>
          {/* Slots list */}
          <div>
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-border)',
              overflow: 'hidden',
              marginBottom: 16,
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                <h3 style={{ fontWeight: 700, fontSize: 'var(--text-base)' }}>Today's Slots</h3>
              </div>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {loading ? (
                  <p style={{ padding: 16, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Loading...</p>
                ) : slots.filter(s => s.date === today).map(slot => {
                  const isPast = new Date(slot.cutoff_time) < Date.now()
                  return (
                    <button
                      key={slot.id}
                      onClick={() => handleSelectSlot(slot)}
                      style={{
                        display: 'flex',
                        width: '100%',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 16px',
                        background: selectedSlot?.id === slot.id ? 'var(--color-accent-muted)' : 'transparent',
                        border: 'none',
                        borderBottom: '1px solid var(--color-border)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: 'var(--color-text)',
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                        {slot.start_time} – {slot.end_time}
                      </span>
                      <span style={{ fontSize: 11, color: isPast ? 'var(--color-text-faint)' : 'var(--color-success)', fontWeight: 600 }}>
                        {isPast ? 'Past' : '● Open'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Create slot form */}
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-border)',
              padding: 16,
            }}>
              <h3 style={{ fontWeight: 700, fontSize: 'var(--text-sm)', marginBottom: 12 }}>Add Custom Slot</h3>
              <form onSubmit={handleCreateSlot} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label className="label" style={{ fontSize: 11 }}>Date</label>
                  <input className="input" type="date" value={newSlot.date} onChange={e => setNewSlot(f => ({ ...f, date: e.target.value }))} required style={{ fontSize: 'var(--text-sm)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label className="label" style={{ fontSize: 11 }}>Start</label>
                    <input className="input" type="time" value={newSlot.start_time} onChange={e => setNewSlot(f => ({ ...f, start_time: e.target.value }))} required style={{ fontSize: 'var(--text-sm)' }} />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: 11 }}>End</label>
                    <input className="input" type="time" value={newSlot.end_time} onChange={e => setNewSlot(f => ({ ...f, end_time: e.target.value }))} required style={{ fontSize: 'var(--text-sm)' }} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-sm">Add Slot</button>
              </form>
            </div>
          </div>

          {/* Capacity editor */}
          <div>
            {!selectedSlot ? (
              <div style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-border)',
                padding: 40,
                textAlign: 'center',
                color: 'var(--color-text-muted)',
              }}>
                <p style={{ fontSize: 'var(--text-sm)' }}>← Select a slot to edit capacity</p>
              </div>
            ) : (
              <div style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontWeight: 700, fontSize: 'var(--text-base)' }}>
                    Capacity: {selectedSlot.start_time} – {selectedSlot.end_time}
                  </h3>
                </div>
                {capLoading ? (
                  <p style={{ padding: 16, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Loading...</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-surface-2)' }}>
                        {['Item', 'Max Units', 'Booked', 'Remaining'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12 }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {menuItems.map(item => {
                        const cap = capacities.find(c => c.menu_item_id === item.id)
                        const remaining = cap ? cap.max_units - cap.units_booked : '—'
                        return (
                          <tr key={item.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 500 }}>{item.name}</td>
                            <td style={{ padding: '10px 14px' }}>
                              {cap ? (
                                <input
                                  type="number"
                                  defaultValue={cap.max_units}
                                  min="0"
                                  max="999"
                                  style={{
                                    width: 70,
                                    padding: '4px 8px',
                                    background: 'var(--color-surface-2)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 6,
                                    color: 'var(--color-text)',
                                    fontSize: 'var(--text-sm)',
                                  }}
                                  onBlur={e => handleCapChange(cap, e.target.value)}
                                />
                              ) : (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleAddCap(item.id, 20)}
                                  style={{ fontSize: 11, padding: '4px 10px' }}
                                >
                                  Set Cap
                                </button>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>
                              {cap?.units_booked ?? '—'}
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: remaining === 0 ? 'var(--color-error)' : remaining <= 3 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                              {remaining}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
