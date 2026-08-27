# CampusEats — SIES GST Canteen Pre-Order System

A full-stack canteen pre-order web app for SIES Graduate School of Technology.  
Students skip the queue by ordering ahead; staff run the kitchen from a live KDS board.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 8, Framer Motion, Zustand, Axios |
| Fonts | Syne (hero headlines), Baloo 2 (display), Inter (body) |
| Mock API | MSW v2 + axios-mock-adapter (dual-layer, works in all browsers) |
| Backend | Django 6.1 + DRF + SimpleJWT |
| Real-time | Django Channels 4 (WebSocket consumers) |
| Payments | Razorpay (test mode) |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Channel Layer | In-memory (dev) / Redis (prod) |
| Analytics | pandas 3.x + numpy 2.x (co-occurrence matrix, cosine similarity) |

---

## Quick Start — Frontend Only (No Backend Needed)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

**Demo credentials (mock mode):**
- Student: any `@sies.edu.in` email, any password → auto-logged in via `/dev-login?role=student`
- Staff: use `/dev-login?role=staff` → redirects to admin dashboard

---

## Full Stack Setup

### 1. Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Razorpay test keys

# Apply migrations
python -m django migrate --settings=campuseats.settings

# Seed 72 menu items, 1 admin user, today's slots
python -m django seed_data --settings=campuseats.settings

# Create additional staff users
python -m django create_staff --email staff@sies.edu.in --name "Your Name" --password yourpassword --settings=campuseats.settings

# Run development server
python -m django runserver 8000 --settings=campuseats.settings
```

**Demo users created by seed_data:**
- Staff: `admin@sies.edu.in` / `admin123`
- Student: `arjun.sharma@sies.edu.in` / `student123`

### 2. Frontend (connected to real backend)

```bash
cd frontend

# Copy real-API env config
cp .env.real .env.local   # sets VITE_USE_REAL_API=true

npm run dev
```

---

## API Endpoints

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | `/api/v1/auth/student/` | None | Student JWT login |
| POST | `/api/v1/auth/staff/` | None | Staff JWT login |
| POST | `/api/v1/register/` | None | Student self-registration |
| GET | `/api/v1/menu/` | Any | List menu items (filter: `?category=breakfast\|snacks\|meals\|beverages\|today_special`) |
| POST | `/api/v1/menu/` | Staff | Create menu item |
| PATCH | `/api/v1/menu/{id}/` | Staff | Update menu item |
| DELETE | `/api/v1/menu/{id}/` | Staff | Delete menu item |
| GET | `/api/v1/slots/` | Auth | Today's pickup slots |
| POST | `/api/v1/slots/generate_today/` | Staff | Bulk-generate today's slots |
| GET | `/api/v1/slots/{id}/capacity/` | Auth | Per-item capacity for a slot |
| POST | `/api/v1/orders/` | Student | Place an order |
| GET | `/api/v1/orders/` | Auth | List orders (student: own; staff: all) |
| GET | `/api/v1/orders/{id}/qr/` | Auth | QR code for pickup |
| POST | `/api/v1/orders/{id}/scan/` | Staff | Mark order picked up |
| POST | `/api/v1/orders/bulk-status/` | Staff | Bulk transition slot orders |
| POST | `/api/v1/payments/create-order/` | Student | Create Razorpay order |
| POST | `/api/v1/payments/verify/` | Auth | Verify payment + mark paid |
| GET | `/api/v1/dashboard/` | Staff | Revenue, order counts, top-5 items |
| GET | `/api/v1/canteen-status/` | Any | Is the canteen open? |
| GET | `/api/v1/insights/` | Staff | Analytics — peak hours/days, cancelled items, revenue by category, waste & wait-time estimates. Add `?demo=1` for sample data. |
| GET | `/api/v1/recommendations/item/{id}/` | Auth | Top-N similar items for a menu item. Params: `exclude=1,2,3` (cart IDs to skip), `n=3`. |
| GET | `/api/v1/recommendations/cart/` | Auth | Top-N add-on suggestions for a basket. Params: `ids=1,2,3`, `n=2`. |

## WebSocket Endpoints

| URL | Auth | Description |
|-----|------|-------------|
| `ws://host/ws/orders/{id}/?token=<jwt>` | Student | Real-time order status updates |
| `ws://host/ws/kds/?token=<jwt>` | Staff | Live KDS aggregated order feed |

---

## Roles

