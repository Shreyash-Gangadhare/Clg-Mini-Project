# CampusEats — Full Chat Context & Project Brain Dump
> **Purpose:** Safety net before an Antigravity version update.  
> If context is lost, read this file first. It contains everything needed to resume work instantly.  
> Last written: 2026-08-15 00:45 IST

---

## 1. What This Project Is

**CampusEats** — a canteen pre-order web app for **SIES Graduate School of Technology (SIES GST)**, Mumbai.

- Students pre-order food from their phones and pick it up at a designated slot — no queue.
- Staff run the kitchen from a live Kitchen Display System (KDS) board.
- Built as a college mini-project.

**Design language:** "Indian food-delivery energy" — loud, warm, appetite-driven. Think Swiggy/Zomato dark mode vibes. Key color: **`#FF6B35`** (burnt orange). Fonts: **Baloo 2** (display) + **Inter** (body). Rounded-xl cards, high contrast, micro-animations everywhere.

---

## 2. Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite 8, Framer Motion, Zustand, Axios, React Router v7 |
| Mock API | MSW v2 + axios-mock-adapter (dual-layer) |
| Backend | Django 6.1, Django REST Framework 3.18, SimpleJWT 5.5 |
| Real-time | Django Channels 4.3, Daphne 4.2 |
| Payments | Razorpay (test mode) |
| DB | SQLite (dev) |
| Channel layer | In-memory (dev) — swap to Redis for prod |

---

## 3. The Three Phases We Went Through

### Phase 1 — React SPA (all mock, no backend)
**Status: COMPLETE ✓**

Built the entire frontend on fake data using MSW service workers. Hit a problem: MSW service workers don't work in headless Playwright (the browser subagent used for screenshots). Fixed by adding **axios-mock-adapter** as a universal fallback — now mocking works everywhere.

Key files:
- `frontend/src/api/mock/axiosMock.js` — the axios-level mock that works in headless browsers
- `frontend/src/main.jsx` — sets up both MSW and axios adapter; skips all mocking if `VITE_USE_REAL_API=true`
- `frontend/src/api/mock/fixtures.js` — 15 seed menu items + slot generator
- `frontend/src/App.jsx` — has `useHydrated` guard to prevent route flashes before Zustand rehydrates from localStorage
- `frontend/src/pages/student/DevLoginPage.jsx` — `/dev-login?role=student|staff` bypass for testing; always calls `logout()` first to clear stale auth

**Slot timing fix:** The original fixtures generated slots 08:00–17:00, but these were all in the past during evening demos. Fixed: slots now generate relative to `now + 30 min`, so there are always open slots during any demo.

**Screenshots captured by browser subagent confirm:**
- Menu page: category chips, food cards with emoji icons, Add+ buttons, VegDot indicators
- Cart drawer: slides in, shows items + total, Proceed to Checkout button
- Admin dashboard: sidebar nav, KPI cards (revenue, orders, pending), top-5 table with bar charts
- KDS page: slot-aggregated cards (08:00–08:15 PENDING · Vada Pav ×2) + "Start Preparing" buttons

---

### Phase 2 — Real Django Backend
**Status: COMPLETE ✓**

Built the full backend. Directory: `backend/`.

#### Project layout:
```
backend/
├── campuseats/           ← Django project package
│   ├── settings.py
│   ├── urls.py           ← root URL conf
│   ├── api_urls.py       ← all /api/v1/ routes assembled here
│   ├── asgi.py           ← Channels routing (HTTP + WebSocket)
│   └── wsgi.py
├── apps/
│   ├── users/            ← custom User model, auth views, permissions
│   ├── menu/             ← MenuItem CRUD + refund signal
│   ├── slots/            ← Slot + SlotItemCapacity + capacity refund signal
│   ├── orders/           ← Order placement, QR, scan, bulk-status, dashboard
│   │   └── tests/
│   │       └── test_refund.py   ← 14 tests, all passing
│   ├── payments/         ← Razorpay create + HMAC verify
│   └── realtime/         ← WS consumers + JWT WS middleware
├── requirements.txt
└── .env.example
```

#### Models:
- **User** (`apps/users/models.py`) — AbstractBaseUser, roles: `student` / `staff` / `admin`, validates `@sies.edu.in` email
- **MenuItem** (`apps/menu/models.py`) — `ready_stock` vs `made_to_order`, `veg_flag`, `is_available` (triggers refund signal when set False)
- **Slot** (`apps/slots/models.py`) — `date`, `start_time`, `end_time`, `cutoff_time`, `is_open` @property
- **SlotItemCapacity** (`apps/slots/models.py`) — `max_units`, `units_booked`, `remaining` @property; refund signal fires when `max_units` reduced below `units_booked`
- **Order** (`apps/orders/models.py`) — statuses: `placed` → `preparing` → `ready` → `picked_up` / `cancelled`; payment statuses: `pending` → `paid` → `refunded` / `partial_refund`
- **OrderItem** (`apps/orders/models.py`) — stores `price_at_order` (snapshot price)

