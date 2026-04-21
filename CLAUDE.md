# Espresso Atlas — CLAUDE.md

## Tech Stack
- **React** 18.3 + **Vite** 6.0 (JSX, no TypeScript)
- **Tailwind CSS** 3.4 (custom colors: `coffee`, `ink`, `surface`, `border`, `score-*`)
- **React Router** 6.28 (`BrowserRouter` with `v7_startTransition` + `v7_relativeSplatPath` flags)
- **Supabase JS** 2.45 (PostgreSQL, Auth, Storage, RLS)
- **Leaflet** 1.9 via `react-leaflet` for the map
- **Nominatim** (OpenStreetMap) for address autocomplete + reverse geocoding

## Folder Structure
```
src/
  App.jsx               # Router + LangProvider + AuthProvider
  pages/
    HomePage.jsx        # Map + list panel + BottomSheet
    VenuePage.jsx       # Venue detail page
    ReviewPage.jsx      # Add / edit venue + rating form
    LoginPage.jsx
    AboutPage.jsx
  components/
    BottomSheet.jsx     # Slide-up venue preview (z-470)
    MapComponent.jsx    # Leaflet map (z-0, isolated stacking context)
    NumberPicker.jsx    # 1-10 rating input (replaces StarInput)
    ScoreBadge.jsx      # Circular score badge + scoreColor() + scoreLabel()
    VenueCard.jsx       # List item card
    LangToggle.jsx      # DE/EN toggle button
    StarInput.jsx       # Legacy — no longer used in forms
    Stars.jsx           # Legacy display — no longer used
  context/
    AuthContext.jsx     # Supabase auth session
    LangContext.jsx     # lang state ('de'|'en') persisted in localStorage
  lib/
    i18n.js             # tr object, t(lang), scoreLabel(score, lang)
    supabase.js         # createClient with env vars
supabase/
  migration_merge_reviews.sql   # Merged reviews into venues table
  migration_rename_columns.sql  # optics->body, taste->balance, verdict->overall
  migration_scale_10.sql        # Rating scale 1-5 -> 1-10
  migration_add_address.sql     # Added address TEXT column
```

## Supabase Schema (venues table)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| city, country | text | |
| address | text | Street address from Nominatim |
| lat, lng | numeric | |
| body, balance, crema, overall | smallint 1-10 | Rating sub-scores |
| avg_score | numeric | Auto-computed by BEFORE trigger |
| ceramic_cup | boolean | Optional, not in score |
| roastery, comment | text | Optional |
| price | decimal(6,2) | |
| currency | text | Default EUR |
| photo_url | text | Supabase Storage bucket `review-photos` |
| rated_at | timestamptz | |

**Trigger:** `compute_venue_avg_score()` — BEFORE INSERT OR UPDATE, sets `avg_score = ROUND((body+balance+crema+overall)/4.0, 2)`

**RLS:** anon SELECT allowed, authenticated UPDATE allowed. INSERT policy needed for new venues.

## i18n Approach
- All UI strings in `src/lib/i18n.js` — `tr.de` and `tr.en` objects
- `t(lang)` returns the right object; components destructure it as `const tr = t(lang)`
- `scoreLabel(score, lang)` is a pure function (thresholds: <=4 bad, <7 mediocre, <=8 good, >8 excellent)
- `lang` state lives in `LangContext`, persisted in `localStorage`
- German text uses `ss` not `ss` (no Eszett)

## Coding Conventions
- No TypeScript, no PropTypes — plain JSX
- Tailwind for all styling; avoid inline styles except for dynamic values (z-index, safe-area, transforms)
- Z-index hierarchy: map(0) → header(400) → FAB(450) → backdrop(460) → sheet(470) → nav(500)
- `pinClickRef` pattern in MapComponent for stable Leaflet marker callbacks
- All new rating UI uses `NumberPicker` (1-10); `StarInput` + `Stars` are legacy
- No comments unless the WHY is non-obvious

## Deployment
- **Netlify** auto-deploys from `main` branch of `github.com/GeorgLiechtenstein/espresso-atlas`
- Build: `npm run build`, publish: `dist`
- Env vars in Netlify: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- git root is at `~/Desktop/Projects/Espresso` (not the home directory)

## Open Tasks
- Remove unused `StarInput.jsx`, `Stars.jsx`, `ReviewCard.jsx`, `MapPicker.jsx`
- Add INSERT RLS policy so authenticated users can add new venues
- Supabase migration `migration_scale_10.sql` and `migration_add_address.sql` may still need to be run
- Google Maps link in BottomSheet/VenuePage could use lat/lng for precision
