# PROGRESS.md — CampusEats (SIES GST Canteen)

**Last updated:** 2026-08-27  
**Current phase:** Complete — scroll-film marketing homepage shipped

---

## Phase Summary

| Phase | Status |
|-------|--------|
| Phase 1 — React SPA on mock data | ✅ Done |
| Phase 2 — Real Django backend | ✅ Done |
| Phase 3 — Admin hardening + refund edge case | ✅ Done (14/14 tests pass) |
| Final — README, .gitignore, .env.example | ✅ Done |
| Polish — 72-item menu + visual redesign | ✅ Done |
| Insights — Admin data-analysis module | ✅ Done |
| Recommendations — Item similarity engine | ✅ Done (11/11 tests pass) |
| Backlog close-out — seed parity, cache invalidation, notifications | ✅ Done (27/27 tests pass) |
| Scroll-film homepage — `home.html` cinematic landing page | ✅ Done |

---

## Completed Tasks

### Phase 1 — Frontend (Mock Data)
- [x] Vite + React 18 scaffold in `frontend/`
- [x] Design tokens (`design-tokens.css`) — dark mode, `#FF6B35` orange primary, Baloo 2 + Inter + **Syne** fonts
- [x] MSW v2 + axios-mock-adapter dual-layer mock (works in both browser and Playwright headless)
- [x] 3 Zustand stores: `authStore` (persist + hydration guard), `cartStore`, `wsStore`
- [x] 13 shared components: VegDot, CountdownBadge, NumberFlip, SlotPicker, QRDisplay, CapacityBadge, OrderStatusStepper, ConfettiBurst, StickyNav, CartDrawer, CategoryChipBar, SkeletonCard
- [x] 7 student pages: Login, Hero, Menu, Checkout, OrderStatus, OrderHistory, Register
- [x] 5 admin pages: AdminLogin, Dashboard, KDS, MenuManagement, SlotManagement, QRScanner
- [x] 3 hooks: `useWebSocket` (auto-reconnect + REST re-sync), `useSlotCountdown`, `useCapacity`
- [x] Protected routing (student routes + admin routes), `prefers-reduced-motion` support
- [x] `/dev-login?role=student|staff` bypass route for testing
- [x] `npm run build` → 517 modules, zero errors
- [x] **Exit gate**: browser-subagent screenshots of all 10 screens ✓

### Phase 2 — Django Backend
- [x] Django 6.1 project with 6 apps: `users`, `menu`, `slots`, `orders`, `payments`, `realtime`
- [x] Custom `User` model (AbstractBaseUser) with student/staff/admin roles + `@sies.edu.in` validator
- [x] All models: `MenuItem`, `Slot`, `SlotItemCapacity` (`is_open` property), `Order`, `OrderItem`
- [x] Migrations applied + DB seeded (15 menu items, demo users, 36 slots for today)
- [x] JWT auth views: separate `/auth/student/` and `/auth/staff/` with role claim validation
- [x] Permission classes: `IsStudentUser`, `IsStaffUser`, `IsAdminUser`
- [x] Full REST API: menu CRUD, slots + capacity, order placement with capacity check, QR, scan, bulk-status, payments, dashboard
- [x] HMAC-SHA256 QR tokens for secure pickup verification
- [x] Razorpay order creation + signature verification (mock-safe: skips verify for `pay_mock_*` IDs)
- [x] Django Channels: `StudentOrderConsumer` (per-order WS) + `AdminKDSConsumer` (KDS feed) + JWT WS middleware
- [x] `seed_data` + `create_staff` management commands
- [x] Frontend: `VITE_USE_REAL_API=true` flag to switch from mock to real backend
- [x] **Exit gate**: 14/14 Django tests pass; REST endpoints smoke-tested live

### Phase 3 — Admin Hardening + Refund
- [x] `generate_today` slot bulk action (08:00–17:00, 15-min windows)
- [x] `bulk_status` order action (placed→preparing, preparing→ready per slot)
- [x] Refund signal on `MenuItem.is_available = False` → removes item from affected paid orders → Razorpay partial refund → WS notification
- [x] Refund signal on `SlotItemCapacity.max_units` reduction below `units_booked` → same pipeline
- [x] `test_refund.py` — 14 tests covering refund triggers, permission boundaries, slot open/closed logic
- [x] **Exit gate**: `python manage.py test apps.orders.tests.test_refund` → 14/14 PASS

