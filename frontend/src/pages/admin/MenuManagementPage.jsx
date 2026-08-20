import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getMenu, createMenuItem, updateMenuItem, deleteMenuItem } from '../../api/client'

const EMPTY_FORM = {
  name: '', description: '', price: '', category: 'ready_stock',
  prep_time_minutes: 0, veg_flag: true, image_url: '', is_available: true,
}

export default function MenuManagementPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // item being edited
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const loadItems = () => {
    setLoading(true)
    getMenu().then(r => setItems(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { loadItems() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      name: item.name, description: item.description,
      price: item.price, category: item.category,
      prep_time_minutes: item.prep_time_minutes,
      veg_flag: item.veg_flag, image_url: item.image_url || '',
      is_available: item.is_available,
    })
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await updateMenuItem(editing.id, form)
        setMessage('Item updated.')
      } else {
        await createMenuItem(form)
        setMessage('Item created.')
      }
      setShowForm(false)
      loadItems()
    } catch (err) {
      setMessage('Error saving item.')
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return
    await deleteMenuItem(id)
    loadItems()
  }

  const handleToggle = async (item) => {
    await updateMenuItem(item.id, { is_available: !item.is_available })
    loadItems()
  }

  const set = (key) => (e) => setForm(f => ({
    ...f,
    [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
  }))

  return (
    <div className="admin-layout" style={{ minHeight: '100vh', padding: '80px 24px 40px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-2xl)' }}>
            🍽️ Menu Management
          </h1>
          <button className="btn btn-primary" onClick={openCreate}>+ Add Item</button>
        </div>

        {message && (
          <div style={{
            padding: '10px 16px', background: 'rgba(34,197,94,0.1)',
            border: '1px solid var(--color-success)', borderRadius: 'var(--radius-md)',
            color: 'var(--color-success)', marginBottom: 16, fontSize: 'var(--text-sm)',
          }}>
            ✓ {message}
          </div>
        )}

        {/* Inline form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-border)',
              padding: 24,
              marginBottom: 24,
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16 }}>
              {editing ? `Edit: ${editing.name}` : 'New Menu Item'}
            </h3>
            <form id="menu-item-form" onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label className="label">Name</label>
                  <input className="input" value={form.name} onChange={set('name')} required placeholder="e.g. Vada Pav" />
                </div>
                <div>
                  <label className="label">Price (₹)</label>
                  <input className="input" type="number" value={form.price} onChange={set('price')} required min="0" step="0.01" />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={form.category} onChange={set('category')}>
                    <option value="ready_stock">Ready Stock</option>
                    <option value="made_to_order">Made to Order</option>
                  </select>
                </div>
                {form.category === 'made_to_order' && (
                  <div>
                    <label className="label">Prep Time (minutes)</label>
                    <input className="input" type="number" value={form.prep_time_minutes} onChange={set('prep_time_minutes')} min="1" max="60" />
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Description</label>
                <textarea className="input" value={form.description} onChange={set('description')} rows={2} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                  <input type="checkbox" checked={form.veg_flag} onChange={set('veg_flag')} />
                  Vegetarian
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                  <input type="checkbox" checked={form.is_available} onChange={set('is_available')} />
                  Available
                </label>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Item'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Items table */}
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                {['Name', 'Category', 'Price', 'Veg', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} style={{ padding: '14px 16px' }}>
                        <div className="skeleton" style={{ height: 16 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{item.name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>
                    {item.category === 'ready_stock' ? '⚡ Ready' : `🧑‍🍳 MTO (${item.prep_time_minutes}m)`}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-accent)' }}>
                    ₹{Number(item.price).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ color: item.veg_flag ? 'var(--color-veg)' : 'var(--color-nonveg)', fontWeight: 700, fontSize: 11 }}>
                      {item.veg_flag ? '● VEG' : '● NON-VEG'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => handleToggle(item)}
                      style={{
                        background: item.is_available ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        border: 'none', borderRadius: 6, padding: '4px 10px',
                        color: item.is_available ? 'var(--color-success)' : 'var(--color-error)',
                        cursor: 'pointer', fontWeight: 600, fontSize: 12,
                      }}
                    >
                      {item.is_available ? '● Available' : '○ Hidden'}
                    </button>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}>Edit</button>
                      <button
                        className="btn btn-sm"
                        onClick={() => handleDelete(item.id)}
                        style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-error)', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
