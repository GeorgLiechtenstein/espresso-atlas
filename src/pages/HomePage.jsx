import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t } from '../lib/i18n';
import LangToggle from '../components/LangToggle';
import MapComponent from '../components/MapComponent';
import VenueCard from '../components/VenueCard';
import BottomSheet from '../components/BottomSheet';

export default function HomePage() {
  const navigate      = useNavigate();
  const { user }      = useAuth();
  const { lang }      = useLang();
  const tr            = t(lang);

  const [venues,      setVenues]     = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [error,       setError]      = useState('');
  const [search,      setSearch]     = useState('');
  const [minScore,    setMinScore]   = useState(0);
  const [sortBy,      setSortBy]     = useState('score');
  const [flyToId,     setFlyToId]    = useState(null);
  const [tab,         setTab]        = useState('map');
  const [menuOpen,    setMenuOpen]   = useState(false);

  // Bottom-sheet state
  const [sheetVenue, setSheetVenue] = useState(null);
  const [sheetOpen,  setSheetOpen]  = useState(false);

  const menuRef = useRef(null);

  // Close hamburger menu on outside click / touch
  useEffect(() => {
    if (!menuOpen) return;
    function onOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
    };
  }, [menuOpen]);

  // ── Fetch venues + realtime ───────────────────────────────────────────────
  useEffect(() => {
    async function fetchVenues() {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('venues')
        .select('*')
        .order('avg_score', { ascending: false, nullsFirst: false });
      if (err) setError(err.message);
      else setVenues(data || []);
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

  // ── Pin click → open sheet (all data is on the venue object) ───────────────
  const handlePinClick = useCallback((venue) => {
    setSheetVenue(venue);
    setSheetOpen(true);
  }, []);

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...venues];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (v) => v.name.toLowerCase().includes(q) ||
               v.city.toLowerCase().includes(q) ||
               v.country.toLowerCase().includes(q),
      );
    }
    if (minScore > 0)
      list = list.filter((v) => v.avg_score !== null && parseFloat(v.avg_score) >= minScore);
    if (sortBy === 'score')
      list.sort((a, b) => (parseFloat(b.avg_score) || -1) - (parseFloat(a.avg_score) || -1));
    else
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return list;
  }, [venues, search, minScore, sortBy]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setMenuOpen(false);
  }

  const locateOnMount = !localStorage.getItem('em_geo_asked');

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">

      {/* ── Fullscreen map ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <MapComponent
          venues={filtered}
          onPinClick={handlePinClick}
          flyToId={flyToId}
          locateOnMount={locateOnMount}
          height="100%"
        />
      </div>

      {/* ── Top overlay bar ────────────────────────────────────────────── */}
      <header
        className="fixed left-0 right-0 top-0 z-[400] bg-sky-50 shadow-sm flex items-center justify-between px-4"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
          paddingBottom: '14px',
        }}
      >
          {/* Logo */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <svg width={22} height={18} viewBox="0 0 26 22" className="shrink-0 text-ink">
              <path d="M9 2 Q10.5 4 9 6" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.5"/>
              <path d="M13 2 Q14.5 4 13 6" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.5"/>
              <path d="M4.5 8 L5.5 17 Q5.8 19 8 19 L14 19 Q16.2 19 16.5 17 L17.5 8 Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
              <path d="M17.5 10 Q21 10 21 12.5 Q21 15 17.5 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <ellipse cx="11" cy="20.2" rx="9" ry="1.2" fill="none" stroke="currentColor" strokeWidth="1"/>
            </svg>
            <span className="font-serif text-[19px] text-ink leading-tight">Espresso Atlas</span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1 shrink-0">
            <LangToggle />

            {/* Hamburger menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Menu"
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors text-ink"
              >
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <line x1="3" y1="6"  x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-border overflow-hidden min-w-[160px]">
                  <Link
                    to="/about"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-ink font-sans hover:bg-surface transition-colors"
                  >
                    {tr.about}
                  </Link>

                  <div className="border-t border-border" />

                  {user ? (
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-xs text-gray-400 font-sans hover:bg-surface transition-colors"
                    >
                      {tr.signOut}
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs text-gray-400 font-sans hover:bg-surface transition-colors"
                    >
                      Admin Login
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
      </header>

      {/* ── Empty state overlay (map) ──────────────────────────────────── */}
      {!loading && venues.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-[300] pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg px-8 py-8 text-center pointer-events-auto mx-6 max-w-xs">
            <span className="text-5xl block mb-3">☕</span>
            <h2 className="font-serif text-xl text-ink mb-1">{tr.emptyLine1}</h2>
            <p className="text-sm font-sans mb-1" style={{ color: '#666' }}>{tr.emptyLine2}</p>
            {user && (
              <button
                onClick={() => navigate('/review')}
                className="mt-4 bg-coffee text-white rounded-xl px-5 py-2.5 text-sm font-semibold font-sans hover:opacity-90 transition-opacity"
              >
                {lang === 'de' ? '+ Ersten Espresso bewerten' : '+ Rate the first espresso'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Admin FAB — only when logged in, only on map tab ───────────── */}
      {user && tab === 'map' && (
        <button
          onClick={() => navigate('/review')}
          aria-label={tr.addReview}
          style={{ zIndex: 450, bottom: 'calc(72px + 16px + 48px + 16px + env(safe-area-inset-bottom))', right: 16 }}
          className="absolute w-14 h-14 bg-coffee text-white rounded-full shadow-xl
            flex items-center justify-center text-3xl font-light
            hover:opacity-90 active:scale-95 transition-all focus:outline-none"
        >
          +
        </button>
      )}

      {/* ── List panel (slides up over the map) ────────────────────────── */}
      <div
        className="absolute left-0 right-0 top-0 bottom-0 bg-white z-[350] flex flex-col"
        style={{
          paddingBottom: 'calc(56px + env(safe-area-inset-bottom))',
          transform: tab === 'list' ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          pointerEvents: tab === 'list' ? 'auto' : 'none',
        }}
      >
        {/* Spacer to clear the edge-to-edge header (~64px content + safe-area) */}
        <div className="shrink-0" style={{ height: 'calc(64px + env(safe-area-inset-top))' }} />

        {/* Search + filters */}
        <div className="px-3 pt-3 pb-2 border-b border-border flex flex-col gap-2 shrink-0 bg-white">
          <input
            type="search"
            placeholder={tr.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-ink placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-coffee/40 font-sans"
          />
          <div className="flex gap-2">
            <select
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="flex-1 border border-border rounded-xl px-2 py-2 text-xs text-ink font-sans focus:outline-none focus:ring-2 focus:ring-coffee/40 bg-white"
            >
              <option value={0}>{tr.filterAll}</option>
              <option value={3}>{tr.filterFrom30}</option>
              <option value={4}>{tr.filterFrom40}</option>
              <option value={4.5}>{tr.filterFrom45}</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 border border-border rounded-xl px-2 py-2 text-xs text-ink font-sans focus:outline-none focus:ring-2 focus:ring-coffee/40 bg-white"
            >
              <option value="score">{tr.sortBest}</option>
              <option value="newest">{tr.sortNewest}</option>
            </select>
          </div>
        </div>

        {/* Scrollable venue list — tap → venue detail page */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {loading && (
            <p className="text-center text-gray-400 text-sm py-12 font-sans">{tr.loadingVenues}</p>
          )}
          {error && (
            <p className="text-center text-score-red text-sm py-12 font-sans">{error}</p>
          )}
          {!loading && !error && filtered.length === 0 && search.trim() && (
            <p className="text-center text-gray-400 text-sm py-12 font-sans">
              {tr.noResultsFor} „{search}"
            </p>
          )}
          {!loading && !error && filtered.length === 0 && !search.trim() && (
            <p className="text-center text-gray-400 text-sm py-12 leading-relaxed font-sans">
              {tr.emptyLine1}<br />{tr.emptyLine2}
            </p>
          )}
          {filtered.map((venue) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              onClick={() => { setTab('map'); handlePinClick(venue); }}
            />
          ))}
        </div>
      </div>

      {/* ── Bottom navigation — 2 tabs only ────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[500] bg-sky-50 border-t border-border flex items-center"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Karte */}
        <button
          onClick={() => setTab('map')}
          className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors min-h-[44px]
            ${tab === 'map' ? 'text-coffee' : 'text-gray-400'}`}
        >
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
            <line x1="9" y1="3" x2="9" y2="18" />
            <line x1="15" y1="6" x2="15" y2="21" />
          </svg>
          <span className="text-[10px] font-medium font-sans">{tr.mapTab}</span>
        </button>

        {/* Liste */}
        <button
          onClick={() => setTab('list')}
          className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors min-h-[44px]
            ${tab === 'list' ? 'text-coffee' : 'text-gray-400'}`}
        >
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <span className="text-[10px] font-medium font-sans">{tr.listTab}</span>
        </button>
      </nav>

      {/* ── Bottom sheet (pin tap preview) ─────────────────────────────── */}
      <BottomSheet
        venue={sheetVenue}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
