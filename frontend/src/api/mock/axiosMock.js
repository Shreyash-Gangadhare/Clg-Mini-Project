/**
 * Axios-level mock adapter — works without a service worker.
 * Used as fallback when MSW SW is not available (e.g. headless browsers).
 * Mirrors all routes in handlers.js.
 */
import MockAdapter from 'axios-mock-adapter'
import {
  MENU_ITEMS, SLOTS, SLOT_CAPACITIES,
  ORDERS, createMockOrder, DEMO_USER, DEMO_STAFF, filterMenuByCategory,
} from './fixtures'

// Mutable in-memory state (mirrors handlers.js)
let menuItems = MENU_ITEMS.map(i => ({ ...i }))
let orders = ORDERS
let slotCapacities = SLOT_CAPACITIES.map(c => ({ ...c }))

const delay = () => new Promise(r => setTimeout(r, 80))

export function installAxiosMock(axiosInstance) {
  const mock = new MockAdapter(axiosInstance, { onNoMatch: 'passthrough', delayResponse: 80 })

  // ── Auth ──────────────────────────────────────────────────
  mock.onPost('/auth/student/').reply(async (config) => {
    await delay()
    const { email } = JSON.parse(config.data)
    if (!email.endsWith('@sies.edu.in')) {
      return [400, { detail: 'Must be a valid SIES college email.' }]
    }
    return [200, {
      access: 'mock-student-access-token',
      refresh: 'mock-student-refresh-token',
      user: DEMO_USER,
    }]
  })

  mock.onPost('/auth/staff/').reply(async () => {
    await delay()
    return [200, {
      access: 'mock-staff-access-token',
      refresh: 'mock-staff-refresh-token',
      user: DEMO_STAFF,
    }]
  })

  mock.onPost('/register/').reply(async (config) => {
    await delay()
    const body = JSON.parse(config.data)
    if (!body.email.endsWith('@sies.edu.in')) {
      return [400, { email: ['Must be a valid SIES college email (@sies.edu.in)'] }]
    }
    return [201, { id: 99, ...body, created_at: new Date().toISOString() }]
  })

  // ── Menu ──────────────────────────────────────────────────
  mock.onGet('/menu/').reply(async (config) => {
    await delay()
    const category = config.params?.category
    const items = filterMenuByCategory([...menuItems], category)
    return [200, items]
  })

  mock.onPost('/menu/').reply(async (config) => {
    await delay()
    const body = JSON.parse(config.data)
    const newItem = { id: menuItems.length + 100, ...body, created_at: new Date().toISOString() }
    menuItems.push(newItem)
    return [201, newItem]
  })

  mock.onPatch(/\/menu\/(\d+)\/$/).reply(async (config) => {
    await delay()
    const id = parseInt(config.url.match(/\/menu\/(\d+)\//)[1])
    const body = JSON.parse(config.data)
    const idx = menuItems.findIndex(i => i.id === id)
    if (idx < 0) return [404, { detail: 'Not found.' }]
    menuItems[idx] = { ...menuItems[idx], ...body }
    return [200, menuItems[idx]]
  })

  mock.onDelete(/\/menu\/(\d+)\/$/).reply(async (config) => {
    await delay()
    const id = parseInt(config.url.match(/\/menu\/(\d+)\//)[1])
    menuItems = menuItems.filter(i => i.id !== id)
    return [204]
  })

  // ── Slots ─────────────────────────────────────────────────
  mock.onGet('/slots/').reply(async () => {
    await delay()
    return [200, SLOTS]
  })

  mock.onPost('/slots/generate_today/').reply(async () => {
    await delay()
    return [201, { generated: SLOTS.length }]
  })

  mock.onPost('/slots/').reply(async (config) => {
    await delay()
    const body = JSON.parse(config.data)
    const newSlot = { id: SLOTS.length + 100, ...body }
    SLOTS.push(newSlot)
    return [201, newSlot]
  })

  mock.onGet(/\/slots\/(\d+)\/capacity\/$/).reply(async (config) => {
    await delay()
    const slotId = parseInt(config.url.match(/\/slots\/(\d+)\/capacity\//)[1])
    const caps = slotCapacities.filter(c => c.slot_id === slotId)
    return [200, caps]
  })

  mock.onPost(/\/slots\/(\d+)\/capacity\/$/).reply(async (config) => {
    await delay()
    const slotId = parseInt(config.url.match(/\/slots\/(\d+)\/capacity\//)[1])
    const body = JSON.parse(config.data)
    const newCap = { id: slotCapacities.length + 100, slot_id: slotId, ...body, units_booked: 0 }
    slotCapacities.push(newCap)
    return [201, newCap]
  })

  mock.onPatch(/\/slots\/(\d+)\/capacity\/(\d+)\/$/).reply(async (config) => {
    await delay()
    const [, slotId, capId] = config.url.match(/\/slots\/(\d+)\/capacity\/(\d+)\//)
    const body = JSON.parse(config.data)
    const idx = slotCapacities.findIndex(c => c.slot_id === parseInt(slotId) && c.id === parseInt(capId))
    if (idx < 0) return [404]
    slotCapacities[idx] = { ...slotCapacities[idx], ...body }
    return [200, slotCapacities[idx]]
  })

  // ── Orders ────────────────────────────────────────────────
  mock.onPost('/orders/').reply(async (config) => {
    await delay()
    const body = JSON.parse(config.data)
    const order = createMockOrder({ user_id: 1, slot_id: body.slot_id, items: body.items })
    return [201, order]
  })

  mock.onGet('/orders/').reply(async () => {
    await delay()
    return [200, orders]
  })

  mock.onGet(/\/orders\/(\d+)\/$/).reply(async (config) => {
    await delay()
    const id = parseInt(config.url.match(/\/orders\/(\d+)\//)?.[1])
    const order = orders.find(o => o.id === id)
    return order ? [200, order] : [404, { detail: 'Not found.' }]
  })

  mock.onGet(/\/orders\/(\d+)\/qr\/$/).reply(async (config) => {
    await delay()
    const id = parseInt(config.url.match(/\/orders\/(\d+)\/qr\//)?.[1])
    const order = orders.find(o => o.id === id)
    if (!order) return [404]
    return [200, {
      order_id: id,
      token_number: order.token_number,
      qr_image_url: null,
      qr_data: `campuseats:order:${id}:${order.qr_token}`,
    }]
  })

  mock.onPost(/\/orders\/(\d+)\/scan\/$/).reply(async (config) => {
    await delay()
    const id = parseInt(config.url.match(/\/orders\/(\d+)\/scan\//)?.[1])
    const order = orders.find(o => o.id === id)
    if (!order) return [404, { detail: 'Order not found.' }]
    if (order.status === 'picked_up') return [400, { detail: 'Already picked up.' }]
    order.status = 'picked_up'
    return [200, { order }]
  })

  mock.onPost('/orders/bulk-status/').reply(async (config) => {
    await delay()
    const { slot_id, from_status, to_status } = JSON.parse(config.data)
    const affected = orders.filter(o => o.slot_id === slot_id && o.status === from_status)
    affected.forEach(o => { o.status = to_status })
    return [200, { updated: affected.length }]
  })

  // ── Payments ──────────────────────────────────────────────
  mock.onPost('/payments/create-order/').reply(async (config) => {
    await delay()
    const { order_id } = JSON.parse(config.data)
    const order = orders.find(o => o.id === order_id)
    if (!order) return [404]
    return [200, {
      razorpay_order_id: `rzp_order_mock_${Date.now()}`,
      amount: Math.round(parseFloat(order.total_amount) * 100),
      currency: 'INR',
      key_id: 'rzp_test_mock_key',
    }]
  })

  mock.onPost('/payments/verify/').reply(async (config) => {
    await delay()
    const body = JSON.parse(config.data)
    const order = orders.find(o => o.id === body.order_id)
    if (!order) return [404]
    order.payment_status = 'paid'
    order.razorpay_payment_id = body.razorpay_payment_id
    return [200, { success: true, order }]
  })

  // ── Dashboard ─────────────────────────────────────────────
  mock.onGet('/dashboard/').reply(async () => {
    await delay()
    const paidOrders = orders.filter(o => o.payment_status === 'paid')
    const revenue = paidOrders.reduce((s, o) => s + parseFloat(o.total_amount), 0)
    const pending = orders.filter(o => o.status === 'placed' || o.status === 'preparing').length
    // Item counts
    const counts = {}
    paidOrders.forEach(o => {
      o.items?.forEach(oi => {
        counts[oi.menu_item?.name] = (counts[oi.menu_item?.name] || 0) + oi.quantity
      })
    })
    const topItems = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))
    // Demo data if no orders placed yet
    if (topItems.length === 0) {
      return [200, {
        revenue: '4580.00',
        orders_processed: 23,
        orders_pending: 3,
        top_items: [
          { name: 'Vada Pav', count: 42 },
          { name: 'Masala Chai', count: 38 },
          { name: "Today's Special: Pav Bhaji", count: 19 },
          { name: 'Samosa (2 pcs)', count: 15 },
          { name: 'Cold Coffee', count: 12 },
        ],
      }]
    }
    return [200, { revenue: revenue.toFixed(2), orders_processed: paidOrders.length, orders_pending: pending, top_items: topItems }]
  })

  // ── Canteen Status ─────────────────────────────────────────
  mock.onGet('/canteen-status/').reply(async () => {
    await delay()
    return [200, { is_open: true, message: 'Kitchen is live 🔥', orders_today: orders.length }]
  })

  // ── Insights ───────────────────────────────────────────────
  mock.onGet('/insights/').reply(async (config) => {
    await delay()
    const useDemo = config.params?.demo === 1 || config.params?.demo === '1'
    const hasRealOrders = orders.filter(o => o.payment_status === 'paid').length >= 5

    // Build real analytics from mock orders if sufficient data exists
    if (hasRealOrders) {
      const paidOrders = orders.filter(o => o.payment_status === 'paid')
      const cancelledOrders = orders.filter(o => o.status === 'cancelled')

      // Peak hours
      const hourCounts = {}
      orders.forEach(o => {
        const h = new Date(o.created_at).getHours()
        hourCounts[h] = (hourCounts[h] || 0) + 1
      })
      const peakHours = Object.entries(hourCounts)
        .map(([h, c]) => ({ hour: Number(h), label: `${String(h).padStart(2,'0')}:00`, count: c }))
        .sort((a, b) => a.hour - b.hour)

      // Peak days (0=Sun…6=Sat → map to Mon=1…Sun=7)
      const JS_TO_ISO = { 0:7, 1:1, 2:2, 3:3, 4:4, 5:5, 6:6 }
      const DAY_LABELS = { 1:'Mon', 2:'Tue', 3:'Wed', 4:'Thu', 5:'Fri', 6:'Sat', 7:'Sun' }
      const dayCounts = {}
      orders.forEach(o => {
        const iso = JS_TO_ISO[new Date(o.created_at).getDay()]
        dayCounts[iso] = (dayCounts[iso] || 0) + 1
      })
      const peakDays = Object.entries(dayCounts)
        .map(([d, c]) => ({ day_num: Number(d), day: DAY_LABELS[d], count: c }))
        .sort((a, b) => a.day_num - b.day_num)

      // Cancelled items
      const cancelMap = {}
      cancelledOrders.forEach(o => {
        o.items?.forEach(oi => {
          if (!cancelMap[oi.menu_item?.name]) cancelMap[oi.menu_item?.name] = { count: 0, value: 0 }
          cancelMap[oi.menu_item?.name].count += oi.quantity
          cancelMap[oi.menu_item?.name].value += oi.quantity * parseFloat(oi.price_at_order)
        })
      })
      const cancelledItems = Object.entries(cancelMap)
        .map(([name, v]) => ({ name, count: v.count, value: v.value.toFixed(2) }))
        .sort((a, b) => b.count - a.count).slice(0, 10)

      // Revenue by category
      const catRevMap = {}
      const CAT_LABELS = { ready_stock: 'Ready Stock', made_to_order: 'Made to Order' }
      paidOrders.forEach(o => {
        o.items?.forEach(oi => {
          const cat = oi.menu_item?.category || 'ready_stock'
          catRevMap[cat] = (catRevMap[cat] || 0) + oi.quantity * parseFloat(oi.price_at_order)
        })
      })
      const revByCategory = Object.entries(catRevMap)
        .map(([cat, rev]) => ({ category: cat, label: CAT_LABELS[cat] || cat, revenue: rev.toFixed(2) }))
        .sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue))

      return [200, {
        is_sample_data: false,
        peak_hours: peakHours,
        peak_days: peakDays,
        cancelled_items: cancelledItems,
        revenue_by_category: revByCategory,
        orders_processed: {
          total: orders.length,
          picked_up: orders.filter(o => o.status === 'picked_up').length,
          cancelled: cancelledOrders.length,
          pending: orders.filter(o => ['placed','preparing'].includes(o.status)).length,
        },
        waste_reduction: { reduction_pct: null, note: 'Not enough data to estimate.' },
        wait_time: { actual_minutes: null, baseline_minutes: 15, reduction_pct: null, note: 'Not enough picked-up orders to estimate.' },
      }]
    }

    // Return sample data (always when demo=1 and data is sparse)
    return [200, {
      is_sample_data: true,
      peak_hours: [
        {hour:8,label:'08:00',count:12},{hour:9,label:'09:00',count:31},
        {hour:10,label:'10:00',count:47},{hour:11,label:'11:00',count:38},
        {hour:12,label:'12:00',count:62},{hour:13,label:'13:00',count:55},
        {hour:14,label:'14:00',count:28},{hour:15,label:'15:00',count:19},
        {hour:16,label:'16:00',count:14},{hour:17,label:'17:00',count:7},
      ],
      peak_days: [
        {day_num:1,day:'Mon',count:58},{day_num:2,day:'Tue',count:74},
        {day_num:3,day:'Wed',count:81},{day_num:4,day:'Thu',count:67},
        {day_num:5,day:'Fri',count:92},{day_num:6,day:'Sat',count:34},
      ],
      cancelled_items: [
        {name:'Lunch Thali',count:8,value:'1200.00'},
        {name:'Masala Cheese Grill Sandwich',count:5,value:'850.00'},
        {name:'Cheese Masala Dosa',count:4,value:'320.00'},
        {name:'Schezwan Rice',count:3,value:'240.00'},
        {name:'Manchurian Noodles',count:2,value:'180.00'},
      ],
      revenue_by_category: [
        {category:'made_to_order',label:'Made to Order',revenue:'18640.00'},
        {category:'ready_stock',label:'Ready Stock',revenue:'7320.00'},
      ],
      orders_processed: { total:313, picked_up:271, cancelled:18, pending:24 },
      waste_reduction: {
        reduction_pct:68.4,
        baseline_units:1890,
        actual_units:597,
        note:'Pre-ordering reduced estimated food preparation by 68.4% vs cooking to full slot capacity (1890 → 597 units).',
      },
      wait_time: {
        actual_minutes:4.2,
        baseline_minutes:15,
        reduction_pct:72.0,
        note:'Median end-to-end time for 271 picked-up orders: 4.2 min vs 15 min walk-up baseline.',
      },
    }]
  })

  return mock
}
