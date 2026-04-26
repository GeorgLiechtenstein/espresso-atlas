import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pinBucket(score) {
  if (score === null || score === undefined) {
    return { fill: '#9CA3AF', stroke: '#9CA3AF', text: '#fff', hollow: false };
  }
  const n = parseFloat(score);
  if (n >= 8.5) return { fill: '#1a1714', stroke: '#1a1714', text: '#F7F3EC', hollow: false };
  if (n >= 7)   return { fill: '#6B4A2A', stroke: '#6B4A2A', text: '#F7F3EC', hollow: false };
  if (n >= 4)   return { fill: '#C4B5A0', stroke: '#C4B5A0', text: '#4a3a28', hollow: false };
  return { fill: '#8B2A2A', stroke: '#8B2A2A', text: '#F7F3EC', hollow: false };
}

/**
 * MapComponent
 *
 * @param {object}      props
 * @param {Array}       props.venues          – venue rows from Supabase
 * @param {function}    props.onPinClick      – called with full venue object on pin tap
 * @param {string|null} props.flyToId         – venue id to fly to
 * @param {string}      [props.lang='de']
 * @param {string}      [props.height='100%']
 */
function tileUrl(lang) {
  return lang === 'de'
    ? 'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
}

export default function MapComponent({
  venues = [],
  onPinClick,
  flyToId,
  lang = 'de',
  height = '100%',
}) {
  const containerRef   = useRef(null);
  const mapRef         = useRef(null);
  const tileLayerRef   = useRef(null);
  const markersRef     = useRef({});
  const pinClickRef    = useRef(onPinClick); // stable ref — avoids stale closures
  const [locateError, setLocateError] = useState(null);
  const [showAskBanner, setShowAskBanner] = useState(false);

  // Coarse initial centring on the user's region.
  function requestInitPosition() {
    if (!mapRef.current || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 9, { duration: 1.5 });
      },
      (err) => {
        console.warn('[map init geolocation] code=' + err.code + ' message=' + err.message);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  }

  // Keep callback ref fresh
  useEffect(() => { pinClickRef.current = onPinClick; }, [onPinClick]);

  // ── Init map ONCE ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [48.5, 10],   // Europe-centred fallback
      zoom: 5,
      zoomControl: false,
      attributionControl: false,
    });

    // Minimal attribution — bottom left, small
    L.control.attribution({ position: 'bottomleft', prefix: false })
      .addAttribution('© <a href="https://openstreetmap.org" target="_blank">OSM</a>')
      .addTo(map);

    mapRef.current = map;

    // Geolocation flow:
    //   granted → silent fetch (no dialog needed, no gesture needed)
    //   denied  → silent (don't nag; locate FAB still works with help toast)
    //   prompt / API broken / no API → show modal; user's tap on "Ja"
    //     becomes the gesture that's required on iOS Safari for
    //     getCurrentPosition to actually trigger the native dialog
    const supportsGeo = typeof navigator !== 'undefined'
      && navigator.geolocation
      && (typeof window === 'undefined' || window.isSecureContext !== false);
    if (supportsGeo) {
      const offerModal = () => {
        try {
          if (!sessionStorage.getItem('em_geo_dismissed')) setShowAskBanner(true);
        } catch { setShowAskBanner(true); }
      };
      if (navigator.permissions?.query) {
        navigator.permissions.query({ name: 'geolocation' })
          .then((res) => {
            if (res.state === 'granted') {
              requestInitPosition();
            } else if (res.state === 'prompt') {
              offerModal();
            }
            // 'denied' → silent
          })
          // Older Safari (pre-16.4) rejects geolocation queries — and on
          // iOS Safari calling getCurrentPosition outside a user gesture
          // is silently dropped. Show the modal instead and let the
          // user's tap supply the gesture.
          .catch(offerModal);
      } else {
        offerModal();
      }
    } else {
      console.warn('[map init geolocation] not supported (geo=' + !!navigator.geolocation + ', secureCtx=' + (typeof window === 'undefined' ? 'n/a' : window.isSecureContext) + ')');
    }

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      markersRef.current = {};
    };
  }, []); // eslint-disable-line

  // ── Swap tile layer on lang change ────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(tileUrl(lang), { maxZoom: 19 }).addTo(map);
  }, [lang]);

  // ── Sync markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const newIds = new Set(venues.map((v) => v.id));

    // Remove stale markers
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      if (!newIds.has(id)) { marker.remove(); delete markersRef.current[id]; }
    });

    venues.forEach((venue) => {
      const lat = parseFloat(venue.lat);
      const lng = parseFloat(venue.lng);
      if (!lat || !lng) return;

      const score = venue.avg_score !== null ? parseFloat(venue.avg_score) : null;
      const { fill, stroke, text, hollow } = pinBucket(score);
      const label = score !== null ? score.toFixed(1) : '·';

      const border = hollow
        ? `2px solid ${stroke}`
        : `2px solid rgba(255,255,255,0.25)`;

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:40px;height:40px;
          background:${fill};
          color:${text};
          border:${border};
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:700;
          font-family:'DM Sans',system-ui,sans-serif;
          box-shadow:0 3px 10px rgba(0,0,0,.22);
          cursor:pointer;
          user-select:none;
        ">${escapeHtml(label)}</div>`,
        iconSize:   [40, 40],
        iconAnchor: [20, 20],
      });

      if (markersRef.current[venue.id]) {
        markersRef.current[venue.id].setLatLng([lat, lng]).setIcon(icon);
      } else {
        const marker = L.marker([lat, lng], { icon }).addTo(map);
        // Capture venue in closure — pinClickRef gives latest callback
        marker.on('click', () => { pinClickRef.current?.(venue); });
        markersRef.current[venue.id] = marker;
      }
    });
  }, [venues]);

  // ── Fly to ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!flyToId || !mapRef.current) return;
    const marker = markersRef.current[flyToId];
    if (marker) mapRef.current.flyTo(marker.getLatLng(), 15, { duration: 1.0 });
  }, [flyToId]);

  // ── Locate ────────────────────────────────────────────────────────────────
  // locateError: { msg, durationMs } | null. Auto-clears after the duration.
  useEffect(() => {
    if (!locateError) return;
    const t = setTimeout(() => setLocateError(null), locateError.durationMs);
    return () => clearTimeout(t);
  }, [locateError]);

  function handleAllowLocation() {
    setShowAskBanner(false);
    requestInitPosition();
  }

  function handleDismissAsk() {
    setShowAskBanner(false);
    try { sessionStorage.setItem('em_geo_dismissed', '1'); } catch {}
  }

  function handleLocate() {
    setShowAskBanner(false);
    if (!mapRef.current) return;

    const showError = (code) => {
      // Code 1 = the user (or a previous "block" choice) is denying us. Tell
      // them how to fix it. Codes 2/3 + secure-context fallback are
      // environmental — generic message.
      const isDenied = code === 1;
      const msg = isDenied
        ? (lang === 'de'
            ? 'Standort blockiert. In den Browser-Einstellungen für diese Seite erlauben.'
            : 'Location blocked. Allow it in this site’s browser settings.')
        : (lang === 'de' ? 'Standort nicht verfügbar' : 'Location not available');
      setLocateError({ msg, durationMs: isDenied ? 6000 : 3000 });
    };

    // Geolocation needs a Secure Context — Firefox blocks it on plain HTTP
    // without firing the error callback in some builds. Bail early.
    if (!navigator.geolocation || (typeof window !== 'undefined' && window.isSecureContext === false)) {
      showError(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo(
          [pos.coords.latitude, pos.coords.longitude],
          13,                     // ~5km horizontal — user + nearby pins
          { duration: 1.2 }
        );
      },
      // err.code: 1 PERMISSION_DENIED, 2 POSITION_UNAVAILABLE, 3 TIMEOUT.
      // Same enum across Chrome / Safari / Firefox.
      (err) => {
        console.warn('[locate FAB] code=' + err.code + ' message=' + err.message);
        showError(err.code);
      },
      // High accuracy = GPS on mobile, Wi-Fi triangulation on desktop.
      // Slower (2–10s warm-up) but the user explicitly tapped, so the
      // wait is acceptable. 15s timeout to give GPS time to lock.
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Google Maps-style locate FAB — fixed to viewport so it's always
          visible regardless of map state, sat above the +Review FAB. */}
      <button
        type="button"
        onClick={handleLocate}
        aria-label="Mein Standort"
        style={{
          position: 'fixed', zIndex: 1000,
          bottom: 'calc(72px + 56px + 16px + env(safe-area-inset-bottom))',
          right: 16,
          width: 48, height: 48,
        }}
        className="bg-white rounded-full shadow-lg flex items-center justify-center
          hover:bg-gray-50 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-coffee"
      >
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          <circle cx="12" cy="12" r="8" strokeDasharray="2 2" strokeOpacity={0.3} />
        </svg>
      </button>

      {locateError && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(72px + 56px + 16px + 48px + 12px + env(safe-area-inset-bottom))',
          left: 16, right: 16,
          textAlign: 'center', pointerEvents: 'none', zIndex: 1001,
        }}>
          <span style={{
            display: 'inline-block',
            maxWidth: 320,
            background: 'rgba(26,23,20,0.92)', color: '#FAF0E6',
            padding: '10px 18px', borderRadius: 16,
            fontSize: 13, fontWeight: 500, lineHeight: 1.4,
            fontFamily: '"DM Sans", system-ui, sans-serif',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          }}>{locateError.msg}</span>
        </div>
      )}

      {showAskBanner && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1002,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}>
          <div
            role="dialog"
            aria-modal="true"
            style={{
              maxWidth: 360, width: '100%',
              background: '#FAF0E6', borderRadius: 16,
              boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
              padding: '22px',
              display: 'flex', flexDirection: 'column', gap: 18,
            }}
          >
            <p style={{
              margin: 0, fontSize: 15, lineHeight: 1.45, color: '#1a1714',
              fontFamily: '"DM Sans", system-ui, sans-serif',
            }}>
              {lang === 'de'
                ? 'Darf Espresso Atlas Deinen Standort verwenden? So findest Du Bewertungen in Deiner Nähe.'
                : 'Can Espresso Atlas use your location? This helps you find reviews nearby.'}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleDismissAsk}
                style={{
                  padding: '10px 16px', minHeight: 44,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, color: '#555555',
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                }}
              >
                {lang === 'de' ? 'Nein danke' : 'No thanks'}
              </button>
              <button
                type="button"
                onClick={handleAllowLocation}
                style={{
                  padding: '10px 18px', minHeight: 44,
                  background: '#6B4A2A', color: '#FAF0E6',
                  border: 'none', borderRadius: 10, cursor: 'pointer',
                  fontSize: 14, fontWeight: 600,
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                }}
              >
                {lang === 'de' ? 'Ja' : 'Yes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
