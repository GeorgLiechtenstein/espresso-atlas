import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t, scoreLabel } from '../lib/i18n';
import LangToggle from '../components/LangToggle';

const CURRENCIES = ['EUR', 'CHF', 'USD', 'GBP', 'TRY', 'IQD'];

function bucketColor(score) {
  if (score === null || score === undefined) return '#9CA3AF';
  const n = parseFloat(score);
  if (n >= 8.5) return '#1a1714';
  if (n >= 7)   return '#6B4A2A';
  if (n >= 4)   return '#8a7a62';
  return '#8B2A2A';
}

async function geocode(name, city, country) {
  const q = [name, city, country].filter(Boolean).join(', ');
  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`);
    const data = await res.json();
    if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    const res2  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent([city, country].join(', '))}&format=json&limit=1`);
    const data2 = await res2.json();
    if (data2?.length > 0) return { lat: parseFloat(data2[0].lat), lng: parseFloat(data2[0].lon) };
  } catch { /* silent */ }
  return { lat: 0, lng: 0 };
}

export default function ReviewPage() {
  const { venueId: preVenueId } = useParams();
  const navigate                = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { lang } = useLang();
  const tr = t(lang);

  const isEdit = Boolean(preVenueId);

  const [step, setStep] = useState(1);

  // ── Venue fields ────────────────────────────────────────────────────────────
  const [name,    setName]    = useState('');
  const [city,    setCity]    = useState('');
  const [country, setCountry] = useState('');
  const [lat,     setLat]     = useState(null);
  const [lng,     setLng]     = useState(null);

  const [locSearch, setLocSearch] = useState('');
  const [locSugg,   setLocSugg]   = useState([]);
  const [locating,  setLocating]  = useState(false);
  const locTimer        = useRef(null);
  const locJustSelected = useRef(false);

  // ── Rating fields ───────────────────────────────────────────────────────────
  const [body,       setBody]       = useState(5);
  const [balance,    setBalance]    = useState(5);
  const [crema,      setCrema]      = useState(5);
  const [overall,    setOverall]    = useState(5);
  const [ceramicCup, setCeramicCup] = useState(false);
  const [wouldReturn, setWouldReturn] = useState(null);
  const [openInfo,   setOpenInfo]   = useState(null);

  // ── Details ─────────────────────────────────────────────────────────────────
  const [comment,  setComment]  = useState('');
  const [roastery, setRoastery] = useState('');
  const [price,    setPrice]    = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [photo,    setPhoto]    = useState(null);
  const [photoPreview,      setPhotoPreview]      = useState('');
  const [existingPhotoUrl,  setExistingPhotoUrl]  = useState(null);
  const [showDetails,       setShowDetails]       = useState(false);

  // ── Submit state ────────────────────────────────────────────────────────────
  const [saving,    setSaving]    = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error,     setError]     = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { replace: true });
  }, [user, authLoading, navigate]);

  // Load existing venue when editing
  useEffect(() => {
    if (!preVenueId) return;
    supabase.from('venues').select('*').eq('id', preVenueId).single()
      .then(({ data }) => {
        if (!data) return;
        setName(data.name || '');
        setCity(data.city || '');
        setCountry(data.country || '');
        setLat(data.lat ? parseFloat(data.lat) : null);
        setLng(data.lng ? parseFloat(data.lng) : null);
        if (data.address) setLocSearch(data.address);
        setBody(data.body || 5);
        setBalance(data.balance || 5);
        setCrema(data.crema || 5);
        setOverall(data.overall || 5);
        setCeramicCup(data.ceramic_cup || false);
        setWouldReturn(data.would_return != null ? data.would_return : null);
        setRoastery(data.roastery || '');
        setComment(data.comment || '');
        setPrice(data.price != null ? String(data.price) : '');
        setCurrency(data.currency || 'EUR');
        setExistingPhotoUrl(data.photo_url || null);
        if (data.photo_url) setPhotoPreview(data.photo_url);
        if (data.comment || data.price || data.photo_url || data.roastery || data.ceramic_cup) setShowDetails(true);
      });
  }, [preVenueId]);

  // Nominatim autocomplete
  useEffect(() => {
    if (locJustSelected.current) { locJustSelected.current = false; return; }
    if (locSearch.length < 3 || locSearch.startsWith('📍')) { setLocSugg([]); return; }
    clearTimeout(locTimer.current);
    locTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locSearch)}&format=json&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': lang === 'de' ? 'de' : 'en' } },
        );
        setLocSugg((await res.json()) || []);
      } catch { /* silent */ }
    }, 350);
    return () => clearTimeout(locTimer.current);
  }, [locSearch, lang]);

  function applyLocSuggestion(s) {
    locJustSelected.current = true;
    const addr     = s.address || {};
    const vName    = addr.amenity || addr.name || addr.shop || addr.cafe || addr.restaurant
                     || s.display_name.split(',')[0].trim();
    const vCity    = addr.city || addr.town || addr.village || addr.municipality || '';
    const vCountry = addr.country || '';
    setLat(parseFloat(s.lat));
    setLng(parseFloat(s.lon));
    if (!name    && vName)    setName(vName);
    if (!city    && vCity)    setCity(vCity);
    if (!country && vCountry) setCountry(vCountry);
    setLocSearch(s.display_name.split(',').slice(0, 2).join(', '));
    setLocSugg([]);
  }

  async function handleGPS() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: gLat, longitude: gLng } = pos.coords;
        setLat(gLat); setLng(gLng);
        setLocSearch(`📍 ${gLat.toFixed(5)}, ${gLng.toFixed(5)}`);
        try {
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${gLat}&lon=${gLng}&format=json&addressdetails=1`,
            { headers: { 'Accept-Language': lang === 'de' ? 'de' : 'en' } },
          );
          const data = await res.json();
          const addr = data.address || {};
          if (!city    && (addr.city || addr.town || addr.village)) setCity(addr.city || addr.town || addr.village);
          if (!country && addr.country) setCountry(addr.country);
        } catch { /* silent */ }
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000, enableHighAccuracy: true },
    );
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }
  function removePhoto() {
    setPhoto(null); setPhotoPreview(''); setExistingPhotoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const step1Valid = Boolean(name.trim() && city.trim() && country.trim());
  const liveScore  = Math.round(((body + balance + crema + overall) / 4) * 100) / 100;

  async function handleSubmit() {
    setError('');
    if (!name.trim() || !city.trim() || !country.trim()) { setError(tr.errFillVenue); return; }
    setSaving(true);
    try {
      let resolvedLat = lat, resolvedLng = lng;
      if (!resolvedLat || !resolvedLng) {
        setGeocoding(true);
        const coords = await geocode(name, city, country);
        setGeocoding(false);
        resolvedLat = coords.lat; resolvedLng = coords.lng;
      }

      let photoUrl = existingPhotoUrl;
      if (photo) {
        const ext  = photo.name.split('.').pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('review-photos').upload(path, photo, { contentType: photo.type, upsert: false });
        if (uploadErr) throw new Error(uploadErr.message);
        const { data: { publicUrl } } = supabase.storage.from('review-photos').getPublicUrl(path);
        photoUrl = publicUrl;
      }

      const addressVal = locSearch.startsWith('📍') ? null : locSearch.trim() || null;
      const payload = {
        name: name.trim(), city: city.trim(), country: country.trim(),
        address: addressVal,
        lat: resolvedLat, lng: resolvedLng,
        body, balance, crema, overall,
        ceramic_cup:  ceramicCup || null,
        would_return: wouldReturn,
        roastery:     roastery.trim() || null,
        comment:      comment.trim() || null,
        price:        price ? parseFloat(price) : null,
        currency,
        photo_url:    photoUrl,
        rated_at:     new Date().toISOString(),
      };

      if (isEdit) {
        const { error: err } = await supabase.from('venues').update(payload).eq('id', preVenueId);
        if (err) throw new Error(err.message);
        navigate(`/venue/${preVenueId}`, { replace: true });
      } else {
        const { data: newVenue, error: err } = await supabase
          .from('venues').insert(payload).select().single();
        if (err) throw new Error(err.message);
        navigate(`/venue/${newVenue.id}`, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Error');
      setSaving(false); setGeocoding(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-gray-400 text-sm font-sans">{tr.loading}</p>
      </div>
    );
  }

  const subScores = [
    { key: 'body',    label: tr.bodyLabel,    hint: tr.bodyHint,    info: tr.bodyInfo,    val: body,    set: setBody },
    { key: 'balance', label: tr.balanceLabel, hint: tr.balanceHint, info: tr.balanceInfo, val: balance, set: setBalance },
    { key: 'crema',   label: tr.cremaLabel,   hint: tr.cremaHint,   info: tr.cremaInfo,   val: crema,   set: setCrema },
    { key: 'overall', label: tr.overallLabel, hint: tr.overallHint, info: tr.overallInfo, val: overall, set: setOverall },
  ];

  const stepTitles = [tr.step1Title, tr.step2Title, tr.step3Title];

  return (
    <div className="min-h-screen bg-surface flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 bg-surface border-b border-border px-4 flex items-center gap-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)', paddingBottom: '10px' }}
      >
        <button
          type="button"
          onClick={() => step > 1 ? setStep((s) => s - 1) : navigate(-1)}
          className="min-w-[44px] min-h-[44px] -ml-2 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          aria-label="Back"
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Step dots */}
        <div className="flex-1 flex items-center justify-center gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} style={{
              width: n === step ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: n === step ? '#1a1714' : n < step ? '#6B4A2A' : 'rgba(26,23,20,0.18)',
              transition: 'width 0.25s ease, background 0.25s ease',
            }} />
          ))}
        </div>

        <LangToggle />
      </header>

      {/* ── Scrollable content ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-5 pt-7 pb-32">

          <h1 style={{
            fontFamily: '"DM Serif Display", Georgia, serif',
            fontSize: 32, fontWeight: 700, color: '#1a1714',
            letterSpacing: -0.5, lineHeight: 1.1, marginBottom: 28,
          }}>
            {stepTitles[step - 1]}
          </h1>

          {/* ── STEP 1: Location ───────────────────────────────────────────── */}
          {step === 1 && (
            <div className="flex flex-col gap-5">

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-500 font-sans font-medium">{tr.nameLabel}</label>
                <input
                  type="text" placeholder={tr.namePlaceholder}
                  value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-3 text-sm text-ink placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-coffee/40 font-sans min-h-[48px]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-500 font-sans font-medium">
                  {lang === 'de' ? 'Standort' : 'Location'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={lang === 'de' ? 'Lokal oder Adresse suchen…' : 'Search venue or address…'}
                    value={locSearch}
                    onChange={(e) => setLocSearch(e.target.value)}
                    className="w-full border border-border rounded-xl px-3 py-3 pr-12 text-sm text-ink placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-coffee/40 font-sans min-h-[48px]"
                  />
                  <button type="button" onClick={handleGPS} disabled={locating}
                    title={lang === 'de' ? 'Aktueller Standort' : 'Use my location'}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-coffee transition-colors">
                    {locating ? (
                      <svg className="animate-spin" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    ) : (
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                      </svg>
                    )}
                  </button>
                  {locSugg.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-30 bg-white border border-border rounded-xl shadow-lg mt-1 overflow-hidden max-h-56 overflow-y-auto">
                      {locSugg.map((s, i) => (
                        <button key={i} type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyLocSuggestion(s)}
                          className="w-full text-left px-3 py-3 hover:bg-surface transition-colors border-b border-border last:border-0 min-h-[52px]">
                          <p className="text-sm font-medium text-ink font-sans truncate">{s.display_name.split(',')[0]}</p>
                          <p className="text-xs text-gray-400 font-sans truncate">{s.display_name.split(',').slice(1, 3).join(',').trim()}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {lat && lng && (
                  <p className="text-xs text-green-600 font-sans flex items-center gap-1">
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
                    {lang === 'de' ? 'Standort gesetzt' : 'Location set'} ({lat.toFixed(4)}, {lng.toFixed(4)})
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-500 font-sans font-medium">{tr.cityLabel}</label>
                <input type="text" placeholder={tr.cityPlaceholder}
                  value={city} onChange={(e) => setCity(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-3 text-sm text-ink placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-coffee/40 font-sans min-h-[48px]" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-500 font-sans font-medium">{tr.countryLabel}</label>
                <input type="text" placeholder={tr.countryPlaceholder}
                  value={country} onChange={(e) => setCountry(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-3 text-sm text-ink placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-coffee/40 font-sans min-h-[48px]" />
              </div>
            </div>
          )}

          {/* ── STEP 2: Rating sliders ─────────────────────────────────────── */}
          {step === 2 && (
            <div className="flex flex-col gap-8">
              {subScores.map(({ key, label, hint, info, val, set }) => {
                const pct = (val / 10) * 100;
                return (
                  <div key={key}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div style={{
                          fontFamily: '"DM Serif Display", Georgia, serif',
                          fontSize: 20, fontWeight: 700, color: '#1a1714',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          {label}
                          <button
                            type="button"
                            onClick={() => setOpenInfo(openInfo === key ? null : key)}
                            style={{ fontSize: 13, color: '#8a837e', background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 1 }}
                            aria-label="Info"
                          >ⓘ</button>
                        </div>
                        <div style={{ fontSize: 12, color: '#8a837e', marginTop: 2 }}>{hint}</div>
                      </div>
                      <div style={{
                        fontFamily: '"DM Serif Display", Georgia, serif',
                        fontSize: 28, fontWeight: 700, color: '#1a1714', lineHeight: 1, flexShrink: 0,
                      }}>
                        {val}<span style={{ fontSize: 14, color: '#8a837e', fontWeight: 400 }}>/10</span>
                      </div>
                    </div>

                    {openInfo === key && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800 font-sans leading-snug mb-3">
                        {info}
                      </div>
                    )}

                    <div className="relative flex items-center" style={{ height: 32 }}>
                      <div style={{
                        position: 'absolute', left: 0, right: 0,
                        top: '50%', transform: 'translateY(-50%)',
                        height: 3, borderRadius: 2, pointerEvents: 'none',
                        background: `linear-gradient(to right, #6B4A2A ${pct}%, rgba(26,23,20,0.12) ${pct}%)`,
                      }} />
                      <input
                        type="range" min={1} max={10} step={1}
                        value={val}
                        onChange={(e) => set(Number(e.target.value))}
                        className="ea-slider"
                        style={{ position: 'relative', zIndex: 1, width: '100%' }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Live score preview */}
              <div style={{
                textAlign: 'center', paddingTop: 16,
                borderTop: '1px solid rgba(26,23,20,0.10)',
              }}>
                <div style={{
                  fontFamily: '"DM Serif Display", Georgia, serif',
                  fontSize: 56, fontWeight: 700, lineHeight: 0.9,
                  color: bucketColor(liveScore), letterSpacing: -2,
                }}>
                  {liveScore.toFixed(1)}
                </div>
                <div style={{
                  fontSize: 10, color: '#8a837e', marginTop: 8,
                  letterSpacing: '1.5px', textTransform: 'uppercase',
                }}>
                  {scoreLabel(liveScore, lang)}
                </div>
              </div>

              {/* Ceramic cup */}
              <div className="flex items-center gap-3 min-h-[44px]">
                <input type="checkbox" id="ceramicCup" checked={ceramicCup}
                  onChange={(e) => setCeramicCup(e.target.checked)}
                  className="w-5 h-5 accent-coffee rounded shrink-0" />
                <label htmlFor="ceramicCup" className="text-sm text-ink font-sans flex-1 cursor-pointer">
                  {tr.ceramicCupLabel}
                  <span className="block text-xs text-gray-400">{tr.ceramicCupHint}</span>
                </label>
              </div>
            </div>
          )}

          {/* ── STEP 3: Comment + would_return + details ───────────────────── */}
          {step === 3 && (
            <div className="flex flex-col gap-7">

              {/* Comment textarea */}
              <div className="flex flex-col gap-1.5">
                <textarea
                  rows={4} maxLength={500}
                  placeholder={tr.commentPlaceholder}
                  value={comment} onChange={(e) => setComment(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-3 text-sm text-ink placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-coffee/40 font-sans resize-none"
                />
                <p className="text-xs text-gray-300 font-sans text-right">{comment.length}/500</p>
              </div>

              {/* Would return */}
              <div>
                <p style={{
                  fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase',
                  color: '#8a837e', marginBottom: 10, fontWeight: 700, fontFamily: '"DM Sans", system-ui, sans-serif',
                }}>{tr.wouldReturnQ}</p>
                <div className="flex gap-3">
                  {[
                    { v: true,  label: tr.wouldReturnYes },
                    { v: false, label: tr.wouldReturnNo },
                  ].map(({ v, label }) => (
                    <button
                      key={String(v)}
                      type="button"
                      onClick={() => setWouldReturn(wouldReturn === v ? null : v)}
                      style={{
                        flex: 1, padding: '12px',
                        borderRadius: 14, fontSize: 17, fontWeight: 700, letterSpacing: -0.3,
                        fontFamily: '"DM Serif Display", Georgia, serif',
                        fontStyle: 'italic',
                        border: wouldReturn === v ? 'none' : '1px solid #E0D8CC',
                        background: wouldReturn === v ? (v ? '#6B4A2A' : '#8B2A2A') : 'transparent',
                        color: wouldReturn === v ? '#F7F3EC' : '#8a837e',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                      }}
                    >
                      {label}.
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional details */}
              {!showDetails ? (
                <button type="button" onClick={() => setShowDetails(true)}
                  className="text-sm text-coffee font-semibold font-sans hover:underline text-left py-1 min-h-[44px]">
                  + {tr.addDetails}
                </button>
              ) : (
                <div className="flex flex-col gap-4">

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-500 font-sans font-medium">{tr.roasteryLabel}</label>
                    <input type="text" placeholder={tr.roasteryPlaceholder}
                      value={roastery} onChange={(e) => setRoastery(e.target.value)}
                      className="w-full border border-border rounded-xl px-3 py-3 text-sm text-ink placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-coffee/40 font-sans min-h-[48px]" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-500 font-sans font-medium">{tr.priceLabel}</label>
                    <div className="flex gap-2">
                      <input type="number" step="0.10" min="0" max="99" placeholder="1.80"
                        value={price} onChange={(e) => setPrice(e.target.value)}
                        className="flex-1 border border-border rounded-xl px-3 py-3 text-sm text-ink placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-coffee/40 font-sans min-h-[48px]" />
                      <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                        className="border border-border rounded-xl px-3 py-3 text-sm text-ink font-sans focus:outline-none focus:ring-2 focus:ring-coffee/40 bg-white min-h-[48px]">
                        {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-500 font-sans font-medium">{tr.photoLabel}</label>
                    {photoPreview ? (
                      <div className="relative">
                        <img src={photoPreview} alt="preview" className="w-full rounded-xl object-cover max-h-48" />
                        <button type="button" onClick={removePhoto}
                          className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/80 transition-colors">
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-border rounded-xl py-8 flex flex-col items-center gap-2 text-gray-400 hover:border-coffee hover:text-coffee transition-colors min-h-[80px]">
                        <span className="text-3xl">📷</span>
                        <span className="text-sm font-sans">{tr.addPhoto}</span>
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-score-red bg-red-50 border border-red-100 rounded-xl px-4 py-3 font-sans">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky footer ───────────────────────────────────────────────────── */}
      <div
        className="sticky bottom-0 bg-surface border-t border-border px-5 py-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={step === 1 && !step1Valid}
            className="w-full bg-coffee text-white rounded-2xl py-4 text-base font-semibold font-sans disabled:opacity-40 transition-opacity hover:opacity-90 shadow-md min-h-[52px]"
          >
            {tr.nextStep}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!step1Valid || saving}
            className="w-full bg-coffee text-white rounded-2xl py-4 text-base font-semibold font-sans disabled:opacity-40 transition-opacity hover:opacity-90 shadow-md min-h-[52px]"
          >
            {geocoding ? tr.geocoding : saving ? tr.saving : tr.submitReview}
          </button>
        )}
      </div>
    </div>
  );
}
