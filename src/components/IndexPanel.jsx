import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { t } from '../lib/i18n';
import LangToggle from './LangToggle';
import CupLogo from './CupLogo';
import { BUCKETS, scoreBucket } from '../design-tokens';
import { normalizeCountry } from '../lib/countries';
import { venueCity } from '../lib/localize';

// Filled score badge colour — matches the map pin fills via design tokens.
function bucketFill(score) {
  const key = scoreBucket(score);
  return key ? BUCKETS[key].fill : '#9CA3AF';
}

function Pill({ label, open, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 12px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 500,
        fontFamily: '"DM Sans", system-ui, sans-serif',
        // Open: filled brown, slightly heavier outline to read as a chip.
        // Closed: hairline border — 0.5px renders as a single device pixel
        // on retina, falls back to 1px elsewhere.
        border: open ? '1.5px solid #6F4E37' : '0.5px solid rgba(26,23,20,0.25)',
        background: open ? '#6F4E37' : 'transparent',
        color:      open ? '#FAF0E6'  : '#4a4340',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        flexShrink: 0,
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
      }}
    >
      {label}
      <span style={{ fontSize: 8, opacity: 0.85 }}>{open ? '▲' : '▼'}</span>
    </button>
  );
}

function DropdownCard({ title, children }) {
  return (
    <div className="shrink-0" style={{
      margin: '4px 16px 12px',
      background: '#FAF0E6',
      border: '1px solid rgba(26,23,20,0.08)',
      borderRadius: 16,
      boxShadow: '0 6px 20px rgba(0,0,0,0.10)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px 10px',
        fontSize: 10, fontWeight: 700, letterSpacing: '2px',
        textTransform: 'uppercase', color: '#888888',
        fontFamily: '"DM Sans", system-ui, sans-serif',
        borderBottom: '1px solid rgba(26,23,20,0.06)',
      }}>{title}</div>
      {children}
    </div>
  );
}

function DropdownOption({ selected, label, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', textAlign: 'left',
        padding: '12px 16px',
        background: 'none', border: 'none',
        borderBottom: '1px solid rgba(26,23,20,0.04)',
        cursor: 'pointer',
        fontSize: 14, color: '#1a1714',
        fontFamily: '"DM Sans", system-ui, sans-serif',
        fontWeight: selected ? 600 : 400,
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: '50%',
        border: selected ? '1.5px solid #6F4E37' : '1.5px solid rgba(26,23,20,0.25)',
        background: selected ? '#6F4E37' : 'transparent',
        flexShrink: 0,
        position: 'relative',
        transition: 'background 0.15s, border-color 0.15s',
      }}>
        {selected && (
          <span style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 7, height: 7, borderRadius: '50%',
            background: '#FFFFFF',
          }} />
        )}
      </span>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {count != null && (
        <span style={{ color: '#888888', fontSize: 12, flexShrink: 0 }}>{count}</span>
      )}
    </button>
  );
}

