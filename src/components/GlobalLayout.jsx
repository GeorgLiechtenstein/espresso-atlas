import { Outlet, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t } from '../lib/i18n';
import { supabase } from '../lib/supabase';

function NavTab({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 44,
        background: 'none', border: 'none', cursor: 'pointer',
        color: active ? '#6F4E37' : '#555555',
        borderTop: active ? '2px solid #6F4E37' : '2px solid transparent',
        transition: 'color 0.15s, border-color 0.15s',
      }}
    >
      <span style={{
        fontSize: 12, fontWeight: 400, fontFamily: '"DM Sans", system-ui, sans-serif',
        letterSpacing: '0.04em',
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
        <NavTab active={activeTab === 'map'}   onClick={() => goTab('map')}   label={tr.mapTab} />
        <NavTab active={activeTab === 'index'} onClick={() => goTab('index')} label={tr.indexTab} />
        <NavTab active={activeTab === 'about'} onClick={() => goTab('about')} label={tr.aboutTab} />

        {/* Sign out — right edge, only when logged in */}
        {user && (
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              paddingLeft: 10, paddingRight: 14,
              background: 'none', border: 'none', borderTop: '2px solid transparent',
              cursor: 'pointer',
              fontSize: 12, fontWeight: 400,
              fontFamily: '"DM Sans", system-ui, sans-serif',
              letterSpacing: '0.04em', color: '#888',
            }}
          >
            {tr.signOut}
          </button>
        )}
      </nav>
    </>
  );
}
