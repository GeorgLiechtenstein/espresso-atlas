import { useNavigate } from 'react-router-dom';

export default function CupLogo() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate('/?tab=map')}
      aria-label="Espresso Atlas"
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0 }}
    >
      <svg
        width={30}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: '#1a1714', display: 'block' }}
      >
        <path className="ea-steam"             d="M9 5 Q11 3 9 1" />
        <path className="ea-steam ea-steam-2"  d="M13 5 Q11 3 13 1" />
        <path d="M5 6 L19 6 L17 15 Q17 17 15 17 L9 17 Q7 17 7 15 Z" />
        <path d="M18.5 9 C 22 9 22 13 18.5 13" />
        <path d="M3 18 Q12 19 21 18" />
      </svg>
    </button>
  );
}
