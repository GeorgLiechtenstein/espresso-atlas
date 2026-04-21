import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { t } from '../lib/i18n';

function bucketColor(score) {
  if (score === null || score === undefined) return '#9CA3AF';
  const n = parseFloat(score);
  if (n >= 8.5) return '#1a1714';
  if (n >= 7)   return '#6B4A2A';
  if (n >= 4)   return '#8a7a62';
  return '#8B2A2A';
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 11px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        fontFamily: '"DM Sans", system-ui, sans-serif',
        border: active ? '1.5px solid #1a1714' : '1px solid #E0D8CC',
        background: active ? '#1a1714' : 'transparent',
        color: active ? '#F7F3EC' : '#4a4340',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
      }}
    >
      {label}
      <span style={{ fontSize: 9, opacity: 0.6 }}>{active ? '✕' : '▾'}</span>
    </button>
  );
}

export default function IndexPanel({ venues, isOpen }) {
  const navigate = useNavigate();
  const { lang }  = useLang();
  const tr        = t(lang);

  const [cityFilter,   setCityFilter]   = useState('all');
  const [scoreFilter,  setScoreFilter]  = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [sortBy,       setSortBy]       = useState('score');
  const [openFilter,   setOpenFilter]   = useState(null);

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
      else if (scoreFilter === 'good')  list = list.filter((v) => v.avg_score != null && parseFloat(v.avg_score) >= 7 && parseFloat(v.avg_score) < 8.5);
      else if (scoreFilter === 'meh')   list = list.filter((v) => v.avg_score != null && parseFloat(v.avg_score) >= 4 && parseFloat(v.avg_score) < 7);
      else if (scoreFilter === 'avoid') list = list.filter((v) => v.avg_score != null && parseFloat(v.avg_score) < 4);
    }
    if (periodFilter !== 'all') {
      const now = new Date();
      let from, to;
      if (periodFilter === 'thisYear')    { from = new Date(now.getFullYear(), 0, 1); }
      else if (periodFilter === 'lastYear') { from = new Date(now.getFullYear() - 1, 0, 1); to = new Date(now.getFullYear(), 0, 1); }
      else if (periodFilter === 'last3Months') { from = new Date(now.getFullYear(), now.getMonth() - 3, 1); }
      list = list.filter((v) => {
        if (!v.rated_at) return false;
        const d = new Date(v.rated_at);
        if (from && d < from) return false;
        if (to && d >= to) return false;
        return true;
      });
    }
    if (sortBy === 'score')     list.sort((a, b) => (parseFloat(b.avg_score) || 0) - (parseFloat(a.avg_score) || 0));
    else if (sortBy === 'city') list.sort((a, b) => (a.city || '').localeCompare(b.city || ''));
    else                        list.sort((a, b) => new Date(b.rated_at || 0) - new Date(a.rated_at || 0));
    return list;
  }, [venues, cityFilter, scoreFilter, periodFilter, sortBy]);

  function toggleFilter(key) {
    setOpenFilter((prev) => (prev === key ? null : key));
  }

  const scoreChipLabels = {
    excellent: lang === 'de' ? 'Exzellent' : 'Excellent',
    good:      lang === 'de' ? 'Gut'       : 'Good',
    meh:       lang === 'de' ? 'Mittel'    : 'Mediocre',
    avoid:     lang === 'de' ? 'Meiden'    : 'Avoid',
  };

  const periodChipLabels = {
    thisYear:    tr.periodThisYear,
    lastYear:    tr.periodLastYear,
    last3Months: tr.periodLast3Months,
  };

  return (
    <div
      className="absolute inset-0 flex flex-col bg-surface"
      style={{
        zIndex: 350,
        transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        pointerEvents: isOpen ? 'auto' : 'none',
        paddingBottom: 'calc(56px + env(safe-area-inset-bottom))',
      }}
    >
      {/* Header spacer */}
      <div className="shrink-0" style={{ height: 'calc(env(safe-area-inset-top) + 50px)' }} />

      {/* Filter + sort bar */}
      <div className="shrink-0 border-b border-border bg-surface">
        <div className="px-3 pt-2.5 flex gap-2 overflow-x-auto no-scrollbar">
          <FilterChip
            label={cityFilter === 'all' ? tr.filterCity : cityFilter}
            active={cityFilter !== 'all'}
            onClick={() => toggleFilter('city')}
          />
          <FilterChip
            label={scoreFilter === 'all' ? tr.filterScore : scoreChipLabels[scoreFilter]}
            active={scoreFilter !== 'all'}
            onClick={() => toggleFilter('score')}
          />
          <FilterChip
            label={periodFilter === 'all' ? tr.filterPeriod : periodChipLabels[periodFilter]}
            active={periodFilter !== 'all'}
            onClick={() => toggleFilter('period')}
          />
        </div>

        <div className="px-3 pt-1.5 pb-2 flex gap-0">
          {[
            { key: 'score', label: tr.sortScore },
            { key: 'city',  label: tr.sortCity },
            { key: 'date',  label: tr.sortDate },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              style={{
                padding: '3px 10px 4px',
                fontSize: 11,
                fontWeight: sortBy === key ? 700 : 400,
                color: sortBy === key ? '#1a1714' : '#8a837e',
                fontFamily: '"DM Sans", system-ui, sans-serif',
                background: 'none',
                border: 'none',
                borderBottom: sortBy === key ? '2px solid #1a1714' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter dropdowns */}
      {openFilter === 'city' && (
        <div className="shrink-0 bg-white border-b border-border shadow-sm max-h-52 overflow-y-auto">
          <button
            onClick={() => { setCityFilter('all'); setOpenFilter(null); }}
            className={`w-full text-left px-4 py-3 text-sm font-sans border-b border-border ${cityFilter === 'all' ? 'font-bold text-ink' : 'text-gray-600'}`}
          >
            {tr.allCities} ({venues.length})
          </button>
          {cities.map(([city, count]) => (
            <button
              key={city}
              onClick={() => { setCityFilter(city); setOpenFilter(null); }}
              className={`w-full text-left px-4 py-3 text-sm font-sans border-b border-border last:border-0 ${cityFilter === city ? 'font-bold text-ink' : 'text-gray-600'}`}
            >
              {city} ({count})
            </button>
          ))}
        </div>
      )}

      {openFilter === 'score' && (
        <div className="shrink-0 bg-white border-b border-border shadow-sm">
          {[
            { key: 'all',       label: tr.allScores },
            { key: 'excellent', label: lang === 'de' ? 'Exzellent (≥ 8.5)' : 'Excellent (≥ 8.5)' },
            { key: 'good',      label: lang === 'de' ? 'Gut (≥ 7.0)'       : 'Good (≥ 7.0)' },
            { key: 'meh',       label: lang === 'de' ? 'Mittel (≥ 4.0)'    : 'Mediocre (≥ 4.0)' },
            { key: 'avoid',     label: lang === 'de' ? 'Meiden (< 4.0)'    : 'Avoid (< 4.0)' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setScoreFilter(key); setOpenFilter(null); }}
              className={`w-full text-left px-4 py-3 text-sm font-sans border-b border-border last:border-0 ${scoreFilter === key ? 'font-bold text-ink' : 'text-gray-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {openFilter === 'period' && (
        <div className="shrink-0 bg-white border-b border-border shadow-sm">
          {[
            { key: 'all',        label: tr.allTime },
            { key: 'thisYear',   label: tr.periodThisYear },
            { key: 'lastYear',   label: tr.periodLastYear },
            { key: 'last3Months',label: tr.periodLast3Months },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setPeriodFilter(key); setOpenFilter(null); }}
              className={`w-full text-left px-4 py-3 text-sm font-sans border-b border-border last:border-0 ${periodFilter === key ? 'font-bold text-ink' : 'text-gray-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Venue list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-12 font-sans">
            {lang === 'de' ? 'Keine Einträge.' : 'No entries.'}
          </p>
        )}
        {filtered.map((venue) => {
          const score  = venue.avg_score != null ? parseFloat(venue.avg_score) : null;
          const color  = bucketColor(score);
          const dateStr = venue.rated_at
            ? new Date(venue.rated_at).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { month: 'short', year: 'numeric' })
            : '';
          return (
            <button
              key={venue.id}
              onClick={() => navigate(`/venue/${venue.id}`)}
              className="w-full text-left px-4 py-3.5 flex items-start gap-3.5 border-b border-border hover:bg-white transition-colors active:bg-white"
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%', background: color,
                flexShrink: 0, marginTop: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  color: '#F7F3EC', fontSize: 13, fontWeight: 700,
                  fontFamily: '"DM Sans", system-ui, sans-serif', lineHeight: 1,
                }}>
                  {score != null ? score.toFixed(1) : '—'}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p style={{
                  fontFamily: '"DM Serif Display", Georgia, serif',
                  fontSize: 17, fontWeight: 700, color: '#1a1714', lineHeight: 1.2, marginBottom: 2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{venue.name}</p>
                <p style={{ fontSize: 12, color: '#8a837e', marginBottom: venue.comment ? 4 : 0, fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  {venue.city}{dateStr ? ` · ${dateStr}` : ''}
                </p>
                {venue.comment && (
                  <p style={{
                    fontFamily: '"DM Serif Display", Georgia, serif',
                    fontStyle: 'italic', fontSize: 13, color: '#4a4340', lineHeight: 1.35,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
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