#### Key design decisions:
- **Two separate auth endpoints:** `/auth/student/` and `/auth/staff/` — each validates the role server-side. A student can't use the staff endpoint and vice versa.
- **JWT role claim:** `role` and `name` are embedded in the access token so the frontend can gate routes without an extra API call.
- **QR tokens:** HMAC-SHA256 signed, 16 hex chars, format `campuseats:order:{id}:{token}`. No extra DB storage needed. Verified server-side on scan.
- **Razorpay mock-safe:** If `razorpay_payment_id` starts with `pay_mock`, verification is skipped — safe for dev/testing.

#### Management commands:
```bash
# Seed DB (run once after migrate)
python -m django seed_data --settings=campuseats.settings
# → Creates: 15 menu items, admin@sies.edu.in/admin123, arjun.sharma@sies.edu.in/student123, 36 slots for today

# Create staff
python -m django create_staff --email x@sies.edu.in --name "Name" --password pw --settings=campuseats.settings
```

#### Seeded demo users:
| Role | Email | Password |
|------|-------|----------|
| Admin/Staff | `admin@sies.edu.in` | `admin123` |
| Student | `arjun.sharma@sies.edu.in` | `student123` |

#### API smoke test confirmed working:
- `POST /api/v1/auth/student/` → returns JWT with `role: student`
- `GET /api/v1/menu/` → 15 items
- `GET /api/v1/slots/` → 36 slots for today
- `GET /api/v1/dashboard/` → `{revenue, orders_processed, orders_pending, top_items}`

---

### Phase 3 — Admin Hardening + Refund Edge Case
**Status: COMPLETE ✓**

#### Refund signal system (Section 11 — mandatory requirement):

**Trigger 1:** `MenuItem.is_available` set to `False`
1. `pre_save` signal in `apps/menu/signals.py` detects the change
2. Finds all `placed`/`preparing` paid orders containing that item
3. Deletes the `OrderItem` from each order
4. Calls Razorpay `client.payment.refund()` for the item subtotal
5. Updates `order.payment_status` to `refunded` (if total=0) or `partial_refund`
6. Pushes `order.refund_issued` WebSocket message to student with amount + reason

**Trigger 2:** `SlotItemCapacity.max_units` reduced below `units_booked`
- Signal in `apps/slots/signals.py`
- Same pipeline, refunds newest orders first (FIFO)

**Bug that was fixed:** `Order` class wasn't imported inside `_process_refund()` function in `signals.py` — caused `NameError: name 'Order' is not defined`. Fixed by adding `from apps.orders.models import Order` inside the function.

