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
  { key: 'excellent', fill: '#1a1714', textColor: '#1a1714', label: { de: 'Exzellent', en: 'Excellent' } },
  { key: 'good',      fill: '#6B4A2A', textColor: '#6B4A2A', label: { de: 'Gut',       en: 'Good' } },
  { key: 'meh',       fill: '#C4B5A0', textColor: '#8A7A62', label: { de: 'Mittel',    en: 'Average' } },
  { key: 'avoid',     fill: '#8B2A2A', textColor: '#8B2A2A', label: { de: 'Meiden',    en: 'Avoid' } },
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
          lang={lang}
          height="100%"
        />
      </div>

      {/* ── Top overlay bar ─────────────────────────────────────────────────── */}
      <header
        className="fixed left-0 right-0 top-0 z-[400] bg-surface shadow-sm"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
          paddingBottom: 12,
        }}
      >
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center" style={{ gap: 8, flex: 1, minWidth: 0 }}>
            <CupLogo />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span
                className="font-serif text-[19px] text-ink"
                style={{ cursor: 'pointer', lineHeight: 1.1 }}
                onClick={() => setSearchParams({ tab: 'map' }, { replace: true })}
              >
                Espresso Atlas
              </span>
              {tab === 'map' && (
                <p style={{
                  marginTop: 2, marginBottom: 0,
                  fontSize: 13, color: '#777777',
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  lineHeight: 1.2,
                }}>
                  {tr.taglineShort}
                </p>
              )}
            </div>
          </div>
          <LangToggle />
        </div>
      </header>

      {/* ── Map legend (collapsible) ─────────────────────────────────────────── */}
      {tab === 'map' && (
        <div style={{
          position: 'fixed', zIndex: 450, left: 16,
          bottom: 'calc(72px + env(safe-area-inset-bottom))',
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        }}>
          {legendOpen && (
            <div style={{
              marginBottom: 8,
              background: 'rgba(250,240,230,0.97)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(224,216,204,0.8)',
              borderRadius: 10,
              padding: '8px 10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase', color: '#666666', marginBottom: 6, fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                {lang === 'de' ? 'Urteil' : 'Verdict'}
              </div>
              {BUCKETS.map(({ key, fill, textColor, label }) => {
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
                    <span style={{ fontSize: 11, fontWeight: 600, fontFamily: '"DM Sans", system-ui, sans-serif', color: textColor }}>{label[lang]}</span>
                  </button>
                );
              })}
            </div>
          )}
          <button
            type="button"
            onClick={() => setLegendOpen((o) => !o)}
            aria-label="Legende"
            style={{
              width: 56, height: 56, borderRadius: '50%',
              background: legendOpen ? '#1a1714' : 'rgba(250,240,230,0.95)',
              border: isFiltered && !legendOpen ? '1.5px solid #6B4A2A' : '1px solid rgba(26,23,20,0.18)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              color: legendOpen ? '#FAF0E6' : '#6B4A2A',
              fontSize: 20, fontStyle: 'italic', fontWeight: 700,
              fontFamily: '"DM Serif Display", Georgia, serif',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            i
          </button>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!loading && tab === 'map' && (venues.length === 0 || (isFiltered && mapVenues.length === 0)) && (
        <div className="absolute inset-0 flex items-center justify-center z-[300] pointer-events-none">
          <div className="rounded-2xl shadow-lg px-8 py-8 text-center pointer-events-auto mx-6 max-w-xs"
               style={{ background: '#FAF0E6' }}>
            <span style={{ fontSize: 64, display: 'block', marginBottom: 12, lineHeight: 1 }}>☕</span>
            <p className="font-serif text-xl text-ink mb-1">{tr.noReviewsHere}</p>
            {user && (
              <button
                onClick={() => navigate('/review')}
                style={{
                  marginTop: 14, padding: '12px 20px',
                  background: '#6B4A2A', color: '#FAF0E6',
                  border: 'none', borderRadius: 12,
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  minHeight: 44,
                }}
              >
                + {tr.addFirstReview}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Index panel ──────────────────────────────────────────────────────── */}
      <IndexPanel venues={venues} isOpen={tab === 'index'} />

      {/* ── About panel ──────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 overflow-y-auto"
        style={{
          zIndex: 350,
          background: '#FAF0E6',
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
          <div className="mt-10 pt-6 border-t border-border" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {user ? (
              <button
                onClick={handleSignOut}
                className="text-sm font-sans hover:text-ink transition-colors" style={{ color: '#555555', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {tr.signOut}
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="text-sm font-sans hover:text-ink transition-colors" style={{ color: '#555555', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Admin Login
              </button>
            )}
            <button
              onClick={() => navigate('/privacy')}
              className="text-sm font-sans hover:text-ink transition-colors"
              style={{ color: '#9CA3AF', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {tr.privacyLink}
            </button>
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
