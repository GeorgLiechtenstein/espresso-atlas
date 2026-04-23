import { useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import CupLogo from '../components/CupLogo';

const CONTENT = {
  de: {
    title: 'Datenschutz',
    sections: [
      {
        heading: 'Cookies und Tracking',
        body: 'Espresso Atlas verwendet keine Tracking-Cookies, kein Analytics und keine Werbung. Es werden ausschliesslich technisch notwendige Session-Cookies gesetzt, die für die Anmeldung über Supabase Auth erforderlich sind. Diese Cookies werden gelöscht, sobald du dich abmeldest oder die Sitzung abläuft.',
      },
      {
        heading: 'Standortdaten',
        body: 'Wenn du die GPS-Funktion im Bewertungsformular nutzt, wird dein Standort ausschliesslich im Browser verwendet, um die Adresse automatisch auszufüllen. Dein Standort wird nicht auf Servern gespeichert und nicht weitergegeben.',
      },
      {
        heading: 'Gespeicherte Daten',
        body: 'Espresso Atlas speichert ausschliesslich die Daten, die du bewusst eingibst: Café-Name, Adresse, Bewertung, Kommentar, Preis und optional ein Foto. Diese Daten werden in einer Supabase-Datenbank gespeichert und sind öffentlich einsehbar.',
      },
      {
        heading: 'Kontakt',
        body: 'Bei Fragen zum Datenschutz: kontakt.wl1t6@simplelogin.com',
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    sections: [
      {
        heading: 'Cookies and tracking',
        body: 'Espresso Atlas uses no tracking cookies, no analytics, and no advertising. Only technically necessary session cookies are set, required for sign-in via Supabase Auth. These cookies are deleted when you sign out or the session expires.',
      },
      {
        heading: 'Location data',
        body: 'When you use the GPS feature in the rating form, your location is used exclusively in the browser to auto-fill the address. Your location is not stored on any server and is not shared.',
      },
      {
        heading: 'Stored data',
        body: 'Espresso Atlas only stores data you deliberately enter: café name, address, rating, comment, price, and optionally a photo. This data is stored in a Supabase database and is publicly visible.',
      },
      {
        heading: 'Contact',
        body: 'For privacy questions: kontakt.wl1t6@simplelogin.com',
      },
    ],
  },
};

export default function PrivacyPage() {
  const navigate  = useNavigate();
  const { lang }  = useLang();
  const content   = CONTENT[lang] ?? CONTENT.de;

  return (
    <div className="min-h-screen" style={{ background: '#F7F3EC' }}>
      <header className="sticky top-0 z-10" style={{ background: '#F7F3EC', borderBottom: '1px solid rgba(26,23,20,0.10)' }}>
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center gap-3">
          <CupLogo />
          <button
            onClick={() => navigate(-1)}
            style={{ fontSize: 14, color: '#555555', background: 'none', border: 'none', cursor: 'pointer', fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            ← {lang === 'de' ? 'Zurück' : 'Back'}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-10 pb-24">
        <h1 style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 32, color: '#1a1714', marginBottom: 32, letterSpacing: -0.5 }}>
          {content.title}
        </h1>

        <div className="space-y-8">
          {content.sections.map((s) => (
            <section key={s.heading}>
              <h2 style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 20, color: '#1a1714', marginBottom: 8 }}>
                {s.heading}
              </h2>
              <p style={{ fontSize: 15, color: '#555555', fontFamily: '"DM Sans", system-ui, sans-serif', lineHeight: 1.65 }}>
                {s.body}
              </p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