### Final Files
- [x] `README.md` — setup guide, API reference, project structure, backlog
- [x] `backend/.env.example` — all env vars documented, no secrets committed
- [x] `.gitignore` — covers Python, Django, Node, Vite, OS files
- [x] Backlog logged in README (notifications, multi-canteen, analytics, loyalty points)

### Polish — Menu Overhaul + Visual Redesign (2026-08-19)
- [x] `fixtures.js` — 72 real SIES GST canteen items (extracted from physical menu board)
- [x] Each item: correct price, `ui_category`, `is_today_special`, `emoji`, witty description
- [x] `filterMenuByCategory()` — single shared helper, replaces brittle name-array filters in handlers.js + axiosMock.js
- [x] **Today's Specials** — configurable via `is_today_special` flag per item (default: Misal Pav, Masala Dosa, Cheese Masala Dosa, Schezwan Rice, Cheese Grill Sandwich)
- [x] `CategoryChipBar` — per-category accent colors, count badges, glow active state, auto-scroll to active chip
- [x] `MenuPage` — full redesign: horizontal Zomato-style cards, inline quantity stepper, search bar, Chef's Pick editorial strip, section headers, witty empty states
- [x] `design-tokens.css` — added `Syne` font (`--font-hero`), category color tokens, stronger shadows
- [x] `HeroPage` — editorial Syne headline, updated stats (72+ items, ₹5 starts at)
- [x] `npm run build` → zero errors, 517 modules ✓
- [x] **Exit gate**: browser-subagent verified all 6 category tabs, search, quantity stepper, Chef's Pick strip ✓

### Insights — Admin Data-Analysis Module (2026-08-20)
- [x] `backend/apps/orders/analytics.py` — 6 pure-ORM analysis functions (no side effects, independently testable):
  - `compute_peak_hours` — `ExtractHour` + `Count` on `Order.created_at`
  - `compute_peak_days` — `ExtractIsoWeekDay` + `Count`
  - `compute_cancelled_items` — by unit count and ₹ value lost
  - `compute_revenue_by_category` — `OrderItem × price_at_order`, grouped by `MenuItem.category`
  - `compute_waste_reduction` — `SlotItemCapacity.max_units` vs actual ordered units
  - `compute_wait_time_reduction` — median `updated_at − created_at` for picked-up orders vs 15-min baseline
- [x] `backend/apps/orders/analytics_sample.py` — synthetic dataset for demo / empty-DB fallback
- [x] `InsightsView` — `GET /api/v1/insights/` (Staff-only); `?demo=1` forces sample data
- [x] `InsightsPage.jsx` — admin dashboard tab with Recharts bar/line charts for all 6 metrics
- [x] Mock handlers + axiosMock route for `/insights/`
- [x] **Exit gate**: 25/25 Django tests pass (all existing tests + new); frontend build zero errors ✓

### Recommendations — Item Similarity Engine (2026-08-21)
- [x] `backend/apps/orders/recommendations.py` — full engine:
  - `build_cooccurrence_matrix(order_qs)` — returns `(cooc_df, pivot_df)` tuple; numpy 2.x / pandas 3.x safe
  - `compute_cosine_similarity(pivot)` — cosine similarity from item presence columns (not co-occurrence rows)
  - `_sim_top_n` — top-N with unavailable + cart exclusion
  - `_popularity_fallback` — sitewide or same-category fallback
  - `get_item_recommendations(item_id, ...)` — three-path: cosine → fallback_category → fallback_popularity
  - `get_cart_recommendations(cart_ids, ...)` — aggregates similarity rows across basket
- [x] `ItemRecommendationsView` — `GET /api/v1/recommendations/item/{id}/`; params: `exclude`, `n`
- [x] `CartRecommendationsView` — `GET /api/v1/recommendations/cart/`; params: `ids`, `n`
- [x] 10-minute in-memory cache for similarity matrix (`campuseats_item_similarity_matrix`)
- [x] `test_recommendations.py` — 11 tests (co-occurrence counts, similarity range, ranked order, below-threshold, cold-start, cart exclusion, unavailable exclusion, empty cart)
- [x] `RecommendationStrip.jsx` — compact horizontal scroll strip; inline `−qty+` stepper; `loading` skeleton state; falls back to "Popular picks" label when source ≠ cosine_similarity
- [x] `client.js` — `getItemRecommendations()` + `getCartRecommendations()` helpers
- [x] `handlers.js` + `axiosMock.js` — category-based fallback mock handlers for both endpoints
- [x] `MenuPage.jsx` — `MenuCardWithRecs` wrapper; lazy-fetches via `IntersectionObserver` (fetch only on viewport entry — avoids 72 parallel requests)
- [x] `CheckoutPage.jsx` — cart upsell strip between Order Summary and Slot Picker; re-fetches on cart composition change
- [x] **Critical bug fixed during development**: cosine similarity must use item columns of pivot matrix, not rows of co-occurrence matrix (orthogonal vectors → all-zero similarities otherwise)
- [x] **NumPy 2.x compat fix**: `to_numpy(dtype=float, copy=True)` instead of `.values` for writable array before `np.fill_diagonal`
- [x] **Exit gate**: 25/25 backend tests pass (all apps.orders); frontend `npm run build` → 1092 modules, zero errors ✓

