# ResQNet Backend

The full ResQNet backend is now live **inside this TanStack Start project** on Lovable Cloud — no separate Python deploy needed.

## Architecture

```
Browser (TanStack Start UI)
        │
        ├─ TanStack Server Functions  ← all backend lives here
        │      │
        │      ├─ Open-Meteo  (weather, forecast, 24h rainfall)         [real, no key]
        │      ├─ NASA FIRMS  (VIIRS_SNPP_NRT hotspots)                 [real, MAP_KEY required]
        │      ├─ OSRM         (OpenStreetMap routing, evacuation)     [real, no key]
        │      ├─ Bhashini-ready translator (template fallback)         [real fallback, key optional]
        │      └─ Telegram Bot (real broadcasts via connector gateway)  [real]
        │
        └─ Lovable Cloud (Postgres + Auth + RLS)
               profiles · user_roles (RBAC) · locations · shelters
               citizen_reports · alerts · alert_deliveries
               weather_snapshots · fire_hotspots · risk_scores
               simulation_runs · resources · evacuation_routes · road_status
```

## What is real vs mock

| Capability | Status | Source |
|---|---|---|
| Weather + 3-day forecast | **real** | Open-Meteo (https://open-meteo.com) |
| Active fire hotspots | **real** | NASA FIRMS VIIRS_SNPP_NRT |
| Evacuation routing | **real** | OSRM public demo (`router.project-osrm.org`) with straight-line fallback |
| Hyperlocal risk score | **real** | Rules + signal-fusion model in `src/lib/resq/risk-core.ts` |
| Citizen reports | **real** | Lovable Cloud table `citizen_reports` with RLS |
| Alert drafting + approval | **real** | Lovable Cloud, role-gated |
| Telegram broadcast | **real** | Connector gateway (`connector-gateway.lovable.dev/telegram`) |
| SMS / WhatsApp / IVR / Push | **mocked** (recorded in `alert_deliveries`) | Needs Twilio/Firebase if you want real delivery |
| Translation | **real fallback** (template) | Drop in `BHASHINI_API_KEY` later for ML translation |
| Simulation engine | **real** | TS implementation in `src/lib/simulation.functions.ts` |

## Roles & access (stored in `user_roles`, NOT on the profile)

- `citizen` — submit reports, view alerts/shelters/routes, see risk
- `authority` — verify reports, draft + approve alerts, run simulations, manage shelters
- `ngo` — verify reports, manage shelters/resources
- `admin` — everything

A new signup gets `citizen` automatically. To grant yourself authority for the
demo, open **Cloud → Tables → user_roles** and add a row:
`user_id = <your auth uid>, role = 'authority'`.

## Server function map (`src/lib/*.functions.ts`)

| File | Functions |
|---|---|
| `weather.functions.ts` | `getWeather` |
| `firms.functions.ts` | `getFireHotspots` |
| `risk.functions.ts` | `predictRisk` |
| `routing.functions.ts` | `getEvacuationRoute`, `getNearbyShelters` |
| `simulation.functions.ts` | `runSimulation`, `listSimulations` |
| `reports.functions.ts` | `createReport`, `listReports`, `updateReportStatus` |
| `alerts.functions.ts` | `draftAlert`, `approveAlert`, `sendAlert`, `listAlerts` |
| `dashboard.functions.ts` | `getDashboardSummary` |
| `shelters.functions.ts` | `listShelters`, `listResources` |
| `translate.functions.ts` | `translateText` |

## See it live

Open **/live** in the dashboard sidebar — every panel hits a real backend function.

## Human-in-the-loop alerts

`draftAlert` flags `severity = "danger"` as `pending_approval`. Use `approveAlert` then `sendAlert` to broadcast. Non-danger alerts auto-approve.

## Configured secrets

- `NASA_FIRMS_MAP_KEY` ✅ (set)
- `TELEGRAM_API_KEY` ✅ (via Lovable connector)
- `LOVABLE_API_KEY` ✅ (managed)
- `BHASHINI_API_KEY` — optional, drop in later for real Indic translation
- `TELEGRAM_DEFAULT_CHAT_ID` — optional, used when alert sender doesn't pass one

## Known limitations

- OSRM public demo is rate-limited; for production, self-host or use GraphHopper.
- Earthquake risk is placeholder (no live seismic feed wired).
- Population density factor is approximated from `locations.population`.
- SMS/IVR/WhatsApp use mock delivery records — wire Twilio/FCM when ready.
