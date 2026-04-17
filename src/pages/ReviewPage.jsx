import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t, scoreLabel } from '../lib/i18n';
import LangToggle from '../components/LangToggle';
import NumberPicker from '../components/NumberPicker';
import ScoreBadge from '../components/ScoreBadge';

const CURRENCIES = ['EUR', 'CHF', 'USD', 'GBP', 'TRY', 'IQD'];

// Geocode via Nominatim (fallback when no explicit coordinates)
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
  const { venueId: preVenueId } = useParams(); // present when editing
  const navigate                = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { lang } = useLang();
  const tr = t(lang);

  const isEdit = Boolean(preVenueId);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { replace: true });
  }, [user, authLoading, navigate]);

  // ── Venue fields ────────────────────────────────────────────────────────────
  const [name,     setName]     = useState('');
  const [city,     setCity]     = useState('');
  const [country,  setCountry]  = useState('');
  const [lat,      setLat]      = useState(null);
  const [lng,      setLng]      = useState(null);
  const [roastery, setRoastery] = useState('');

  // ── Rating fields ───────────────────────────────────────────────────────────
  const [body,    setBody]    = useState(0);
  const [balance, setBalance] = useState(0);
  const [crema,   setCrema]   = useState(0);
  const [overall, setOverall] = useState(0);
  const [ceramicCup, setCeramicCup] = useState(false);
  const [comment, setComment] = useState('');
  const [price,   setPrice]   = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [photo,   setPhoto]   = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // ── Location picker ─────────────────────────────────────────────────────────
  const [locSearch,    setLocSearch]    = useState('');
  const [locSugg,      setLocSugg]      = useState([]);
  const [openInfo,     setOpenInfo]     = useState(null);
  const [locating,     setLocating]     = useState(false);
  const locTimer = useRef(null);
  const locJustSelected = useRef(false);

  // ── Submit state ────────────────────────────────────────────────────────────
  const [saving,    setSaving]    = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error,     setError]     = useState('');

  const fileInputRef = useRef(null);

  // Load existing venue data when editing
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
        setRoastery(data.roastery || '');
        setBody(data.body || 0);
        setBalance(data.balance || 0);
        setCrema(data.crema || 0);
        setOverall(data.overall || 0);
        setCeramicCup(data.ceramic_cup || false);
        setComment(data.comment || '');
        setPrice(data.price != null ? String(data.price) : '');
        setCurrency(data.currency || 'EUR');
        setExistingPhotoUrl(data.photo_url || null);
        if (data.photo_url) setPhotoPreview(data.photo_url);
        if (data.comment || data.price || data.photo_url || data.roastery || data.ceramic_cup) setShowDetails(true);
      });
  }, [preVenueId]);

  // Nominatim autocomplete for address/location
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
    const addr    = s.address || {};
    const vName   = addr.amenity || addr.name || addr.shop || addr.cafe || addr.restaurant
                    || s.display_name.split(',')[0].trim();
    const vCity   = addr.city || addr.town || addr.village || addr.municipality || '';
    const vCountry = addr.country || '';
    setLat(parseFloat(s.lat));
    setLng(parseFloat(s.lon));
    if (!name && vName)      setName(vName);
    if (!city && vCity)      setCity(vCity);
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
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${gLat}&lon=${gLng}&format=json&addressdetails=1`,
            { headers: { 'Accept-Language': lang === 'de' ? 'de' : 'en' } });
          const data = await res.json();
          const addr = data.address || {};
          if (!city    && (addr.city    || addr.town || addr.village)) setCity(addr.city || addr.town || addr.village);
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

  const liveScore = (body > 0 && balance > 0 && crema > 0 && overall > 0)
    ? Math.round(((body + balance + crema + overall) / 4) * 100) / 100
    : null;

  const canSubmit = name.trim() && city.trim() && country.trim()
    && body > 0 && balance > 0 && crema > 0 && overall > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim() || !city.trim() || !country.trim()) { setError(tr.errFillVenue); return; }
    if (!body || !balance || !crema || !overall) { setError(tr.errNoRating); return; }

    setSaving(true);
    try {
      // Resolve coordinates
      let resolvedLat = lat, resolvedLng = lng;
      if (!resolvedLat || !resolvedLng) {
        setGeocoding(true);
        const coords = await geocode(name, city, country);
        setGeocoding(false);
        resolvedLat = coords.lat; resolvedLng = coords.lng;
      }

      // Upload photo if new
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

      const payload = {
        name: name.trim(), city: city.trim(), country: country.trim(),
        lat: resolvedLat, lng: resolvedLng,
        body, balance, crema, overall,
        ceramic_cup: ceramicCup || null,
        roastery: roastery.trim() || null,
        comment:  comment.trim() || null,
        price:    price ? parseFloat(price) : null,
        currency,
        photo_url: photoUrl,
        rated_at: new Date().toISOString(),
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

  return (
    <div className="min-h-screen bg-surface pb-10">
      <header className="sticky top-0 z-50 bg-white border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="min-w-[44px] min-h-[44px] -ml-2 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          aria-label="Back"
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="font-serif text-lg text-ink flex-1">
          {isEdit ? tr.editPageTitle : tr.reviewPageTitle}
        </h1>
        <LangToggle />
      </header>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 pt-5 flex flex-col gap-5">

        {/* ── LOKAL ──────────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-border px-4 pt-4 pb-5 flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-sans">
            {tr.venueSection}
          </h2>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 font-sans font-medium">{tr.nameLabel}</label>
            <input
              type="text" required placeholder={tr.namePlaceholder}
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-3 text-sm text-ink placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-coffee/40 font-sans min-h-[48px]"
            />
          </div>

          {/* Address / location picker */}
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
              {/* GPS */}
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
              {/* Autocomplete */}
              {locSugg.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-30 bg-white border border-border rounded-xl shadow-lg mt-1 overflow-hidden max-h-56 overflow-y-auto">
                  {locSugg.map((s, i) => (
                    <button key={i} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyLocSuggestion(s)}
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

          {/* City */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 font-sans font-medium">{tr.cityLabel}</label>
            <input type="text" required placeholder={tr.cityPlaceholder}
              value={city} onChange={(e) => setCity(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-3 text-sm text-ink placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-coffee/40 font-sans min-h-[48px]" />
          </div>

          {/* Country */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 font-sans font-medium">{tr.countryLabel}</label>
            <input type="text" required placeholder={tr.countryPlaceholder}
              value={country} onChange={(e) => setCountry(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-3 text-sm text-ink placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-coffee/40 font-sans min-h-[48px]" />
          </div>
        </section>

        {/* ── BEWERTUNG ──────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-border px-4 py-4 flex flex-col gap-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-sans">
            {tr.ratingSection}
          </h2>

          {subScores.map(({ key, label, hint, info, val, set }) => (
            <div key={key} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div>
                    <p className="text-base font-semibold text-ink font-sans">{label}</p>
                    <p className="text-xs text-gray-400 font-sans">{hint}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenInfo(openInfo === key ? null : key)}
                    className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-coffee transition-colors shrink-0"
                    aria-label="Info"
                  >
                    ⓘ
                  </button>
                </div>
                {val > 0 && <span className="text-sm font-bold text-score-gold font-sans">{val}/10</span>}
              </div>
              {openInfo === key && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800 font-sans leading-snug">
                  {info}
                </div>
              )}
              <NumberPicker value={val} onChange={set} />
            </div>
          ))}

          {liveScore !== null && (
            <div className="flex items-center gap-4 bg-surface rounded-xl px-4 py-3">
              <ScoreBadge score={liveScore} size={52} showLabel />
              <div>
                <p className="text-xs text-gray-400 font-sans">{tr.yourScore}</p>
                <p className="text-2xl font-bold text-ink font-sans leading-none">{liveScore.toFixed(2)}</p>
                <p className="text-sm font-semibold mt-0.5 font-sans" style={{ color: '#6F4E37' }}>
                  {scoreLabel(liveScore, lang)}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ── DETAILS (optional) ─────────────────────────────────────────────── */}
        {!showDetails ? (
          <button type="button" onClick={() => setShowDetails(true)}
            className="text-sm text-coffee font-semibold font-sans hover:underline text-center py-2 min-h-[44px]">
            + {tr.addDetails}
          </button>
        ) : (
          <section className="bg-white rounded-2xl border border-border px-4 py-4 flex flex-col gap-4">

            {/* Keramiktasse */}
            <div className="flex items-center gap-3 min-h-[44px]">
              <input
                type="checkbox" id="ceramicCup"
                checked={ceramicCup}
                onChange={(e) => setCeramicCup(e.target.checked)}
                className="w-5 h-5 accent-coffee rounded shrink-0"
              />
              <label htmlFor="ceramicCup" className="text-sm text-ink font-sans flex-1 cursor-pointer">
                {tr.ceramicCupLabel}
                <span className="block text-xs text-gray-400 font-sans">{tr.ceramicCupHint}</span>
              </label>
            </div>

            {/* Rösterei */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-sans font-medium">{tr.roasteryLabel}</label>
              <input type="text" placeholder={tr.roasteryPlaceholder}
                value={roastery} onChange={(e) => setRoastery(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-3 text-sm text-ink placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-coffee/40 font-sans min-h-[48px]" />
            </div>

            {/* Kommentar */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-sans font-medium">{tr.commentLabel}</label>
              <textarea
                rows={3} maxLength={500} placeholder={tr.commentPlaceholder}
                value={comment} onChange={(e) => setComment(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-3 text-sm text-ink placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-coffee/40 font-sans resize-none"
              />
              <p className="text-xs text-gray-300 font-sans text-right">{comment.length}/500</p>
            </div>

            {/* Preis */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-sans font-medium">{tr.priceLabel}</label>
              <div className="flex gap-2">
                <input
                  type="number" step="0.10" min="0" max="99" placeholder="1.80"
                  value={price} onChange={(e) => setPrice(e.target.value)}
                  className="flex-1 border border-border rounded-xl px-3 py-3 text-sm text-ink placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-coffee/40 font-sans min-h-[48px]"
                />
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                  className="border border-border rounded-xl px-3 py-3 text-sm text-ink font-sans focus:outline-none focus:ring-2 focus:ring-coffee/40 bg-white min-h-[48px]">
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Foto */}
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
          </section>
        )}

        {/* ── ERROR + SUBMIT ─────────────────────────────────────────────────── */}
        {error && (
          <p className="text-sm text-score-red bg-red-50 border border-red-100 rounded-xl px-4 py-3 font-sans">
            {error}
          </p>
        )}

        <button type="submit" disabled={!canSubmit || saving}
          className="w-full bg-coffee text-white rounded-2xl py-4 text-base font-semibold font-sans disabled:opacity-40 transition-opacity hover:opacity-90 shadow-md min-h-[52px]">
          {geocoding ? tr.geocoding : saving ? tr.saving : tr.submitReview}
        </button>

      </form>

    </div>
  );
}
