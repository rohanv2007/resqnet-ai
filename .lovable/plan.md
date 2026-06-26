## What's in the GitHub repo

Your `ResQNet` repo is a **Next.js 16 + App Router** app with ~14 pages and a lot of moving parts:

- **Auth pages**: login, register, forgot/reset password, OTP verify, role selection, onboarding
- **Dashboard pages**: overview, alerts, evacuation, reports, resources, risk-map, settings, simulation
- **Layouts/components**: Sidebar, Topbar, MobileNav, DashboardGuard, PageHeader, ThemeToggle
- **Feature components**: AlertCard, DisasterRiskCard, RiskScoreCard, RiskTrendChart, StatCard, DashboardWidgetGrid, LeafletMap/MapView, plus shared bits (RiskBadge, ConfidenceBar, etc.)
- **Full shadcn/ui set** (~25 components)
- **Libs**: auth-context/auth-service, hooks (useAuth, useLocation, useRiskData, useWidgetLayout), mock-data for alerts/reports/resources/risk-scores/shelters/simulation/locations
- **Deps**: Leaflet + react-leaflet, recharts, dnd-kit, framer-motion, react-hook-form + zod, next-themes, sonner, cmdk

This project is **TanStack Start**, not Next.js. I can't just copy files — Next-specific things (`src/app/` routing, route groups like `(auth)`/`(dashboard)`, `next/link`, `next/navigation`, `next/image`, `next/font`, server components, `metadata` exports) all have to be converted.

## Plan

### 1. Install dependencies
Add: `@base-ui/react`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@hookform/resolvers`, `@types/leaflet`, `class-variance-authority`, `cmdk`, `date-fns`, `framer-motion`, `leaflet`, `react-leaflet`, `next-themes`, `recharts`, `react-hook-form`, `sonner`, `tw-animate-css`, `zod`. (clsx / tailwind-merge / lucide-react are usually already present.)

### 2. Copy 1:1 (no changes needed)
- `src/components/ui/*` (all shadcn primitives)
- `src/components/shared/*`
- `src/lib/utils.ts`, `src/lib/labels.ts`, `src/lib/mock-data/*`, `src/types/*`
- `src/components/dashboard/*` (charts, cards)
- Hooks that don't touch Next APIs

### 3. Convert routing (`src/app/` → `src/routes/`)
| Next route | TanStack route file |
|---|---|
| `app/page.tsx` | `routes/index.tsx` |
| `app/(auth)/login/page.tsx` | `routes/login.tsx` |
| `app/(auth)/register/page.tsx` | `routes/register.tsx` |
| `app/(auth)/forgot-password/page.tsx` | `routes/forgot-password.tsx` |
| `app/(auth)/reset-password/page.tsx` | `routes/reset-password.tsx` |
| `app/(auth)/verify-otp/page.tsx` | `routes/verify-otp.tsx` |
| `app/(auth)/role-selection/page.tsx` | `routes/role-selection.tsx` |
| `app/(auth)/onboarding/page.tsx` | `routes/onboarding.tsx` |
| `app/(dashboard)/layout.tsx` | `routes/_dashboard.tsx` (layout with `<Outlet/>`, Sidebar + Topbar) |
| `app/(dashboard)/overview/page.tsx` | `routes/_dashboard.overview.tsx` |
| …same for alerts, evacuation, reports, resources, risk-map, settings, simulation | … |

### 4. Code rewrites
- `next/link` → `@tanstack/react-router` `Link`
- `next/navigation` (`useRouter`, `usePathname`, `redirect`) → TanStack equivalents (`useNavigate`, `useRouterState`)
- `next/image` → plain `<img>` (or keep simple)
- Remove `"use client"` directives
- Replace `next-themes` `ThemeProvider` wiring (works fine, just plug into `__root.tsx`)
- Auth context/guard: keep as a client-side context wrapping the dashboard layout
- Leaflet: render only on client (`useEffect` mount guard) to avoid SSR `window` errors

### 5. Styles
- Merge `app/globals.css` theme tokens into `src/styles.css` (Tailwind v4 syntax already matches)
- Bring across the design tokens / dark mode variables

### 6. Root + wiring
- Update `src/routes/__root.tsx` to include `ThemeProvider`, `AuthProvider`, `Toaster` (sonner), Leaflet CSS link
- Wire `src/routes/index.tsx` to redirect to `/overview` (or render landing) like the original

### 7. Verify
- Build passes, no unresolved imports
- Visit `/overview` and a couple of auth routes in the preview

## Notes / honest caveats

- This is a **large port** (~70 files). I'll batch the work but it will take several steps.
- Backend auth currently calls a mock service in the repo — I'll keep it client-only (no real backend) unless you ask me to wire it to Lovable Cloud.
- I will NOT change UI/styling — pixel output should match the original.

Approve and I'll start executing.