---

### Backlog Close-out (2026-08-26)
- [x] **Seed-data parity** — `backend/apps/menu/management/commands/seed_data.py` ported from 15 → 72 items matching `frontend/src/api/mock/fixtures.js` exactly (names, prices, categories, prep times). `seed_data --reset` verified: `Menu: 72 items created (72 total)`.
- [x] **Recommendation cache invalidation** — `apps/orders/signals.py` now wires a `pre_save` + `post_save` signal pair on `Order`:
  - `_capture_old_payment_status` reads current DB value before save
  - `invalidate_sim_cache_on_paid_order` calls `cache.delete(_CACHE_KEY_SIM)` only when `payment_status` genuinely transitions to `'paid'`
  - Does not recompute synchronously — next API call rebuilds and re-caches
  - 2 new tests verify: (a) cache deleted on paid transition, (b) cache NOT deleted on unrelated `status` update
- [x] **Browser ready-order notification** — `OrderStatusPage.jsx`:
  - `requestNotificationPermission()` called once when order loads (lazy, not on page load)
  - `fireReadyNotification(token)` fires a native `Notification` when `status === 'ready'` via both WS message and mock simulator
  - Guarded with `typeof Notification === 'undefined'` + `Notification.permission !== 'granted'` — no-ops gracefully if API unsupported or user denies
  - Uses `tag` property to prevent duplicate toasts
  - **No backend change, no FCM/APNs, no new dependencies**
- [x] **Exit gate**: `27/27 backend tests pass`; frontend `npm run build` → 1092 modules, exit 0 ✓

---

### Scroll-Film Homepage (2026-08-27)
- [x] **`frontend/public/home.html`** — standalone vanilla HTML+CSS+JS scroll-film landing page. Zero React, zero build step, zero npm dependencies. Served as a static file from Vite's public pass-through at `/home.html`.
- [x] **Film spacer**: 1400vh sticky stage. Scroll progress drives opacity of 6 sequential caption beats + hero photo layer + scrubbed video layer.
- [x] **Beat 1** — `"Dear कष्टmer, ab khaane ke liye कष्ट nahi, bas click karo."` Full opacity at scroll=0. Syne 900 display type, `#C0392B` accent on कष्ट.
- [x] **Beat 2** — `"kyunki aapka order queue mein hai. 'Aap' nahi."` + italic sub-line.
- [x] **Beat 3** — 4 staggered lines `Bhookh lagi thi / Canteen gaye / Queue dekhi / Phir technology invent kar di` each revealing individually via `translateY` + opacity on scroll.
- [x] **Beat 4** — Wry punchline footnote: `"Because standing in a queue doesn't make the food taste better."` Lighter weight italic, badge treatment.
- [x] **Hero photo layer** — `background-image: url('/canteen-hero.jpg')` with top-to-bottom gradient overlay + Beat 5 label "SIES College Canteen / SV Caterers · Nerul Campus".
- [x] **Video chapter** — `<video src="/canteen-clip.mp4">` scrubbed by `currentTime = vP * duration`, contained at `max-width: 848px` (native res, no upscale). Radial vignette mask. Beat 6 chapter label.
- [x] **Brand page below the film**: manifesto → 4-step How It Works (Hinglish step titles) → 8-item menu highlights with prices → "Kyun banaya yeh?" section → CTA `"Pehla order karo →"` → footer.
- [x] **Accent color `#C0392B`** pulled from the red menu-board header in the real canteen photo. Navy `#1a2744` from SV Caterers staff shirts — referenced in token.
- [x] **Copy tone** maintained throughout: Hinglish, no generic English marketing, button copy/step titles/CTA all in brand voice.
- [x] **Scroll progress bar** (2px `#C0392B` at top), sticky nav with `scrolled` glass state, scroll cue arrow, all zero-dependency.
- [x] **Isolation verified**: `App.jsx`, `main.jsx`, `index.html` — zero diff. All React routes and admin dashboard untouched.
- [x] **Assets**: `frontend/public/canteen-clip.mp4` (989 KB, 848×480, 4.3s h.264). `frontend/public/canteen-hero.jpg` → slot reserved; drops in without code change.

