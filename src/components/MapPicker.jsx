import { useEffect, useRef } from 'react';
import L from 'leaflet';

/**
 * Full-screen map overlay — user pans until the crosshair is on the venue,
 * then taps "Confirm". Returns { lat, lng } via onConfirm.
 */
export default function MapPicker({ isOpen, initialLat, initialLng, onConfirm, onCancel, lang }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      return;
    }
    if (mapRef.current || !containerRef.current) return;

    const lat = initialLat || 48.2;
    const lng = initialLng || 16.37;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom:   initialLat ? 16 : 13,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 60);

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [isOpen, initialLat, initialLng]);

  function handleConfirm() {
    if (!mapRef.current) return;
    const { lat, lng } = mapRef.current.getCenter();
    onConfirm(lat, lng);
  }

  if (!isOpen) return null;

  const labelPan  = lang === 'de' ? 'Karte verschieben, bis das Kreuz auf dem Lokal liegt' : 'Pan until the crosshair is on the venue';
  const labelOk   = lang === 'de' ? 'Standort bestätigen' : 'Confirm location';
  const labelBack = lang === 'de' ? 'Abbrechen' : 'Cancel';

  return (
    <div className="fixed inset-0 z-[600] flex flex-col bg-black">

      {/* Instruction banner */}
      <div
        className="absolute top-0 left-0 right-0 z-10 bg-black/60 text-white text-center text-sm font-sans px-4 py-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        {labelPan}
      </div>

      {/* Map */}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />

      {/* Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <svg width={44} height={44} viewBox="0 0 44 44" fill="none">
          <circle cx={22} cy={22} r={9} stroke="#1A1A1A" strokeWidth={2.5} fill="white" fillOpacity={0.75} />
          <line x1={22} y1={2}  x2={22} y2={13} stroke="#1A1A1A" strokeWidth={2.5} strokeLinecap="round" />
          <line x1={22} y1={31} x2={22} y2={42} stroke="#1A1A1A" strokeWidth={2.5} strokeLinecap="round" />
          <line x1={2}  y1={22} x2={13} y2={22} stroke="#1A1A1A" strokeWidth={2.5} strokeLinecap="round" />
          <line x1={31} y1={22} x2={42} y2={22} stroke="#1A1A1A" strokeWidth={2.5} strokeLinecap="round" />
        </svg>
      </div>

      {/* Bottom buttons */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 bg-white flex gap-3 px-4"
        style={{ paddingTop: 12, paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-[48px] border border-border rounded-xl text-sm font-semibold font-sans text-ink hover:bg-surface transition-colors"
        >
          {labelBack}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 min-h-[48px] bg-coffee text-white rounded-xl text-sm font-semibold font-sans hover:opacity-90 transition-opacity"
        >
          {labelOk}
        </button>
      </div>
    </div>
  );
}
