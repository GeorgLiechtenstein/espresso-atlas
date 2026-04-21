import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t } from '../lib/i18n';
import LangToggle from '../components/LangToggle';
import CupLogo from '../components/CupLogo';
import MapComponent from '../components/MapComponent';
import BottomSheet from '../components/BottomSheet';
import IndexPanel from '../components/IndexPanel';

const BUCKETS = [
  { key: 'excellent', fill: '#1a1714', label: 'Exzellent' },
  { key: 'good',      fill: '#6B4A2A', label: 'Gut' },
  { key: 'meh',       fill: '#C4B5A0', label: 'Mittel' },
  { key: 'avoid',     fill: '#8B2A2A', label: 'Meiden' },
];

function scoreBucket(score) {
  if (score == null) return null;
  const n = parseFloat(score);
  if (n >= 8.5) return 'excellent';
  if (n >= 7)   return 'good';
  if (n >= 4)   return 'meh';
  return 'avoid';
}

const ALL_KEYS = new Set(['excellent', 'good', 'meh', 'avoid']);

export default function HomePage() {
  const navigate                        = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user }                        = useAuth();
  const { lang }                        = useLang();
  const tr                              = t(lang);

  const tab = searchParams.get('tab') || 'map';

  const [venues,     setVenues]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [sheetVenue,  setSheetVenue]  = useState(null);
  const [sheetOpen,   setSheetOpen]   = useState(false);
  const [legendOpen,    setLegendOpen]    = useState(false);
  const [activeBuckets, setActiveBuckets] = useState(new Set(ALL_KEYS));

  // ── Fetch + realtime ────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchVenues() {
      setLoading(true);
      const { data } = await supabase
        .from('venues')
        .select('*')
        .order('avg_score', { ascending: false, nullsFirst: false });
      setVenues(data || []);
      setLoading(false);
    }
    fetchVenues();

    const channel = supabase
      .channel('venues-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'venues' }, (payload) => {
        if (payload.eventType === 'INSERT')
          setVenues((prev) => [payload.new, ...prev]);
        else if (payload.eventType === 'UPDATE')
          setVenues((prev) => prev.map((v) => v.id === payload.new.id ? payload.new : v));
        else if (payload.eventType === 'DELETE')
          setVenues((prev) => prev.filter((v) => v.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handlePinClick = useCallback((venue) => {
    setSheetVenue(venue);
    setSheetOpen(true);
  }, []);

  function toggleBucket(key) {
    setActiveBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        if (next.size === 0) return new Set(ALL_KEYS);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const isFiltered = activeBuckets.size < 4;
  const mapVenues = useMemo(() => {
    if (!isFiltered) return venues;
    return venues.filter((v) => {
      const b = scoreBucket(v.avg_score);
      return b !== null && activeBuckets.has(b);
    });
  }, [venues, activeBuckets, isFiltered]);

  const locateOnMount = !localStorage.getItem('em_geo_asked');

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">

      {/* ── Fullscreen map ──────────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <MapComponent
          venues={mapVenues}
          onPinClick={handlePinClick}
          flyToId={null}
          locateOnMount={locateOnMount}
          height="100%"
        />
      </div>

      {/* ── Top overlay bar ─────────────────────────────────────────────────── */}
      <header
        className="fixed left-0 right-0 top-0 z-[400] bg-surface shadow-sm flex items-center justify-between px-4"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
          paddingBottom: '14px',
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CupLogo />
          <span className="font-serif text-[19px] text-ink leading-tight" style={{ cursor: 'pointer' }} onClick={() => setSearchParams({ tab: 'map' }, { replace: true })}>Espresso Atlas</span>
        </div>
        <div className="flex items-center gap-2">
          {!user && (
            <button
              onClick={() => navigate('/login')}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-ink transition-colors"
              aria-label="Login"
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          )}
          {user && tab === 'about' && (
            <button
              onClick={handleSignOut}
              style={{ fontSize: 12, color: '#555555', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              className="font-sans hover:text-ink transition-colors"
            >
              {tr.signOut}
            </button>
          )}
          <LangToggle />
        </div>
      </header>

      {/* ── Map legend (collapsible) ─────────────────────────────────────────── */}
      {tab === 'map' && (
        <div style={{
          position: 'fixed', zIndex: 420, left: 12,
          top: 'calc(env(safe-area-inset-top) + 50px + 10px)',
        }}>
          <button
            type="button"
            onClick={() => setLegendOpen((o) => !o)}
            aria-label="Legende"
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: legendOpen ? '#1a1714' : 'rgba(250,240,230,0.95)',
              border: isFiltered && !legendOpen ? '1.5px solid #6B4A2A' : '1px solid rgba(26,23,20,0.18)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              color: legendOpen ? '#FAF0E6' : '#6B4A2A',
              fontSize: 13, fontStyle: 'italic', fontWeight: 700,
              fontFamily: '"DM Serif Display", Georgia, serif',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            i
          </button>
          {legendOpen && (
            <div style={{
              marginTop: 6,
              background: 'rgba(250,240,230,0.97)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(224,216,204,0.8)',
              borderRadius: 10,
              padding: '8px 10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase', color: '#666666', marginBottom: 6, fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                Urteil
              </div>
              {BUCKETS.map(({ key, fill, label }) => {
                const active = activeBuckets.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleBucket(key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      marginBottom: 4, width: '100%',
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: 0, opacity: active ? 1 : 0.3,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    <div style={{
                      width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                      background: fill,
                    }} />
                    <span style={{ fontSize: 10, fontFamily: '"DM Sans", system-ui, sans-serif', color: '#444444' }}>{label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!loading && venues.length === 0 && tab === 'map' && (
        <div className="absolute inset-0 flex items-center justify-center z-[300] pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg px-8 py-8 text-center pointer-events-auto mx-6 max-w-xs">
            <span className="text-5xl block mb-3">☕</span>
            <h2 className="font-serif text-xl text-ink mb-1">{tr.emptyLine1}</h2>
            <p className="text-sm font-sans mb-1" style={{ color: '#666' }}>{tr.emptyLine2}</p>
          </div>
        </div>
      )}

      {/* ── Index panel ──────────────────────────────────────────────────────── */}
      <IndexPanel venues={venues} isOpen={tab === 'index'} />

      {/* ── About panel ──────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 bg-white overflow-y-auto"
        style={{
          zIndex: 350,
          transform: tab === 'about' ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          pointerEvents: tab === 'about' ? 'auto' : 'none',
          paddingBottom: 'calc(56px + env(safe-area-inset-bottom))',
        }}
      >
        <div className="shrink-0" style={{ height: 'calc(env(safe-area-inset-top) + 50px)' }} />
        <main className="max-w-2xl mx-auto px-5 py-8 pb-4">
          <p className="text-xs font-sans mb-8 tracking-widest uppercase" style={{ color: '#555555' }}>
            {tr.aboutTagline}
          </p>
          <div className="space-y-8">
            {tr.aboutSections.map((s) => (
              <section key={s.heading}>
                <h2 className="font-serif text-2xl text-ink mb-3 leading-tight">{s.heading}</h2>
                {s.body.split('\n\n').map((para, i) => (
                  <p key={i} className="text-[15px] text-gray-600 font-sans leading-relaxed mb-3 last:mb-0">
                    {para}
                  </p>
                ))}
              </section>
            ))}
          </div>
          <p className="mt-10 font-serif text-xl text-ink">{tr.aboutSignature}</p>
          <div className="mt-10 pt-6 border-t border-border">
            {user ? (
              <button
                onClick={handleSignOut}
                className="text-sm font-sans hover:text-ink transition-colors" style={{ color: '#555555' }}
              >
                {tr.signOut}
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="text-sm font-sans hover:text-ink transition-colors" style={{ color: '#555555' }}
              >
                Admin Login
              </button>
            )}
          </div>
        </main>
      </div>

      {/* ── Bottom sheet ─────────────────────────────────────────────────────── */}
      <BottomSheet
        venue={sheetVenue}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