export default function IndexPanel({
  venues, isOpen,
  country = '', setCountry = () => {},
  city    = '', setCity    = () => {},
}) {
  const navigate  = useNavigate();
  const { lang }  = useLang();
  const tr        = t(lang);

  const [scoreFilter,  setScoreFilter]  = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [openFilter,   setOpenFilter]   = useState(null);
  const [citySearch,   setCitySearch]   = useState('');

  // Close any open dropdown when the panel is hidden — clean state next time.
  useEffect(() => { if (!isOpen) setOpenFilter(null); }, [isOpen]);

  // Cities depend on the active country filter — picking 'Vereinigtes
  // Königreich' should narrow the city dropdown to UK cities only.
  // The canonical key is `v.city` (German); we also collect `city_en`
  // per canonical so the dropdown can show 'Edinburgh' instead of
  // 'Edinburg' in EN mode while still filtering on the canonical value.
  const cities = useMemo(() => {
    const source = country ? venues.filter((v) => v.country === country) : venues;
    const meta = {};
    source.forEach((v) => {
      if (!v.city) return;
      if (!meta[v.city]) meta[v.city] = { count: 0, en: v.city_en || '' };
      meta[v.city].count += 1;
      if (!meta[v.city].en && v.city_en) meta[v.city].en = v.city_en;
    });
    return Object.entries(meta)
      .map(([canonical, m]) => ({ canonical, en: m.en, count: m.count }))
      .sort((a, b) => b.count - a.count);
  }, [venues, country]);

  // Localised display label for a canonical city key.
  function cityDisplay(canonical) {
    if (!canonical) return '';
    if (lang !== 'en') return canonical;
    const hit = cities.find((c) => c.canonical === canonical);
    return hit?.en || canonical;
  }

  // Localised display label for a canonical country key (which is the
  // German name as stored on `venues.country`).
  function countryDisplay(canonical) {
    if (!canonical) return '';
    const n = normalizeCountry(canonical);
    if (!n) return canonical;
    return lang === 'en' ? n.en : n.de;
  }

  const cityScopeCount = useMemo(() => (
    country ? venues.filter((v) => v.country === country).length : venues.length
  ), [venues, country]);

  // Reset city filter if it no longer matches anything in the active country.
  useEffect(() => {
    if (city && !cities.some((c) => c.canonical === city)) {
      setCity('');
    }
  }, [cities, city, setCity]);

  const countries = useMemo(() => {
    const counts = {};
    venues.forEach((v) => { if (v.country) counts[v.country] = (counts[v.country] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [venues]);

  const filtered = useMemo(() => {
    let list = [...venues];
    if (country)
      list = list.filter((v) => v.country === country);
    if (city)
      list = list.filter((v) => v.city === city);
    if (scoreFilter !== 'all') {
      if (scoreFilter === 'excellent') list = list.filter((v) => v.avg_score != null && parseFloat(v.avg_score) >= 8.5);
      else if (scoreFilter === 'good') list = list.filter((v) => v.avg_score != null && parseFloat(v.avg_score) >= 7 && parseFloat(v.avg_score) < 8.5);
      else if (scoreFilter === 'meh')  list = list.filter((v) => v.avg_score != null && parseFloat(v.avg_score) >= 4 && parseFloat(v.avg_score) < 7);
      else if (scoreFilter === 'avoid')list = list.filter((v) => v.avg_score != null && parseFloat(v.avg_score) < 4);
    }
    if (periodFilter !== 'all') {
      const now = new Date();
      let from, to;
      if (periodFilter === 'thisYear')     { from = new Date(now.getFullYear(), 0, 1); }
      else if (periodFilter === 'lastYear'){ from = new Date(now.getFullYear() - 1, 0, 1); to = new Date(now.getFullYear(), 0, 1); }
      else if (periodFilter === 'last3Months') { from = new Date(now.getFullYear(), now.getMonth() - 3, 1); }
      list = list.filter((v) => {
        if (!v.rated_at) return false;
        const d = new Date(v.rated_at);
        if (from && d < from) return false;
        if (to && d >= to) return false;
        return true;
      });
    }
    list.sort((a, b) => (parseFloat(b.avg_score) || 0) - (parseFloat(a.avg_score) || 0));
    return list;
  }, [venues, country, city, scoreFilter, periodFilter]);

  const scoreLabels = {
    excellent: lang === 'de' ? 'Exzellent' : 'Excellent',
    good:      lang === 'de' ? 'Gut'       : 'Good',
    meh:       lang === 'de' ? 'Mittel'    : 'Mediocre',
    avoid:     lang === 'de' ? 'Meiden'    : 'Avoid',
  };
  const periodLabels = {
    thisYear:    tr.periodThisYear,
    lastYear:    tr.periodLastYear,
    last3Months: tr.periodLast3Months,
  };

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{
        zIndex: 420,
        background: '#FAF0E6',
        transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        pointerEvents: isOpen ? 'auto' : 'none',
        paddingBottom: 'calc(64px + env(safe-area-inset-bottom))',
        maxWidth: '100vw', overflowX: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div
        className="shrink-0"
        style={{
          background: '#FAF0E6',
          borderBottom: '1px solid #E0D8CC',
          paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
          paddingBottom: 14,
          paddingLeft: 20,
          paddingRight: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CupLogo />
          <span
            onClick={() => {
              try {
                sessionStorage.removeItem('ea_last_venue');
                sessionStorage.removeItem('ea_last_tab');
                sessionStorage.setItem('ea_reset_map', '1');
              } catch {}
              navigate('/?tab=map');
            }}
            style={{
              fontFamily: '"DM Serif Display", Georgia, serif',
              fontSize: 19, fontWeight: 400, color: '#1a1714', lineHeight: 1.1,
              cursor: 'pointer',
            }}
          >
            Espresso Atlas
          </span>
        </div>
        <LangToggle />
      </div>

      {/* ── Filter pills ── */}
      <div
        className="shrink-0"
        style={{
          padding: '10px 16px 10px',
          display: 'flex', gap: 8,
          overflowX: 'auto',
          borderBottom: '1px solid rgba(26,23,20,0.07)',
        }}
      >
        <Pill
          label={!country ? tr.filterCountry : countryDisplay(country)}
          open={openFilter === 'country'}
          onClick={() => setOpenFilter((p) => p === 'country' ? null : 'country')}
        />
        <Pill
          label={!city ? tr.filterCity : cityDisplay(city)}
          open={openFilter === 'city'}
          onClick={() => { setOpenFilter((p) => p === 'city' ? null : 'city'); setCitySearch(''); }}
        />
        <Pill
          label={scoreFilter === 'all' ? tr.filterScore : scoreLabels[scoreFilter]}
          open={openFilter === 'score'}
          onClick={() => setOpenFilter((p) => p === 'score' ? null : 'score')}
        />
        <Pill
          label={periodFilter === 'all' ? tr.filterPeriod : periodLabels[periodFilter]}
          open={openFilter === 'period'}
          onClick={() => setOpenFilter((p) => p === 'period' ? null : 'period')}
        />
      </div>

      {/* ── Dropdowns ── */}
      {openFilter === 'country' && (
        <DropdownCard title={tr.filterByCountry}>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            <DropdownOption
              selected={!country}
              label={tr.allCountries}
              count={venues.length}
              onClick={() => { setCountry(''); setOpenFilter(null); }}
            />
            {countries.map(([c, n]) => (
              <DropdownOption
                key={c}
                selected={country === c}
                label={countryDisplay(c)}
                count={n}
                onClick={() => { setCountry(c); setOpenFilter(null); }}
              />
            ))}
          </div>
        </DropdownCard>
      )}

      {openFilter === 'city' && (
        <DropdownCard title={tr.filterByCity}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(26,23,20,0.06)' }}>
            <input
              autoFocus
              type="text"
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              placeholder={lang === 'de' ? 'Stadt suchen…' : 'Search city…'}
              style={{
                width: '100%', padding: '8px 12px', fontSize: 13,
                fontFamily: '"DM Sans", system-ui, sans-serif',
                background: 'rgba(26,23,20,0.06)', border: 'none', borderRadius: 8,
                color: '#1a1714', outline: 'none',
              }}
            />
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {(citySearch === '' || tr.allCities.toLowerCase().includes(citySearch.toLowerCase())) && (
              <DropdownOption
                selected={!city}
                label={tr.allCities}
                count={cityScopeCount}
                onClick={() => { setCity(''); setOpenFilter(null); setCitySearch(''); }}
              />
            )}
            {cities
              .filter((c) => {
                const q = citySearch.toLowerCase();
                return c.canonical.toLowerCase().includes(q)
                    || (c.en && c.en.toLowerCase().includes(q));
              })
              .map((c) => (
                <DropdownOption
                  key={c.canonical}
                  selected={city === c.canonical}
                  label={lang === 'en' ? (c.en || c.canonical) : c.canonical}
                  count={c.count}
                  onClick={() => { setCity(c.canonical); setOpenFilter(null); setCitySearch(''); }}
                />
              ))}
          </div>
        </DropdownCard>
      )}

      {openFilter === 'score' && (
        <DropdownCard title={tr.filterByScore}>
          {[
            { key: 'all',       label: tr.allScores },
            { key: 'excellent', label: lang === 'de' ? 'Exzellent ≥ 8.5' : 'Excellent ≥ 8.5' },
            { key: 'good',      label: lang === 'de' ? 'Gut ≥ 7.0'       : 'Good ≥ 7.0' },
            { key: 'meh',       label: lang === 'de' ? 'Mittel ≥ 4.0'    : 'Mediocre ≥ 4.0' },
            { key: 'avoid',     label: lang === 'de' ? 'Meiden < 4.0'    : 'Avoid < 4.0' },
          ].map(({ key, label }) => (
            <DropdownOption
              key={key}
              selected={scoreFilter === key}
              label={label}
              onClick={() => { setScoreFilter(key); setOpenFilter(null); }}
            />
          ))}
        </DropdownCard>
      )}

      {openFilter === 'period' && (
        <DropdownCard title={tr.filterByPeriod}>
          {[
            { key: 'all',         label: tr.allTime },
            { key: 'thisYear',    label: tr.periodThisYear },
            { key: 'lastYear',    label: tr.periodLastYear },
            { key: 'last3Months', label: tr.periodLast3Months },
          ].map(({ key, label }) => (
            <DropdownOption
              key={key}
              selected={periodFilter === key}
              label={label}
              onClick={() => { setPeriodFilter(key); setOpenFilter(null); }}
            />
          ))}
        </DropdownCard>
      )}

      {/* ── List ── */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: '#555555', fontSize: 14, padding: '48px 0', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
            {lang === 'de' ? 'Keine Einträge.' : 'No entries.'}
          </p>
        )}
        {filtered.map((venue) => {
          const score   = venue.avg_score != null ? parseFloat(venue.avg_score) : null;
          const fill    = bucketFill(score);
          const dateStr = venue.rated_at
            ? new Date(venue.rated_at).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { month: 'long', year: 'numeric' })
            : '';
          const venueComment = (lang === 'de' ? venue.comment_de : venue.comment_en)
                            || venue.comment_de || venue.comment_en || venue.comment;
          return (
            <button
              key={venue.id}
              onClick={() => {
                try { sessionStorage.setItem('ea_last_tab', 'index'); } catch {}
                navigate(`/venue/${venue.id}`);
              }}
              style={{
                width: '100%', textAlign: 'left',
                padding: '14px 20px',
                display: 'flex', alignItems: 'flex-start', gap: 14,
                background: 'none', border: 'none',
                borderBottom: '1px solid rgba(26,23,20,0.07)',
                cursor: 'pointer',
              }}
            >
              {/* Score badge — filled, white text, same fills as map pins */}
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: fill,
                border: '2px solid rgba(255,255,255,0.25)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                flexShrink: 0, marginTop: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  color: '#FFFFFF', fontSize: 14, fontWeight: 700,
                  fontFamily: '"DM Serif Display", Georgia, serif', lineHeight: 1,
                }}>
                  {score != null ? score.toFixed(1) : '—'}
                </span>
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontFamily: '"DM Serif Display", Georgia, serif',
                  fontSize: 17, fontWeight: 400, color: '#1a1714',
                  lineHeight: 1.2, marginBottom: 3,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{venue.name}</p>
                <p style={{
                  fontSize: 12, color: '#555555', marginBottom: venueComment ? 5 : 0,
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                }}>
                  {venueCity(venue, lang)}{dateStr ? ` · ${dateStr}` : ''}
                </p>
                {venueComment && (
                  <p style={{
                    fontFamily: '"DM Serif Display", Georgia, serif',
                    fontStyle: 'italic', fontSize: 13, color: '#6B5B4E', lineHeight: 1.4,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>„{venueComment}"</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
