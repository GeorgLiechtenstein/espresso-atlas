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
      <svg width={22} height={18} viewBox="0 0 26 22" style={{ color: '#1a1714' }} fill="currentColor">
        <path className="ea-steam" d="M9 2 Q10.5 4 9 6" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
        <path className="ea-steam ea-steam-2" d="M13 2 Q14.5 4 13 6" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
        <path d="M4.5 8 L5.5 17 Q5.8 19 8 19 L14 19 Q16.2 19 16.5 17 L17.5 8 Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
        <path d="M17.5 10 Q21 10 21 12.5 Q21 15 17.5 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <ellipse cx="11" cy="20.2" rx="9" ry="1.2" fill="none" stroke="currentColor" strokeWidth="1"/>
      </svg>
    </button>
  );
}
