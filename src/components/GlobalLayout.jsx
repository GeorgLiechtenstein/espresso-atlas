import { Outlet, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t } from '../lib/i18n';

export default function GlobalLayout() {
  const navigate            = useNavigate();
  const location            = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user }            = useAuth();
  const { lang }            = useLang();
  const tr                  = t(lang);

  // Active tab: read from URL on /, infer Karte on /venue/*
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

  return (
    <>
      <Outlet />

      {/* FAB — visible on all layout pages when logged in */}
      {user && (
        <button
          onClick={() => navigate('/review')}
          aria-label={tr.addReview}
          style={{
            position: 'fixed',
            zIndex: 450,
            bottom: 'calc(72px + env(safe-area-inset-bottom))',
            right: 16,
            background: '#1a1714',
          }}
          className="w-14 h-14 text-white rounded-full shadow-xl
            flex items-center justify-center text-3xl font-light
            hover:opacity-90 active:scale-95 transition-all focus:outline-none"
        >
          +
        </button>
      )}

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[500] bg-surface border-t border-border flex items-center"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <button
          onClick={() => goTab('map')}
          className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors min-h-[44px]
            ${activeTab === 'map' ? 'text-coffee' : 'text-gray-400'}`}
        >
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
            <line x1="9" y1="3" x2="9" y2="18" />
            <line x1="15" y1="6" x2="15" y2="21" />
          </svg>
          <span className="text-[10px] font-medium font-sans">{tr.mapTab}</span>
        </button>

        <button
          onClick={() => goTab('index')}
          className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors min-h-[44px]
            ${activeTab === 'index' ? 'text-coffee' : 'text-gray-400'}`}
        >
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6"  x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6"  x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <span className="text-[10px] font-medium font-sans">{tr.indexTab}</span>
        </button>

        <button
          onClick={() => goTab('about')}
          className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors min-h-[44px]
            ${activeTab === 'about' ? 'text-coffee' : 'text-gray-400'}`}
        >
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="8.01" />
            <line x1="12" y1="12" x2="12" y2="16" />
          </svg>
          <span className="text-[10px] font-medium font-sans">{tr.aboutTab}</span>
        </button>
      </nav>
    </>
  );
}
