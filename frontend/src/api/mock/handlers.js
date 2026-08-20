import { http, HttpResponse, delay } from 'msw'
import {
  MENU_ITEMS, SLOTS, SLOT_CAPACITIES, ORDERS,
  createMockOrder, DEMO_USER, DEMO_STAFF, filterMenuByCategory
} from './fixtures.js'

const BASE = '/api/v1'

// Simulate network latency
const NET = () => delay(200)

export const handlers = [

  // ----------------------------------------------------------------
  // AUTH — Student
  // ----------------------------------------------------------------
  http.post(`${BASE}/auth/student/`, async ({ request }) => {
    await NET()
    const body = await request.json()
    if (body.email?.endsWith('@sies.edu.in')) {
      return HttpResponse.json({
        access: 'mock-student-access-token',
        refresh: 'mock-student-refresh-token',
        user: { ...DEMO_USER, email: body.email },
        role: 'student',
      })
    }
    return HttpResponse.json({ detail: 'Invalid email or password.' }, { status: 401 })
  }),

  // ----------------------------------------------------------------
  // AUTH — Staff
  // ----------------------------------------------------------------
  http.post(`${BASE}/auth/staff/`, async ({ request }) => {
    await NET()
    const body = await request.json()
    if (body.email?.includes('admin') || body.email?.includes('staff')) {
      return HttpResponse.json({
        access: 'mock-staff-access-token',
        refresh: 'mock-staff-refresh-token',
        user: DEMO_STAFF,
        role: 'staff',
      })
    }
    return HttpResponse.json({ detail: 'Invalid credentials.' }, { status: 401 })
  }),

  // ----------------------------------------------------------------
  // REGISTER
  // ----------------------------------------------------------------
  http.post(`${BASE}/register/`, async ({ request }) => {
    await NET()
    const body = await request.json()
    if (!body.email?.endsWith('@sies.edu.in')) {
      return HttpResponse.json(
        { email: ['Must be a valid SIES college email (@sies.edu.in)'] },
        { status: 400 }
      )
    }
    return HttpResponse.json({
      id: 99,
      ...body,
      created_at: new Date().toISOString(),
    }, { status: 201 })
  }),

  // ----------------------------------------------------------------
  // MENU
  // ----------------------------------------------------------------
  http.get(`${BASE}/menu/`, async ({ request }) => {
    await NET()
    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    const items = filterMenuByCategory([...MENU_ITEMS], category)
    return HttpResponse.json(items)
  }),

  http.post(`${BASE}/menu/`, async ({ request }) => {
    await NET()
    const body = await request.json()
    const newItem = { id: MENU_ITEMS.length + 100, ...body, created_at: new Date().toISOString() }
    MENU_ITEMS.push(newItem)
    return HttpResponse.json(newItem, { status: 201 })
  }),

  http.patch(`${BASE}/menu/:id/`, async ({ request, params }) => {
    await NET()
    const body = await request.json()
    const idx = MENU_ITEMS.findIndex(i => i.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
    MENU_ITEMS[idx] = { ...MENU_ITEMS[idx], ...body }
    return HttpResponse.json(MENU_ITEMS[idx])
  }),

  http.delete(`${BASE}/menu/:id/`, async ({ params }) => {
    await NET()
    const idx = MENU_ITEMS.findIndex(i => i.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
    MENU_ITEMS.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // ----------------------------------------------------------------
  // SLOTS
  // ----------------------------------------------------------------
  http.get(`${BASE}/slots/`, async () => {
    await NET()
    return HttpResponse.json(SLOTS)
  }),

  http.post(`${BASE}/slots/`, async ({ request }) => {
    await NET()
    const body = await request.json()
    const slot = { id: SLOTS.length + 1, ...body }
    SLOTS.push(slot)
    return HttpResponse.json(slot, { status: 201 })
  }),

  http.post(`${BASE}/slots/generate_today/`, async () => {
    await NET()
    return HttpResponse.json({ message: 'Slots generated for today', count: SLOTS.length })
  }),

  // ----------------------------------------------------------------
  // SLOT CAPACITY
  // ----------------------------------------------------------------
  http.get(`${BASE}/slots/:slotId/capacity/`, async ({ params }) => {
    await NET()
    const caps = SLOT_CAPACITIES.filter(c => c.slot_id === Number(params.slotId))
    return HttpResponse.json(caps)
  }),

  http.post(`${BASE}/slots/:slotId/capacity/`, async ({ request, params }) => {
    await NET()
    const body = await request.json()
    const cap = {
      id: SLOT_CAPACITIES.length + 1,
      slot_id: Number(params.slotId),
      ...body,
      units_booked: 0,
    }
    SLOT_CAPACITIES.push(cap)
    return HttpResponse.json(cap, { status: 201 })
  }),

  http.patch(`${BASE}/slots/:slotId/capacity/:capId/`, async ({ request, params }) => {
    await NET()
    const body = await request.json()
    const idx = SLOT_CAPACITIES.findIndex(c => c.id === Number(params.capId))
    if (idx === -1) return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
    SLOT_CAPACITIES[idx] = { ...SLOT_CAPACITIES[idx], ...body }
    return HttpResponse.json(SLOT_CAPACITIES[idx])
  }),

  // ----------------------------------------------------------------
  // ORDERS
  // ----------------------------------------------------------------
  http.post(`${BASE}/orders/`, async ({ request }) => {
    await NET()
    const body = await request.json()
    const order = createMockOrder({
      user_id: 1,
      slot_id: body.slot_id,
      items: body.items,
    })
    return HttpResponse.json(order, { status: 201 })
  }),

  http.get(`${BASE}/orders/`, async () => {
    await NET()
    return HttpResponse.json(ORDERS.filter(o => o.user_id === 1))
  }),

  http.get(`${BASE}/orders/:id/`, async ({ params }) => {
    await NET()
    const order = ORDERS.find(o => o.id === Number(params.id))
    if (!order) return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
    return HttpResponse.json(order)
  }),

  http.get(`${BASE}/orders/:id/qr/`, async ({ params }) => {
    await NET()
    const order = ORDERS.find(o => o.id === Number(params.id))
    if (!order) return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
    // Return SVG QR placeholder
    return HttpResponse.json({
      qr_image_url: `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
          <rect width="200" height="200" fill="%23fff"/>
          <text x="100" y="100" text-anchor="middle" font-size="14" fill="%231A1A1A">QR #T-${String(order.token_number).padStart(2,'0')}</text>
          <rect x="10" y="10" width="180" height="180" fill="none" stroke="%231A1A1A" stroke-width="3"/>
        </svg>`
      )}`,
      token_number: order.token_number,
      order_id: order.id,
    })
  }),

  http.post(`${BASE}/orders/:id/scan/`, async ({ params }) => {
    await NET()
    const order = ORDERS.find(o => o.id === Number(params.id))
    if (!order) return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
    order.status = 'picked_up'
    return HttpResponse.json(order)
  }),

  http.patch(`${BASE}/orders/:id/status/`, async ({ request, params }) => {
    await NET()
    const body = await request.json()
    const order = ORDERS.find(o => o.id === Number(params.id))
    if (!order) return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
    order.status = body.status
    return HttpResponse.json(order)
  }),

  http.post(`${BASE}/orders/bulk-status/`, async ({ request }) => {
    await NET()
    const body = await request.json()
    const affected = ORDERS.filter(
      o => o.slot_id === body.slot_id && o.status === body.from_status
    )
    affected.forEach(o => { o.status = body.to_status })
    return HttpResponse.json({ updated: affected.length })
  }),

  // ----------------------------------------------------------------
  // PAYMENTS
  // ----------------------------------------------------------------
  http.post(`${BASE}/payments/create-order/`, async ({ request }) => {
    await NET()
    const body = await request.json()
    const order = ORDERS.find(o => o.id === body.order_id)
    return HttpResponse.json({
      razorpay_order_id: `order_mock_${Date.now()}`,
      amount: order ? Math.round(Number(order.total_amount) * 100) : 10000,
      currency: 'INR',
      key_id: 'rzp_test_mock_key',
    })
  }),

  http.post(`${BASE}/payments/verify/`, async ({ request }) => {
    await NET()
    const body = await request.json()
    const order = ORDERS.find(o => o.id === body.order_id)
    if (order) {
      order.payment_status = 'paid'
      order.razorpay_payment_id = body.razorpay_payment_id || `pay_mock_${Date.now()}`
    }
    return HttpResponse.json({ status: 'ok', order })
  }),

  // ----------------------------------------------------------------
  // DASHBOARD
  // ----------------------------------------------------------------
  http.get(`${BASE}/dashboard/`, async () => {
    await NET()
    const paidOrders = ORDERS.filter(o => o.payment_status === 'paid')
    const revenue = paidOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)
    const pending = ORDERS.filter(o => ['placed', 'preparing'].includes(o.status)).length

    // Top 5 items by quantity
    const itemCounts = {}
    ORDERS.forEach(order => {
      order.items?.forEach(oi => {
        const key = oi.menu_item?.name || `Item ${oi.menu_item_id}`
        itemCounts[key] = (itemCounts[key] || 0) + oi.quantity
      })
    })
    const topItems = Object.entries(itemCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    return HttpResponse.json({
      revenue: revenue.toFixed(2),
      orders_processed: paidOrders.length,
      orders_pending: pending,
      top_items: topItems,
    })
  }),

  // ----------------------------------------------------------------
  // CANTEEN STATUS
  // ----------------------------------------------------------------
  http.get(`${BASE}/canteen-status/`, async () => {
    await NET()
    const hour = new Date().getHours()
    const isOpen = hour >= 8 && hour < 17
    return HttpResponse.json({
      is_open: isOpen,
      message: isOpen ? 'Kitchen is live 🔥' : 'Closed — opens at 8:00 AM',
      orders_today: ORDERS.length,
    })
  }),

  // ----------------------------------------------------------------
  // INSIGHTS
  // ----------------------------------------------------------------
  http.get(`${BASE}/insights/`, async ({ request }) => {
    await NET()
    const url = new URL(request.url)
    const useDemo = url.searchParams.get('demo') === '1'
    const paidOrders = ORDERS.filter(o => o.payment_status === 'paid')
    const hasRealOrders = paidOrders.length >= 5

    if (hasRealOrders) {
      const cancelledOrders = ORDERS.filter(o => o.status === 'cancelled')

      const hourCounts = {}
      ORDERS.forEach(o => {
        const h = new Date(o.created_at).getHours()
        hourCounts[h] = (hourCounts[h] || 0) + 1
      })
      const peakHours = Object.entries(hourCounts)
        .map(([h, c]) => ({ hour: Number(h), label: `${String(h).padStart(2,'0')}:00`, count: c }))
        .sort((a, b) => a.hour - b.hour)

      const JS_TO_ISO = { 0:7, 1:1, 2:2, 3:3, 4:4, 5:5, 6:6 }
      const DAY_LABELS = { 1:'Mon', 2:'Tue', 3:'Wed', 4:'Thu', 5:'Fri', 6:'Sat', 7:'Sun' }
      const dayCounts = {}
      ORDERS.forEach(o => {
        const iso = JS_TO_ISO[new Date(o.created_at).getDay()]
        dayCounts[iso] = (dayCounts[iso] || 0) + 1
      })
      const peakDays = Object.entries(dayCounts)
        .map(([d, c]) => ({ day_num: Number(d), day: DAY_LABELS[d], count: c }))
        .sort((a, b) => a.day_num - b.day_num)

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

      return HttpResponse.json({
        is_sample_data: false,
        peak_hours: peakHours,
        peak_days: peakDays,
        cancelled_items: cancelledItems,
        revenue_by_category: revByCategory,
        orders_processed: {
          total: ORDERS.length,
          picked_up: ORDERS.filter(o => o.status === 'picked_up').length,
          cancelled: cancelledOrders.length,
          pending: ORDERS.filter(o => ['placed','preparing'].includes(o.status)).length,
        },
        waste_reduction: { reduction_pct: null, note: 'Not enough capacity data to estimate.' },
        wait_time: { actual_minutes: null, baseline_minutes: 15, reduction_pct: null, note: 'Not enough picked-up orders to estimate.' },
      })
    }

    // Sample data fallback
    return HttpResponse.json({
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
    })
  }),
]
