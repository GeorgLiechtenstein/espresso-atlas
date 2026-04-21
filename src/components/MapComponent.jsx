import { useEffect, useRef } from 'react';
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
  if (n >= 4)   return { fill: '#F7F3EC', stroke: '#8a7a62', text: '#4a3a28', hollow: true };
  return { fill: '#8B2A2A', stroke: '#8B2A2A', text: '#F7F3EC', hollow: false };
}

/**
 * MapComponent
 *
 * @param {object}      props
 * @param {Array}       props.venues          – venue rows from Supabase
 * @param {function}    props.onPinClick      – called with full venue object on pin tap
 * @param {string|null} props.flyToId         – venue id to fly to
 * @param {boolean}     [props.locateOnMount] – request geolocation immediately on first init
 * @param {string}      [props.height='100%']
 */
export default function MapComponent({
  venues = [],
  onPinClick,
  flyToId,
  locateOnMount = false,
  height = '100%',
}) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markersRef   = useRef({});
  const pinClickRef  = useRef(onPinClick); // stable ref — avoids stale closures

  // Keep callback ref fresh
  useEffect(() => { pinClickRef.current = onPinClick; }, [onPinClick]);

  // ── Init map ONCE ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [46, 15],
      zoom: 5,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Minimal attribution — bottom left, small
    L.control.attribution({ position: 'bottomleft', prefix: false })
      .addAttribution('© <a href="https://openstreetmap.org" target="_blank">OSM</a>')
      .addTo(map);

    mapRef.current = map;

    // First-visit geolocation
    if (locateOnMount && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.flyTo([pos.coords.latitude, pos.coords.longitude], 13, { duration: 1.5 });
          localStorage.setItem('em_geo_asked', '1');
        },
        () => { localStorage.setItem('em_geo_asked', '1'); },
        { timeout: 8000 }
      );
    }

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, []); // eslint-disable-line

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
  function handleLocate() {
    if (!mapRef.current || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => mapRef.current.flyTo([pos.coords.latitude, pos.coords.longitude], 14, { duration: 1.2 }),
      () => {}
    );
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Pin legend */}
      <div style={{ zIndex: 1000, top: 12, left: 12 }}
           className="absolute bg-white/90 backdrop-blur-sm border border-border rounded-lg px-2.5 py-2 shadow-sm">
        <div className="text-[8px] font-semibold font-sans tracking-widest text-gray-400 uppercase mb-1.5">Urteil</div>
        {[
          { fill: '#1a1714', stroke: null, label: 'Exzellent' },
          { fill: '#6B4A2A', stroke: null, label: 'Gut' },
          { fill: '#F7F3EC', stroke: '#8a7a62', label: 'Mittel' },
          { fill: '#8B2A2A', stroke: null, label: 'Meiden' },
        ].map(({ fill, stroke, label }) => (
          <div key={label} className="flex items-center gap-1.5 mb-0.5 last:mb-0">
            <div style={{
              width: 9, height: 9, borderRadius: '50%',
              background: fill,
              border: stroke ? `1.5px solid ${stroke}` : '1px solid rgba(255,255,255,0.2)',
              flexShrink: 0,
            }}/>
            <span className="text-[10px] font-sans text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Google Maps-style locate FAB */}
      <button
        type="button"
        onClick={handleLocate}
        aria-label="Mein Standort"
        style={{ zIndex: 1000, bottom: 'calc(72px + 16px + env(safe-area-inset-bottom))', right: 16 }}
        className="absolute w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center
          hover:bg-gray-50 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-coffee"
      >
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          <circle cx="12" cy="12" r="8" strokeDasharray="2 2" strokeOpacity={0.3} />
        </svg>
      </button>
    </div>
  );
}
