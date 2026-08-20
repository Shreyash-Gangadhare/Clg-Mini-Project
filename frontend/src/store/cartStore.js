import { create } from 'zustand'

export const useCartStore = create((set, get) => ({
  items: [],      // { menuItem, quantity }
  selectedSlot: null,

  addItem: (menuItem) => {
    const { items } = get()
    const existing = items.find(i => i.menuItem.id === menuItem.id)
    if (existing) {
      set({
        items: items.map(i =>
          i.menuItem.id === menuItem.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ),
      })
    } else {
      set({ items: [...items, { menuItem, quantity: 1 }] })
    }
  },

  removeItem: (menuItemId) => {
    const { items } = get()
    const existing = items.find(i => i.menuItem.id === menuItemId)
    if (!existing) return
    if (existing.quantity === 1) {
      set({ items: items.filter(i => i.menuItem.id !== menuItemId) })
    } else {
      set({
        items: items.map(i =>
          i.menuItem.id === menuItemId
            ? { ...i, quantity: i.quantity - 1 }
            : i
        ),
      })
    }
  },

  clearCart: () => set({ items: [], selectedSlot: null }),

  setSlot: (slot) => set({ selectedSlot: slot }),

  getTotal: () => {
    return get().items.reduce(
      (sum, i) => sum + Number(i.menuItem.price) * i.quantity,
      0
    )
  },

  getCount: () => {
    return get().items.reduce((sum, i) => sum + i.quantity, 0)
  },
}))
