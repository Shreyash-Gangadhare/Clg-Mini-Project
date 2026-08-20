# PROGRESS.md — CampusEats (SIES GST Canteen)

**Last updated:** 2026-08-19  
**Current phase:** Post-launch polish — menu overhaul + visual redesign complete

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

---

## Next Task

No blocking tasks remain. The app is feature-complete for the mini-project scope.

**Optional follow-ups (if needed):**
- Browser-subagent refund edge-case walkthrough (mark item unavailable → verify WS refund event)
- Seed the Django backend's database with the 72 new items (currently frontend-mock only)
- Deploy to Railway / Render for a live demo link

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