- **Student** — can register, browse menu, place orders, view QR code, track status
- **Staff/Admin** — manage menu, manage slots, view KDS, scan QR codes, view dashboard

There are only **two roles**. No third role exists.

---

## Refund Logic (Section 11)

When a menu item is marked `is_available=False` OR when slot capacity is reduced below booked units:

1. All affected `placed`/`preparing` paid orders are identified
2. The unavailable item is removed from each order
3. Razorpay partial refund API is called for the item subtotal
4. Order `payment_status` is updated to `partial_refund` or `refunded`
5. A WebSocket `refund_issued` message is pushed to the student in real-time

Run the refund tests:
```bash
python -m django test apps.orders.tests.test_refund --settings=campuseats.settings -v 2
```

---

## Management Commands

```bash
# Seed demo data
python -m django seed_data --settings=campuseats.settings
python -m django seed_data --reset --settings=campuseats.settings  # wipe and re-seed

# Create staff user
python -m django create_staff --email canteen@sies.edu.in --name "Canteen Manager" --password secret --settings=campuseats.settings

# Generate today's slots
python -m django shell -c "from apps.slots.views import *; ..."
# Or use the API: POST /api/v1/slots/generate_today/
```

---

## Project Structure

```
CampusEats/
├── frontend/                    # Vite + React SPA
│   ├── public/
│   │   ├── home.html            # Scroll-film marketing homepage (standalone, no React)
│   │   ├── canteen-hero.jpg     # Real canteen counter photo (drop-in; no code change needed)
│   │   ├── canteen-clip.mp4     # 4.3s canteen video clip — scrubbed by homepage engine
│   │   └── mockServiceWorker.js
│   ├── src/
│   │   ├── api/                # Axios client + MSW mock handlers
│   │   │   └── mock/          # MSW handlers, fixtures, axios mock adapter
│   │   ├── components/         # Shared atoms (VegDot, CartDrawer, KDS cards...)
│   │   ├── hooks/              # useWebSocket, useSlotCountdown, useCapacity
│   │   ├── pages/
│   │   │   ├── student/       # Login, Hero, Menu, Checkout, Status, History
│   │   │   └── admin/         # AdminLogin, Dashboard, KDS, Menu, Slots, Scanner
│   │   └── store/             # Zustand stores (auth, cart, ws)
│   └── public/
│       └── mockServiceWorker.js
│
└── backend/                    # Django REST + Channels
    ├── campuseats/             # Django project package
    │   ├── settings.py
    │   ├── urls.py
    │   ├── api_urls.py         # All /api/v1/ routes
    │   └── asgi.py             # Channels routing
    ├── apps/
    │   ├── users/              # Custom User model, JWT auth views, permissions
    │   ├── menu/               # MenuItem CRUD + refund signal
    │   │   └── management/commands/seed_data.py  # 72-item seed command (--reset)
    │   ├── slots/              # Slot + SlotItemCapacity + capacity refund signal
    │   ├── orders/             # Order placement, QR, scan, bulk status, dashboard
    │   │   ├── analytics.py        # Peak hours/days, cancelled items, revenue, waste/wait
    │   │   ├── analytics_sample.py # Synthetic demo dataset for Insights page
    │   │   ├── recommendations.py  # Co-occurrence matrix + cosine similarity engine
    │   │   ├── signals.py          # Cache-invalidation signal (paid order → cache.delete)
    │   │   └── tests/
    │   │       ├── test_refund.py          # 14 refund signal tests
    │   │       └── test_recommendations.py # 13 rec engine + cache-invalidation tests
    │   ├── payments/           # Razorpay create + HMAC verify
    │   └── realtime/           # WS consumers (StudentOrder, AdminKDS) + JWT middleware
    └── requirements.txt
```

---

## Environment Variables

See `backend/.env.example` for all required variables.

Key variables:
- `DJANGO_SECRET_KEY` — change in production
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — test keys from Razorpay dashboard
- `QR_HMAC_SECRET` — any random string for QR token signing
- `VITE_USE_REAL_API` — set `true` in frontend to connect to Django backend

---

## Menu

The frontend fixture (`frontend/src/api/mock/fixtures.js`) contains **72 real items** from the SIES GST canteen menu board.

