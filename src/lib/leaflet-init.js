// Side-effect module: ensures window.L points at the same Leaflet
// instance Vite bundles, so plugins published as UMD (e.g.
// leaflet.markercluster) can attach to it.
//
// MapComponent imports this file *before* importing the plugin to keep
// the evaluation order deterministic — ES module imports run in
// declaration order within a module.

import L from 'leaflet';

if (typeof window !== 'undefined' && !window.L) {
  window.L = L;
}