#### Test results (`apps/orders/tests/test_refund.py`):
```
Ran 14 tests in 4.849s — OK (all pass)
```
Tests cover: refund triggered on unavailable item, order item removed, payment_status updated, picked-up orders unaffected, slot open/closed logic, permission boundaries (student can't create menu items, staff can).

---

## 4. How to Run the Project

### Frontend only (mock mode — no backend needed):
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
# Quick login: http://localhost:5173/dev-login?role=student
# Staff login: http://localhost:5173/dev-login?role=staff
```

### Full stack (frontend + Django backend):
```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
python -m django migrate --settings=campuseats.settings
python -m django seed_data --settings=campuseats.settings
python -m django runserver 8000 --settings=campuseats.settings

# Terminal 2 — Frontend (connected to real backend)
cd frontend
cp .env.real .env.local    # sets VITE_USE_REAL_API=true
npm run dev
```

### Run tests:
```bash
cd backend
python -m django test apps.orders.tests.test_refund --settings=campuseats.settings -v 2
```

---

## 5. Frontend Key Files (don't touch without reason)

| File | What it does |
|------|-------------|
| `src/main.jsx` | Entry point. Checks `VITE_USE_REAL_API` flag. If false, installs axios mock + tries MSW SW. |
| `src/App.jsx` | Router. Has `useHydrated()` guard — waits for Zustand to hydrate before rendering routes. |
| `src/api/client.js` | Axios instance. Base URL from `VITE_API_URL` (default `http://localhost:8000`). |
| `src/api/mock/fixtures.js` | 15 menu items + `buildSlots()` function (generates future-facing slots). |
| `src/api/mock/axiosMock.js` | `installAxiosMock(api)` — intercepts all axios calls with fake responses. |
| `src/store/authStore.js` | Zustand store with `persist` middleware. Stores `token`, `refreshToken`, `user`, `role`. |
| `src/store/cartStore.js` | Cart items, quantities, total. |
| `src/hooks/useWebSocket.js` | WS_BASE from `VITE_WS_URL`. Skips connection if token starts with `mock-`. |
| `src/pages/student/DevLoginPage.jsx` | `/dev-login?role=X` — calls `logout()` first, then `setAuth()`, then redirects. |
| `.env.development` | Default dev config — `VITE_USE_REAL_API=false` |
| `.env.real` | Real backend config — `VITE_USE_REAL_API=true`. Copy to `.env.local` to activate. |

---

## 6. Backend Key Files

| File | What it does |
|------|-------------|
| `campuseats/settings.py` | All config. JWT: 8h access / 7d refresh. CORS allows localhost:5173. SQLite. In-memory channels. |
| `campuseats/api_urls.py` | All `/api/v1/` routes assembled. DRF DefaultRouter for menu, slots, orders. |
| `campuseats/asgi.py` | Channels routing — HTTP to Django, WS to JWT middleware → URL router. |
| `apps/users/models.py` | Custom User. `USERNAME_FIELD = 'email'`. |
| `apps/users/views.py` | `StudentAuthView`, `StaffAuthView` (role-validated), `StudentRegisterView`. |
| `apps/users/permissions.py` | `IsStudentUser`, `IsStaffUser`, `IsAdminUser`. |
| `apps/menu/signals.py` | `pre_save` on MenuItem → `_refund_for_unavailable_item()` → `_process_refund()`. |
| `apps/slots/signals.py` | `pre_save` on SlotItemCapacity → `_refund_excess_capacity()`. |
| `apps/orders/views.py` | `OrderViewSet` with `create`, `qr`, `scan`, `bulk_status` actions. `DashboardView`. |
| `apps/orders/qr_utils.py` | `generate_qr_token()` (HMAC-SHA256), `generate_qr_data()`, `verify_qr_token()`, `generate_qr_image_base64()`. |
| `apps/realtime/consumers.py` | `StudentOrderConsumer` (per-order WS), `AdminKDSConsumer` (KDS feed). |
| `apps/realtime/middleware.py` | `JwtAuthMiddleware` — reads `?token=<jwt>` from WS query string. |
| `apps/menu/management/commands/seed_data.py` | Seeds menu items, demo users, today's slots + capacities. |

---

## 7. What's NOT Done Yet (Optional)

Only one thing remains:
- **Browser-subagent refund walkthrough** — visually confirm the refund flow in a live browser:
  1. Student places paid order
  2. Staff sets `is_available=False` on an item in that order
  3. Student receives WS `refund_issued` message
  4. Order total updates in UI

This is an optional visual test — all the underlying logic is tested and passing in the Django test suite.

---

## 8. Known Gotchas & Fixes Applied

| Problem | Fix |
|---------|-----|
| MSW service worker fails in Playwright headless | Added axios-mock-adapter as fallback. Both run simultaneously; axios adapter catches everything in headless. |
| Zustand `persist` hydrates async — route guards fire before auth is loaded | Added `useHydrated()` hook in `App.jsx` — shows loading spinner until Zustand rehydrates. |
| DevLoginPage didn't clear stale session | Added `logout()` before `setAuth()` in `DevLoginPage.jsx`. |
| All demo slots in past during evening testing | `buildSlots()` now generates slots starting `now + 30 min` instead of fixed 08:00–17:00. |
| `NameError: Order` in `signals.py` | `Order` wasn't imported at top of `_process_refund()`. Added inline import. |
| Django `makemigrations` said "No changes" | Apps needed to be listed explicitly: `makemigrations users menu slots orders`. |
| Unicode `✓` char crashed Windows stdout | Replaced with ASCII in `seed_data.py` output string. |
| `django-channels` (wrong package!) installed alongside `channels` | `pip install channels` installs the right Channels 4.x. `django-channels==0.7.0` is an unrelated old package. Channels 4.3.2 is what's actually used. |
| `models_F` imported at bottom of `orders/views.py` | Moved `from django.db.models import F as models_F, Sum` to top of file. |

---

## 9. Environment Variables

### Backend (`backend/.env` — copy from `.env.example`):
```
DJANGO_SECRET_KEY=...
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost 127.0.0.1
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
QR_HMAC_SECRET=any-random-string
```

### Frontend:
```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_USE_REAL_API=false      # true = use real Django, false = use mock
```

---

## 10. Section 12 Hard Boundary (from original spec)

> **No heatmaps. No complex analytics. Keep admin UI restrained.**

The admin dashboard shows ONLY:
- Today's revenue (sum)
- Orders processed count
- Orders pending count
- Top 5 items by units sold (simple table)

Do NOT add charts, graphs, heatmaps, or any analytics beyond these four numbers.

---

## 11. If You Need to Resume After Context Loss

1. Read this file (`chat.md`) first.
2. Read `PROGRESS.md` for current status.
3. Run `python -m django test apps.orders.tests.test_refund --settings=campuseats.settings` — should be 14/14.
4. Run `npm run build` in `frontend/` — should be 517 modules, zero errors.
5. The only remaining work is the optional browser-subagent refund walkthrough (see Section 7 above).

Everything else is done.