| Category | Count | Examples |
|----------|-------|---------|
| Breakfast | 16 | Idli Sambar ₹40, Masala Dosa ₹60, Poha ₹40, all Uttapam variants |
| Snacks | 19 | Vadapav ₹18, Samosa ₹16, Vada Usal ₹45, Sabudana Vada ₹50 |
| Meals | 24 | Misal Pav ₹60, Hakka Noodles ₹70, Cheese Grill Sandwich ₹120, Lunch Thali ₹150 |
| Drinks | 13 | Tea ₹10, Filter Coffee ₹25, Mosambi Juice ₹30, Sweet Lassi ₹25 |

**Today's Specials** are configurable — set `is_today_special: true` on any item in `fixtures.js`. Currently marked: Misal Pav, Masala Dosa, Cheese Masala Dosa, Schezwan Rice, Cheese Grill Sandwich.

Category filtering is data-driven via `filterMenuByCategory()` exported from `fixtures.js` — adding new items requires only setting the `ui_category` field.

---

## UI Highlights

- **Horizontal food cards** — image left, content right (Zomato/Swiggy style), not a generic grid
- **Inline quantity stepper** — Add → `−` qty `+` transition with animation; no page navigation
- **Chef's Pick editorial strip** — horizontal scroll strip with purple ⭐ Special badge
- **Per-category accent colors** — Breakfast amber, Snacks emerald, Meals orange, Drinks blue, Chef's Pick purple
- **Search bar** — real-time filter within active category tab
- **Category chips with count badges** — `All 72 · Breakfast 16 · Snacks 19 · Meals 24 · Drinks 13 · Chef's Pick 5`
- **Editorial hero headline** — Syne font, `-0.035em` letter-spacing, italic second line

---

## Insights (Admin Analytics)

The admin dashboard includes a data-analysis module at `/admin/insights`.

| Metric | How it's computed |
|--------|------------------|
| Peak ordering hours | `ExtractHour` + `Count` on `Order.created_at` |
| Peak ordering days | `ExtractIsoWeekDay` + `Count` |
| Most-cancelled items | `OrderItem` aggregation on cancelled orders, by unit count and ₹ value |
| Revenue by category | `OrderItem × price_at_order` for paid orders, grouped by `MenuItem.category` |
| Waste reduction % | `SlotItemCapacity.max_units` vs actual pre-ordered units |
| Wait-time reduction % | Median `updated_at − created_at` for picked-up orders vs 15-min walk-up baseline |

All functions live in `backend/apps/orders/analytics.py` — pure ORM, no side effects, independently testable.  
Falls back to synthetic sample data when DB has fewer than 5 paid orders; pass `?demo=1` to force sample data.

---

## Recommendation Engine

Item-to-item similarity recommendations powered by order co-occurrence analysis.

### Algorithm

1. Pull `(order_id, menu_item_id)` pairs from `OrderItem` → build an order×item binary pivot matrix
2. L2-normalise each item's column (presence vector across orders)
3. Dot product of unit vectors = cosine similarity
4. Return top-N highest-similarity items, excluding cart items and unavailable items

**Granularity:** per-order co-occurrence (not per-user) — yields useful signal from ~20 orders across 72 items, realistic for a first week of deployment.

### Cold-start handling

| Condition | Fallback | `source` label in response |
|-----------|---------|----------------------------|
| Total orders < 20 | Sitewide popularity (most-ordered items) | `fallback_popularity` |
| Item has zero order history | Same-`category` popularity | `fallback_category` |
| Empty cart on checkout upsell | Popularity | `fallback_popularity` |
| Normal case (≥20 orders, item in matrix) | Cosine-similarity top-N | `cosine_similarity` |

Fallback paths are never silently blended into similarity results — the `source` field always identifies which path was taken.

### Caching

The similarity matrix is cached in Django's `cache` backend (10-min TTL, key `campuseats_item_similarity_matrix`). Zero-config in dev (in-memory cache); drop in Redis for prod.

### Where it surfaces

- **Menu page** — "Also ordered" strip below each item card, fetched lazily via `IntersectionObserver` (only when the card enters the viewport — avoids 72 parallel requests on mount)
- **Checkout page** — "Add to your order" upsell strip between Order Summary and Slot Picker, re-fetched whenever cart composition changes

### Cache invalidation

The similarity matrix is invalidated immediately when a new paid order is recorded, so the next recommendation request reflects the latest order history.

- **Mechanism**: `pre_save` + `post_save` signal pair on `Order` in `apps/orders/signals.py`
- **Trigger condition**: `payment_status` genuinely transitions to `'paid'` — not on every `Order.save()`
- **Action**: `cache.delete('campuseats_item_similarity_matrix')` — invalidate only, never recompute synchronously
- **Next request**: rebuilds the matrix from current `OrderItem` data and re-caches with a fresh 10-min TTL

