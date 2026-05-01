import { useNavigate } from 'react-router-dom';

const CUP_SVG = (size, color) => (
  <svg
    width={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color, display: 'block' }}
  >
    <path className="ea-steam"             d="M9 5 Q11 3 9 1" />
    <path className="ea-steam ea-steam-2"  d="M13 5 Q11 3 13 1" />
    <path d="M5 6 L19 6 L17 15 Q17 17 15 17 L9 17 Q7 17 7 15 Z" />
    <path d="M18.5 9 C 22 9 22 13 18.5 13" />
    <path d="M3 18 Q12 19 21 18" />
  </svg>
);

/**
 * Espresso cup mark with animated steam.
 * @param {object}    props
 * @param {number}    [props.size=30]
 * @param {string}    [props.color='#1a1714']
 * @param {boolean}   [props.interactive=true] — when false, render as a
 *   plain inline element with no click behaviour (welcome-screen use).
 * @param {function}  [props.onClick] — override the default 'reset to
 *   home' navigation. Used by HomePage to reset its internal map state
 *   without re-navigating (we're already on /?tab=map there).
 */
export default function CupLogo({
  size = 30,
  color = '#1a1714',
  interactive = true,
  onClick,
}) {
  const navigate = useNavigate();
  if (!interactive) {
    return (
      <span
        aria-hidden="true"
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        {CUP_SVG(size, color)}
      </span>
    );
  }
  function handleDefaultClick() {
    // Cross-page reset: clear focus markers, raise the reset flag, and
    // navigate to the map. HomePage's effect picks up the flag on mount
    // / URL change and snaps the map to the Europe default.
    try {
      sessionStorage.removeItem('ea_last_venue');
      sessionStorage.removeItem('ea_last_tab');
      sessionStorage.setItem('ea_reset_map', '1');
    } catch {}
    navigate('/?tab=map');
  }
  return (
    <button
      type="button"
      onClick={onClick || handleDefaultClick}
      aria-label="Espresso Atlas"
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0 }}
    >
      {CUP_SVG(size, color)}
    </button>
  );
}
