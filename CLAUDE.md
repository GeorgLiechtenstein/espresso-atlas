# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (localhost:5173)
npm run build      # Production build → dist/
npm run preview    # Preview production build locally (add -- --host for LAN/mobile)
```

No test runner is configured. Verify changes by running `npm run build` (catches JSX/import errors) and testing in the browser.

## Tech Stack

- **React** 18.3 + **Vite** 6.0 — JSX only, no TypeScript, no PropTypes
- **Tailwind CSS** 3.4 — custom colors: `coffee`, `ink`, `surface`, `border`, `score-*`
- **React Router** 6.28 — `BrowserRouter` with `v7_startTransition` + `v7_relativeSplatPath` future flags
- **Supabase JS** 2.45 — PostgreSQL, Auth, Storage, RLS
- **Leaflet** 1.9 — map tiles, custom `divIcon` markers (NOT react-leaflet)
- **Nominatim** (OpenStreetMap) — address autocomplete + reverse geocoding in ReviewPage

## Architecture

### Routing (App.jsx)

```
/               → HomePage    (map + bottom sheet + list/index tab)
/venue/:id      → VenuePage   (detail)
/review         → ReviewPage  (new venue)
/review/:id     → ReviewPage  (edit existing venue)
/login          → LoginPage
/about          → AboutPage
```

`LangProvider` wraps `AuthProvider` wraps `Routes`. Both contexts are available everywhere.

### State flow

- **Venues**: fetched once in `HomePage` via Supabase, kept in state, real-time updates via `supabase.channel`. Passed as props to `MapComponent` and the list panel.
- **Auth**: `AuthContext` exposes `{ user, loading }` from `supabase.auth.getSession()` + `onAuthStateChange`.
- **Language**: `LangContext` exposes `{ lang, setLang }`, persisted to `localStorage('ea_lang')`.

### Map stacking context (critical)

`MapComponent` is wrapped in `<div className="absolute inset-0 z-0">` in HomePage. This creates an isolated stacking context that contains Leaflet's internal panes (z-600, z-700). Without `z-0` on the wrapper, Leaflet panes would bleed into the root stacking context and block nav/FAB clicks.

Z-index hierarchy: map(0) → header(400) → FAB(450) → backdrop(460) → sheet(470) → nav(500)

### MapComponent internals

Uses vanilla Leaflet (not react-leaflet). Map is initialized once via `useEffect([], [])`. Markers are synced via a second `useEffect([venues])` that diffs against `markersRef.current`. The `pinClickRef` pattern (a ref holding the latest `onPinClick` callback) prevents stale closures in Leaflet event handlers.

**Pin color system** — 4 buckets, defined inline in `MapComponent` via `pinBucket(score)`:
- Exzellent (≥ 8.5): fill `#1a1714` (ink), white text
- Gut (≥ 7.0): fill `#6B4A2A` (coffee), white text
- Mittel (≥ 4.0): hollow — `#F7F3EC` fill, `#8a7a62` stroke, dark text
- Meiden (< 4.0): fill `#8B2A2A` (avoid), white text

The same bucket logic is duplicated in `BottomSheet.jsx` and `VenuePage.jsx` (as local `bucket()` helpers) to keep components self-contained.

## Supabase Schema (`venues` table)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | auto `gen_random_uuid()` |
| name, city, country | text | |
| address | text | from Nominatim |
| lat, lng | numeric | |
| body, balance, crema, overall | smallint 1–10 | CHECK BETWEEN 1 AND 10 |
| avg_score | numeric | trigger-computed: `ROUND((body+balance+crema+overall)/4.0, 2)` |
| ceramic_cup | boolean | optional, not in score |
| roastery, comment | text | optional |
| price | decimal(6,2) | |
| currency | text | default `'EUR'` |
| photo_url | text | Supabase Storage bucket `review-photos` |
| rated_at | timestamptz | |
| created_at | timestamptz | default `now()` |

**Trigger:** `compute_venue_avg_score()` — BEFORE INSERT OR UPDATE.

**RLS:** anon `SELECT` allowed; authenticated `UPDATE` allowed. INSERT policy is missing (open task).

## Design System

### Colors (tailwind.config.js)

```
surface: #F7F3EC   warm cream background
coffee:  #6B4A2A   brown accent, active elements, bars
ink:     #1a1714   deep near-black text
border:  #E0D8CC   warm gray dividers
score.avoid: #8B2A2A  dark red for "meiden" bucket
```

### Typography

- `font-serif` → DM Serif Display (loaded from Google Fonts)
- `font-sans` → DM Sans (loaded from Google Fonts)
- Caps labels: font-sans, `letter-spacing: 1.5–2px`, color `#8a837e`

### Inline styles vs Tailwind

Tailwind for structural/layout classes. Inline styles for: dynamic values (transforms, safe-area padding), design-system values not in Tailwind config (e.g. `#8a837e`, `#4a4340`, `rgba(26,23,20,0.10)`), and the editorial design elements (large serif sizes, letter-spacing).

## i18n

All UI strings live in `src/lib/i18n.js` as `tr.de` / `tr.en`. Components do `const tr = t(lang)`. Score labels use `scoreLabel(score, lang)` (thresholds: ≤4 bad, <7 mediocre, ≤8 good, >8 excellent). German text uses `ss` not `ß`.

## Key Patterns

**ReviewPage autocomplete:** `locJustSelected` ref prevents Nominatim re-firing after user selects a suggestion. `onMouseDown={(e) => e.preventDefault()}` on suggestion items prevents input blur eating the tap.

**After save:** `navigate('/venue/...', { replace: true })` — replaces the form in history so the back button doesn't return to the form.

**VenuePage "Wiederkommen?":** Inferred from `venue.overall >= 7` (no separate DB column). The `overall` sub-score IS the "Würde ich wiederkommen?" criterion.

## Deployment

- **Netlify** auto-deploys from `main` branch of `github.com/GeorgLiechtenstein/espresso-atlas`
- Build command: `npm run build`, publish directory: `dist`
- Env vars in Netlify: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- git root: `~/Desktop/Projects/Espresso`

## Open Tasks

- Remove unused legacy files: `StarInput.jsx`, `Stars.jsx`, `ReviewCard.jsx`, `MapPicker.jsx`
- Add Supabase INSERT RLS policy for authenticated users
- Google Maps links currently use name+city string — could use `lat`/`lng` for precision
- `ScoreBadge` still uses old `scoreColor()` (red/amber/green/gold) — could align with the new 4-bucket palette used in MapComponent/BottomSheet/VenuePage