---

## Seed Data

The `seed_data` management command seeds the backend DB with all 72 real SIES GST canteen items, matching the frontend fixture exactly:

```bash
# First-time setup (creates 72 items, 1 admin user, today's slots)
python -m django seed_data --settings=campuseats.settings

# Wipe and re-seed (useful during development)
python -m django seed_data --reset --settings=campuseats.settings
```

Expected output:
```
Existing data cleared.
Menu: 72 items created (72 total)
Staff user created: admin@sies.edu.in / admin123
Slots: 36 created for YYYY-MM-DD
Seed complete!
```

---

## Browser Notifications (Student)

When an order status transitions to `ready`, the student receives a native browser push notification alongside the in-app ready banner.

- **Permission**: requested once, lazily, when the Order Status page loads (not on app start)
- **Trigger**: fires on both the real WebSocket `status_update` message and the mock status simulator button
- **Deduplication**: `tag: 'campus-eats-order-N'` prevents duplicate toasts for the same token
- **Graceful degradation**: full no-op if `Notification` API is absent (Safari iOS), permission is denied, or the constructor throws
- **No backend dependency**: frontend-only, no FCM/APNs, no new npm packages

---

## Scroll-Film Homepage

`frontend/public/home.html` — a standalone cinematic scroll-film landing page. Completely isolated from the React SPA (zero React, zero build step, zero shared state). Served as a static file by Vite at `/home.html`.

### Architecture

| Component | Detail |
|-----------|--------|
| Engine | 1400vh sticky `#film-stage`, scroll progress → RAF loop → opacity/transform |
| Fonts | Syne 900 (Hinglish display beats) + Inter (body) |
| Accent | `#C0392B` — pulled from the red menu-board header in the real canteen photo |
| Assets | `/canteen-hero.jpg` (static hero) + `/canteen-clip.mp4` (scrubbed via `<video currentTime>`) |
| Video scrub | No frame-slicing — native `<video>` seek; capped at `max-width: 848px` (source native res) |
| Isolation | `App.jsx`, `main.jsx`, `index.html` zero-diffed — all React routes intact |

### Scroll sequence

| Scroll % | Content |
|----------|---------|
| 0% | **Beat 1** — "Dear कष्टmer, ab khaane ke liye कष्ट nahi, bas click karo." |
| ~13% | **Beat 2** — "kyunki aapka order queue mein hai. 'Aap' nahi." |
| ~28% | **Beat 3** — 4 staggered lines: Bhookh lagi thi → Canteen gaye → Queue dekhi → Phir technology invent kar di |
| ~40% | **Beat 4** — Wry punchline footnote (italic, smaller weight) |
| ~53% | **Hero photo** — canteen counter fades in, SIES label overlay |
| ~70% | **Video chapter** — canteen clip scrubbed with vignette mask |
| 100%+ | **Brand page** — manifesto, 4-step How-It-Works (Hinglish), 8-item menu, Why We Built This, CTA, footer |

### To activate the hero photo

```bash
# Drop the canteen counter photo into public/ — no code change needed
copy <your-photo-path> frontend/public/canteen-hero.jpg
```

---

## Testing

```bash
# All order tests (refund + recommendations + cache invalidation) — 27 tests total
python -m django test apps.orders --settings=campuseats.settings

# Refund signal tests only (14 tests)
python -m django test apps.orders.tests.test_refund --settings=campuseats.settings -v 2

# Recommendation + cache-invalidation tests only (13 tests)
python -m django test apps.orders.tests.test_recommendations --settings=campuseats.settings -v 2
```

Recommendation tests cover: co-occurrence count correctness, similarity value range `[0, 1]`, correct top-N ranking (B ranked above C when B co-occurs 10× vs C 2×), below-threshold fallback, new-item cold-start fallback, cart-item exclusion, unavailable-item exclusion, empty-cart fallback, below-threshold cart fallback.  
Cache-invalidation tests cover: cache deleted when `payment_status` transitions `pending→paid`; cache NOT deleted when `status` transitions `placed→preparing` (payment_status unchanged).

---

## Backlog (not built)

- Push notifications (FCM/APNs) for order-ready on iOS/Android native apps
- Order rating / feedback system
- Multiple canteen locations
- Loyalty points / rewards
- UPI deep-links alongside Razorpay
