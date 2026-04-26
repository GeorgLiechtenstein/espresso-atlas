import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { t } from '../lib/i18n';
import LangToggle from './LangToggle';
import CupLogo from './CupLogo';

function bucketTextColor(score) {
  if (score === null || score === undefined) return '#9CA3AF';
  const n = parseFloat(score);
  if (n >= 8.5) return '#1a1714';
  if (n >= 7)   return '#6B4A2A';
  if (n >= 4)   return '#8A7A62';
  return '#8B2A2A';
}

function Pill({ label, active, onClick }) {
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
        border: active ? '1.5px solid #1a1714' : '1px solid rgba(26,23,20,0.18)',
        background: active ? '#1a1714' : 'transparent',
        color: active ? '#FAF0E6' : '#4a4340',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
      }}
    >
      {label}
      <span style={{ fontSize: 9, opacity: 0.55 }}>{active ? '✕' : '▾'}</span>
    </button>
  );
}

export default function IndexPanel({ venues, isOpen }) {
  const navigate  = useNavigate();
  const { lang }  = useLang();
  const tr        = t(lang);

  const [cityFilter,   setCityFilter]   = useState('all');
  const [scoreFilter,  setScoreFilter]  = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [openFilter,   setOpenFilter]   = useState(null);
  const [citySearch,   setCitySearch]   = useState('');

  const cities = useMemo(() => {
    const counts = {};
    venues.forEach((v) => { counts[v.city] = (counts[v.city] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [venues]);

  const filtered = useMemo(() => {
    let list = [...venues];
    if (cityFilter !== 'all')
      list = list.filter((v) => v.city === cityFilter);
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
  }, [venues, cityFilter, scoreFilter, periodFilter]);

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
            onClick={() => navigate('/?tab=map')}
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
          label={cityFilter === 'all' ? tr.filterCity : cityFilter}
          active={cityFilter !== 'all'}
          onClick={() => { setOpenFilter((p) => p === 'city' ? null : 'city'); setCitySearch(''); }}
        />
        <Pill
          label={scoreFilter === 'all' ? tr.filterScore : scoreLabels[scoreFilter]}
          active={scoreFilter !== 'all'}
          onClick={() => setOpenFilter((p) => p === 'score' ? null : 'score')}
        />
        <Pill
          label={periodFilter === 'all' ? tr.filterPeriod : periodLabels[periodFilter]}
          active={periodFilter !== 'all'}
          onClick={() => setOpenFilter((p) => p === 'period' ? null : 'period')}
        />
      </div>

      {/* ── Dropdowns ── */}
      {openFilter === 'city' && (
        <div className="shrink-0" style={{ borderBottom: '1px solid #E0D8CC', background: '#FAF0E6' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(26,23,20,0.07)' }}>
            <input
              autoFocus
              type="text"
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              placeholder={lang === 'de' ? 'Stadt suchen…' : 'Search city…'}
              style={{
                width: '100%', padding: '7px 10px', fontSize: 13,
                fontFamily: '"DM Sans", system-ui, sans-serif',
                background: 'rgba(26,23,20,0.06)', border: 'none', borderRadius: 8,
                color: '#1a1714', outline: 'none',
              }}
            />
          </div>
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {[['all', `${tr.allCities} (${venues.length})`], ...cities.map(([c, n]) => [c, `${c} (${n})`])]
              .filter(([key, label]) => key === 'all' || label.toLowerCase().includes(citySearch.toLowerCase()))
              .map(([key, label]) => (
                <button key={key} onClick={() => { setCityFilter(key); setOpenFilter(null); setCitySearch(''); }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '11px 20px', fontSize: 14,
                    fontFamily: '"DM Sans", system-ui, sans-serif',
                    fontWeight: cityFilter === key ? 600 : 400,
                    color: cityFilter === key ? '#1a1714' : '#4a4340',
                    background: 'none', border: 'none', borderBottom: '1px solid rgba(26,23,20,0.06)',
                    cursor: 'pointer',
                  }}
                >{label}</button>
              ))}
          </div>
        </div>
      )}

      {openFilter === 'score' && (
        <div className="shrink-0" style={{ borderBottom: '1px solid #E0D8CC', background: '#FAF0E6' }}>
          {[
            { key: 'all',       label: tr.allScores },
            { key: 'excellent', label: lang === 'de' ? 'Exzellent ≥ 8.5' : 'Excellent ≥ 8.5' },
            { key: 'good',      label: lang === 'de' ? 'Gut ≥ 7.0'       : 'Good ≥ 7.0' },
            { key: 'meh',       label: lang === 'de' ? 'Mittel ≥ 4.0'    : 'Mediocre ≥ 4.0' },
            { key: 'avoid',     label: lang === 'de' ? 'Meiden < 4.0'    : 'Avoid < 4.0' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => { setScoreFilter(key); setOpenFilter(null); }}
              style={{
                width: '100%', textAlign: 'left', padding: '11px 20px', fontSize: 14,
                fontFamily: '"DM Sans", system-ui, sans-serif',
                fontWeight: scoreFilter === key ? 600 : 400,
                color: scoreFilter === key ? '#1a1714' : '#4a4340',
                background: 'none', border: 'none', borderBottom: '1px solid rgba(26,23,20,0.06)',
                cursor: 'pointer',
              }}
            >{label}</button>
          ))}
        </div>
      )}

      {openFilter === 'period' && (
        <div className="shrink-0" style={{ borderBottom: '1px solid #E0D8CC', background: '#FAF0E6' }}>
          {[
            { key: 'all',         label: tr.allTime },
            { key: 'thisYear',    label: tr.periodThisYear },
            { key: 'lastYear',    label: tr.periodLastYear },
            { key: 'last3Months', label: tr.periodLast3Months },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => { setPeriodFilter(key); setOpenFilter(null); }}
              style={{
                width: '100%', textAlign: 'left', padding: '11px 20px', fontSize: 14,
                fontFamily: '"DM Sans", system-ui, sans-serif',
                fontWeight: periodFilter === key ? 600 : 400,
                color: periodFilter === key ? '#1a1714' : '#4a4340',
                background: 'none', border: 'none', borderBottom: '1px solid rgba(26,23,20,0.06)',
                cursor: 'pointer',
              }}
            >{label}</button>
          ))}
        </div>
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
          const color   = bucketTextColor(score);
          const dateStr = venue.rated_at
            ? new Date(venue.rated_at).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { month: 'short', year: 'numeric' })
            : '';
          return (
            <button
              key={venue.id}
              onClick={() => navigate(`/venue/${venue.id}`)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '14px 20px',
                display: 'flex', alignItems: 'flex-start', gap: 14,
                background: 'none', border: 'none',
                borderBottom: '1px solid rgba(26,23,20,0.07)',
                cursor: 'pointer',
              }}
            >
              {/* Score badge */}
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                border: `2px solid ${color}`,
                background: 'transparent',
                flexShrink: 0, marginTop: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  color, fontSize: 14, fontWeight: 700,
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
                  fontSize: 12, color: '#555555', marginBottom: venue.comment ? 5 : 0,
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                }}>
                  {venue.city}{dateStr ? ` · ${dateStr}` : ''}
                </p>
                {venue.comment && (
                  <p style={{
                    fontFamily: '"DM Serif Display", Georgia, serif',
                    fontStyle: 'italic', fontSize: 13, color: '#6B5B4E', lineHeight: 1.4,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>„{venue.comment}"</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
