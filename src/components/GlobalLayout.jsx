import { Outlet, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t } from '../lib/i18n';
import { supabase } from '../lib/supabase';

function NavTab({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 3,
        minHeight: 44, paddingTop: 8, paddingBottom: 8,
        background: 'none', border: 'none', cursor: 'pointer',
        color: active ? '#6B4A2A' : '#9CA3AF',
        borderTop: active ? '2px solid #6B4A2A' : '2px solid transparent',
        transition: 'color 0.15s, border-color 0.15s',
      }}
    >
      {icon}
      <span style={{
        fontSize: 10, fontWeight: 400, fontFamily: '"DM Sans", system-ui, sans-serif',
        letterSpacing: '0.02em',
      }}>
        {label}
      </span>
    </button>
  );
}

export default function GlobalLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user }  = useAuth();
  const { lang }  = useLang();
  const tr        = t(lang);

  const urlTab    = searchParams.get('tab') || 'map';
  const activeTab = location.pathname === '/' ? urlTab
    : location.pathname.startsWith('/venue') ? 'map'
    : null;

  function goTab(tab) {
    if (location.pathname === '/') {
      setSearchParams({ tab }, { replace: true });
    } else {
      navigate(`/?tab=${tab}`);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  return (
    <>
      <Outlet />

      {/* FAB */}
      {user && (
        <button
          onClick={() => navigate('/review')}
          aria-label={tr.addReview}
          style={{
            position: 'fixed', zIndex: 450,
            bottom: 'calc(72px + env(safe-area-inset-bottom))', right: 16,
            background: '#1a1714', width: 56, height: 56, borderRadius: '50%',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.28)',
            color: '#FAF0E6', fontSize: 28, fontWeight: 300, lineHeight: 1,
          }}
        >
          +
        </button>
      )}

      {/* Bottom navigation */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 500,
        background: '#FAF0E6', borderTop: '1px solid #E0D8CC',
        display: 'flex', alignItems: 'stretch',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <NavTab
          active={activeTab === 'map'}
          onClick={() => goTab('map')}
          label={tr.mapTab}
          icon={
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
              <line x1="9" y1="3" x2="9" y2="18" />
              <line x1="15" y1="6" x2="15" y2="21" />
            </svg>
          }
        />
        <NavTab
          active={activeTab === 'index'}
          onClick={() => goTab('index')}
          label={tr.indexTab}
          icon={
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6"  x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6"  x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          }
        />
        <NavTab
          active={activeTab === 'about'}
          onClick={() => goTab('about')}
          label={tr.aboutTab}
          icon={
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="8.01" />
              <line x1="12" y1="12" x2="12" y2="16" />
            </svg>
          }
        />

        {/* Sign out — small, right edge, only when logged in */}
        {user && (
          <button
            onClick={handleSignOut}
            title={tr.signOut}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 3,
              paddingTop: 8, paddingBottom: 8, paddingLeft: 10, paddingRight: 14,
              background: 'none', border: 'none', borderTop: '2px solid transparent',
              cursor: 'pointer', color: '#C4BAB2',
            }}
          >
            {/* door-exit icon */}
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span style={{ fontSize: 9, fontWeight: 400, fontFamily: '"DM Sans", system-ui, sans-serif', letterSpacing: '0.02em' }}>
              {tr.signOut}
            </span>
          </button>
        )}
      </nav>
    </>
  );
}