---

## Next Task

No blocking tasks remain.

**One pending asset drop:**
- Save the canteen counter photo to `frontend/public/canteen-hero.jpg` — no code change required, `home.html` already references it.

**Optional follow-ups:**
- Re-shoot canteen video at 1080p+ for sharper full-bleed video chapter
- Deploy to Railway / Render for a live demo link (homepage is the entry point; React app lives under same domain)

Run the app:
```bash
# Frontend (mock mode — no backend needed)
cd frontend && npm run dev

# Full stack
cd backend && python -m django runserver 8000 --settings=campuseats.settings
cd frontend && VITE_USE_REAL_API=true npm run dev
```

---

## Key Architectural Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Mock strategy | MSW + axios-mock-adapter (dual-layer) | MSW SW fails in Playwright/headless; axios adapter is env-agnostic fallback |
| Auth | JWT (SimpleJWT) with role claim in token | Stateless; role embedded so frontend can gate routes without extra API call |
| Two separate auth endpoints | `/auth/student/` and `/auth/staff/` | Prevents cross-role login; each validates role server-side |
| Slots as DB rows, not generated on-the-fly | `Slot` model + `seed_data` / `generate_today` | Staff can edit capacities per slot; server is source of truth for cutoff |
| Refund via Django signal, not manual endpoint | `pre_save` on `MenuItem` + `SlotItemCapacity` | Guarantees refund fires automatically on any save path (admin, API, shell) |
| Channel layer | In-memory (dev) / Redis (prod) | No Redis dependency for development; swap via `CHANNEL_LAYERS` setting |
| QR tokens | HMAC-SHA256 truncated to 16 hex chars | Lightweight, no extra DB row; verifiable server-side without storing token separately |
| Frontend ↔ Backend switch | `VITE_USE_REAL_API=true` env flag | Single env var; no code change needed to switch between mock and real backend |
| Two roles only | student / staff (admin is a staff supertype) | Matches spec Section 12 hard boundary; no complex RBAC needed |
| Slot cutoff in fixtures | Generated relative to `now + 30 min` | Ensures demo/test always has open slots regardless of time of day |
| Menu category filtering | `ui_category` field + `filterMenuByCategory()` helper | Single source of truth; adding items to a category requires only setting the field |
| Today's Specials | `is_today_special: boolean` flag in fixture | Configurable without code changes; filtering is data-driven |
| Insights analytics | Pure-ORM functions in `analytics.py`, no pandas | Keeps the analytics module lightweight and DB-portable (SQLite + PostgreSQL) |
| Recommendation granularity | Per-order co-occurrence (not per-user) | Canteen orders are small and frequent; per-order matrix fills faster in a small-scale deployment |
| Cosine similarity source | Item columns of pivot matrix (presence vectors) | Co-occurrence matrix rows are orthogonal — dotting them always yields 0 similarity; pivot columns capture shared ordering patterns correctly |
| Recommendation caching | Django `cache` with 10-min TTL | Similarity matrix is O(n²) in items; recomputing on every request is wasteful; TTL keeps recommendations fresh without Redis dependency in dev |
| Lazy recommendation fetch | `IntersectionObserver` per MenuCard | Avoids 72 parallel API calls on page load; each card fetches its recommendations only when scrolled into view |
| Scroll-film homepage | Standalone `public/home.html` (vanilla, no React) | Completely isolated from the React SPA — no shared router, no shared state, no build step needed; Vite serves it as a static file |
| Homepage video scrub | `<video currentTime>` scrubbing (no frame-slice) | ffmpeg not available on dev machine; native `<video>` seek is sufficient for a 4.3s clip at 848×480 and avoids hundreds of JPEG frames in the bundle |
| Homepage accent color | `#C0392B` (from canteen menu board red) | Pulled from the real canteen photo so design language and photography are visually unified — not a generic food-app color |
