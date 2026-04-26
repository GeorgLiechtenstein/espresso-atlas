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
        <path className="ea-steam"             d="M9 8 Q11 5 9 2" />
        <path className="ea-steam ea-steam-2"  d="M13 8 Q11 5 13 2" />
        <path d="M5 10 L19 10 L17 19 Q17 21 15 21 L9 21 Q7 21 7 19 Z" />
        <path d="M18.5 13 C 22 13 22 17 18.5 17" />
        <path d="M3 22 Q12 23 21 22" />
      </svg>
    </button>
  );
}
